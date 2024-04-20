import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as acme from 'acme-client';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Domain } from './schema/domain.schema';
import { writeFile } from 'fs/promises';
import { User } from './schema/user.schema';
import forge from 'node-forge';
import * as path from 'path';
import { Cron } from '@nestjs/schedule';
import {
  deployNginxConfig,
  executeScript,
  syncSslTokens,
} from './scriptsRunner';
import { removeDomain } from './removeDomain';
import { Certificates } from './schema/certificates.schema';
import dns from 'dns';
import { promisify } from 'util';
import { CnameService } from '../cname/cname.service';

@Injectable()
export class AcmeService implements OnModuleInit {
  private client: acme.Client;

  constructor(
    @InjectModel(Domain.name) private readonly domainModel: Model<Domain>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Certificates.name)
    private readonly certificateModel: Model<Certificates>,
    private readonly cnameService: CnameService,
  ) {}
  onModuleInit() {
    // this.initializeAcmeClient().catch((error) => {
    //   console.error('Failed to initialize ACME client:', error);
    // });
    // this.createUser();
    // dns.resolveCname('google.com', (err, addresses) => {
    //   if (err) {
    //     console.error('Error:**', err);
    //     return;
    //   }
    //   console.log('CNAME Record:', addresses);
    // });
    // this.resolveCname('google.com').then((addresses) => {
    //   console.log('CNAME Record:', addresses);
    // });
  }

  async resolveCname(domain: string): Promise<string[]> {
    const resolveCnameAsync = promisify(dns.resolveCname);
    try {
      const records = await resolveCnameAsync(domain);
      // const records = await dns.promises.resolveCname(domain);
      console.log(records, 'records');
      return records;
    } catch (error) {
      throw new Error(`Error resolving CNAME records for ${domain}: ${error}`);
    }
  }

  async initializeAcmeClient() {
    const accountKey = await acme.forge.createPrivateKey();
    console.log(1);
    this.client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production, // Use staging for testing
      accountKey,
    });
    console.log(2);
    const account = await this.findLatestUser();
    console.log(3);
    await this.client.updateAccount({
      ...account,
      termsOfServiceAgreed: true,
    });
    console.log(4);
  }

  async createUser() {
    const accountKey = await acme.forge.createPrivateKey();
    this.client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production, // Use staging for testing
      accountKey,
    });
    try {
      const create = await this.client.createAccount({
        termsOfServiceAgreed: true,
        contact: ['mailto:yougal@gmail.com'], // Replace with your email
      });
      const user = await this.userModel.create({ ...create });
      console.log(user, 'user');
      console.log(create, 'ACME account registered.');
    } catch (error) {
      console.error('Failed to register ACME account:', error);
    }
  }

  async findLatestUser() {
    return this.userModel.findOne(
      {},
      {},
      {
        sort: {
          createdAt: -1,
        },
      },
    );
  }

  public async addDomain(name: string, accountUrl: string) {
    console.log(name);
    const domainExists = await this.domainModel.findOne({ name: name });
    if (domainExists) throw new Error('Domain already exists');
    const domain = await this.domainModel.create({
      name: name,
      userId: '66143ed12bdde3d8cf62d0aa',
      certificateStatus: false,
      accountUrl: accountUrl,
      cnameVerified: false,
    });
    if (!domain) throw new Error('Domain not created');
    console.log(domain);
    const cnameChecker = await this.cnameService.cnameChecker(name);
    if (cnameChecker.status === false) {
      return false;
    }
    await this.domainModel.findOneAndUpdate(
      { _id: domain.id },
      { cnameVerified: true },
    );
    const cert = await this.initiateDomainVerification(domain.name);
    if (cert) {
      await this.certificateDeploy(domain.id);
    }
    return {
      status: 'success',
      message: `Now verify domain ${domain.name} to get certificate.`,
    };
  }

  @Cron('*/2 * * * *')
  async ifCnameUnverified() {
    const domains = await this.domainModel.find({ cnameVerified: false });
    for (const domain of domains) {
      const cnameChecker = await this.cnameService.cnameChecker(domain.name);
      if (cnameChecker.status === false) {
        continue;
      }
      await this.domainModel.findOneAndUpdate(
        { _id: domain.id },
        { cnameVerified: true },
      );
      const cert = await this.initiateDomainVerification(domain.name);
      if (cert) {
        await this.certificateDeploy(domain.id);
      }
    }
  }

  @Cron('*/3 * * * *')
  async isCertificateValid() {
    const domains = await this.domainModel.find({ certificateStatus: false });
    for (const domain of domains) {
      if (domain.cnameVerified === false) {
        continue;
      }
      await this.initiateDomainVerification(domain.name);
    }
  }
  bbbbbbbbbbbbb;
  public async initiateDomainVerification(
    domainName: string,
  ): Promise<boolean> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domain.name} not found`);
    if (domain.certificateStatus) {
      const certificateData = await this.certificateModel.findOne({
        id: domain.name,
        expiresAt: {
          $lte: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
      });
      if (certificateData) {
        await this.domainModel.findByIdAndUpdate(domain.id, {
          certificateStatus: true,
          verified: false,
        });
        await this.certificateDeploy(domain.id);
        return true;
      }
    }
    const { csr, privateKey } = await this.generateCsrAndKey(domain.name);
    console.log(csr, 'csr');
    await this.convertStringToTextFile(
      privateKey,
      path.join('./src/sslCertificates', `${domain.name}.key`),
    );
    const order = await this.client.createOrder({
      identifiers: [{ type: 'dns', value: domain.name }],
    });
    console.log(1);
    const authorizations = await this.client.getAuthorizations(order);
    for (const auth of authorizations) {
      const challenge = auth.challenges.find((c) => c.type === 'http-01');
      if (!challenge) continue;
      const keyAuthorization =
        await this.client.getChallengeKeyAuthorization(challenge);

      const x = await this.certificateModel.findOne({ _id: domain.name });
      if (x) {
        // update certificate model
        await this.certificateModel.findOneAndUpdate(
          { _id: domain.name },
          {
            http01Token: challenge.token,
            http01KeyAuthorization: keyAuthorization,
          },
        );
      } else {
        // create certificate model
        await this.certificateModel.create({
          _id: domain.name,
          http01Token: challenge.token,
          http01KeyAuthorization: keyAuthorization,
        });
      }
      console.log(2);
      await this.convertStringToTextFile(
        keyAuthorization,
        path.join('./src/tokens', `${challenge.token}`),
      );
      try {
        const result = await syncSslTokens();
        console.log('Script executed successfully:');
      } catch (error) {
        console.error('Failed to execute script:');
      }
      console.log(3);
      await this.client.verifyChallenge(auth, challenge);
      console.log(4);
      await this.client.completeChallenge(challenge);
      console.log(5);
      await this.client.waitForValidStatus(challenge);
      console.log(6);
    }
    // finalize contain expires date also
    await this.client.finalizeOrder(order, csr);
    const certificate = await this.client.getCertificate(order);
    await this.convertStringToTextFile(
      certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    console.log(7);
    const cert = forge.pki.certificateFromPem(certificate);
    const expiryDate = cert.validity.notAfter;
    console.log(8);
    await this.certificateModel.findOneAndUpdate(
      { _id: domain.name },
      {
        expiresAt: expiryDate,
        // expiresAt: finalizeOrder.expires,
        certificate: certificate,
        privateKey: privateKey,
        csr: csr,
      },
    );
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: false,
      certificateStatus: true,
    });
    console.log(9);
    await this.certificateDeploy(domain.id);
    return true;
  }

  @Cron('*/5 * * * *')
  async checkCertificateDeployStatus() {
    const domains = await this.domainModel.find({ verified: false });
    if (domains) {
      for (const domain of domains) {
        if (domain.cnameVerified === false) {
          continue;
        }
        if (domain.certificateStatus === false) {
          continue;
        }
        await this.certificateDeploy(domain.id);
      }
    }
  }

  public async certificateDeploy(id: string): Promise<boolean> {
    const domain = await this.domainModel.findOne({ _id: id });
    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
    if (!domain.certificateStatus) {
      throw new Error('Certificate not verified');
    }
    if (domain.verified) {
      console.log('Domain already verified');
      return true;
    }
    const certificate = await this.certificateModel.findOne({
      _id: domain.name,
    });
    await this.convertStringToTextFile(
      certificate.privateKey,
      path.join('./src/sslCertificates', `${domain.name}.key`),
    );
    await this.convertStringToTextFile(
      certificate.http01KeyAuthorization,
      path.join('./src/tokens', `${certificate.http01Token}`),
    );
    await this.convertStringToTextFile(
      certificate.certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    try {
      const result = await executeScript(
        domain.name,
        'src/script/script.sh',
        domain.accountUrl,
      );
      console.log('Script executed successfully:', result);
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
    console.log('*******************************');
    try {
      const result = await deployNginxConfig(domain.name);
      console.log('Script executed successfully:', result);
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: true,
    });
    return true;
  }

  // async revokeCertificate(domainName: string): Promise<void> {
  //   const domain = await this.domainModel.findOne({ name: domainName });
  //   if (!domain) throw new NotFoundException(`Domain ${domainName} not found`);
  //   const certificate = await this.certificateModel.findOne({
  //     id: domain.name,
  //   });
  //   await this.client.revokeCertificate(certificate.certificate);
  //   await this.domainModel.findByIdAndUpdate(domain.id, {
  //     verified: false,
  //     certificateStatus: false,
  //   });
  // }

  private async findDomainsNeedingRenewal(): Promise<Domain[]> {
    const today = new Date();
    const expirationThreshold = new Date(today.setDate(today.getDate() + 30)); // Looking 30 days ahead

    return this.certificateModel.find({
      expiresAt: { $lte: expirationThreshold },
      verified: true, // Assuming you only want to renew verified domains
    });
  }

  // todo
  // domain.id not working
  @Cron('* * * 1 * *')
  public async renewCertificates() {
    console.log('************run**************');
    const domainsNeedingRenewal = await this.findDomainsNeedingRenewal();
    for (const domain of domainsNeedingRenewal) {
      try {
        await this.initiateDomainVerification(domain.name);
        // @ts-ignore
        await this.certificateDeploy(domain.id);
        // Update the domain model with the new certificate status
        console.log(`Renewed certificate for ${domain.name}`);
      } catch (error) {
        console.error(
          `Failed to renew certificate for ${domain.name}: ${error}`,
        );
        // Handle errors appropriately, possibly alerting an admin
      }
    }
  }

  async findAll() {
    return this.domainModel.find();
  }

  async convertStringToTextFile(
    content: string,
    filename: string,
  ): Promise<void> {
    try {
      // Writes the content to a file. The file is saved in the root directory of the project.
      await writeFile(filename, content);
      console.log(`File ${filename} has been saved.`);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  }

  async remove(id: string) {
    const domain = await this.domainModel.findOneAndDelete({ _id: id });
    if (!domain) throw new NotFoundException(`Domain with ID ${id} not found`);
    // await this.revokeCertificate(domain.name);
    await removeDomain(domain.name);
    await this.certificateModel.findOneAndDelete({
      id: domain.name,
      expiresAt: {
        $lte: new Date(new Date().setDate(new Date().getDate() + 30)),
      },
    });
    return domain;
  }

  async generateCsrAndKey(domainName: string) {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([
      {
        name: 'commonName',
        value: domainName,
      },
    ]);
    csr.sign(keys.privateKey, forge.md.sha256.create());
    const csrPem = forge.pki.certificationRequestToPem(csr);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

    return { csr: csrPem, privateKey: privateKeyPem };
  }
}
