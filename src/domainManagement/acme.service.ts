import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as acme from 'acme-client';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
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
import * as instant_dns from 'instant-dns';

@Injectable()
export class AcmeService implements OnModuleInit {
  private client: acme.Client;
  dns = instant_dns;

  constructor(
    @InjectModel(Domain.name) private readonly domainModel: Model<Domain>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Certificates.name)
    private readonly certificateModel: Model<Certificates>,
  ) {}

  onModuleInit() {
    this.findLatestUser().then((account) => {
      if (!account) {
        console.log('No ACME account found. Creating one...');
        this.createUser().catch((error) => {
          console.error('Failed to create ACME account:', error);
        });
        return;
      }
      console.log('Found ACME account:');
      this.initializeAcmeClient(account).catch((error) => {
        console.error('Failed to initialize ACME client:', error);
      });
    });
  }

  async initializeAcmeClient(account) {
    // const accountKey = await acme.forge.createPrivateKey();
    this.client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production, // Use staging for testing
      accountKey: account.accountKey,
    });
    const user = await this.client.updateAccount({
      ...account,
      termsOfServiceAgreed: true,
    });
    if (user) {
      console.log(user, 'user');
    }
  }

  async createUser() {
    const accountKey = await acme.forge.createPrivateKey();
    const accountKeyString = accountKey.toString();
    this.client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production, // Use staging for testing
      accountKey,
    });

    try {
      const create = await this.client.createAccount({
        termsOfServiceAgreed: true,
        contact: ['mailto:yougal@gmail.com'], // Replace with your email
      });
      const user = await this.userModel.create({
        ...create,
        accountKey: accountKeyString,
      });
    } catch (error) {
      console.error('Failed to register ACME account::', error);
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

  async checkCname(name: string) {
    const x = await this.dns.resolveCname(name);
    console.log(x, 'cname');
    console.log(name);
    if (!x) {
      return false;
    }
    return x.includes('omnimenu-base.nbb.ai.');
  }

  public async addDomain(name: string, accountUrl: string) {
    const domainExists = await this.domainModel.findOne({ name: name });
    if (domainExists) throw new Error('Domain already exists');
    const domain = await this.domainModel.create({
      name: name,
      certificateStatus: false,
      accountUrl: accountUrl,
      cnameVerified: false,
    });

    if (!domain) throw new Error('Domain not created');

    await this.checkCnameStatus(domain);

    const cert = await this.initiateDomainVerification(domain.name);
    if (cert) {
      await this.certificateDeploy(domain.name);
    }

    return {
      status: 'success',
      message: `Now verify domain ${domain.name} to get certificate.`,
    };
  }

  @Cron('*/1 * * * *')
  async ifCnameUnverified() {
    const domains = await this.domainModel.find({ cnameVerified: false });
    for (const domain of domains) {
      await this.checkCnameStatus(domain);
    }
  }

  @Cron('*/15 * * * *')
  async isCertificateValid() {
    const domains = await this.domainModel.find({ certificateStatus: false });
    for (const domain of domains) {
      if (domain.cnameVerified === false) {
        continue;
      }
      const x = await this.initiateDomainVerification(domain.name);
    }
  }

  public async initiateDomainVerification(
    domainName: string,
  ): Promise<boolean> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domain.name} not found`);
    const certificateData = await this.certificateModel.findOne({
      _id: domain.name,
      expiresAt: {
        $gte: new Date(new Date().setDate(new Date().getDate() + 30)),
      },
    });
    console.log(certificateData, 'certificateData');
    if (certificateData) {
      await this.ifCertificateAvailable(certificateData);
      return;
    }
    const { csr, privateKey } = await this.generateCsrAndKey(domain.name);
    await this.convertStringToTextFile(
      privateKey,
      path.join('./src/sslCertificates', `${domain.name}.key`),
    );
    const order = await this.client.createOrder({
      identifiers: [{ type: 'dns', value: domain.name }],
    });
    const authorizations = await this.client.getAuthorizations(order);
    for (const auth of authorizations) {
      console.log(auth, 'auth');
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
      await this.convertStringToTextFile(
        keyAuthorization,
        path.join('./src/tokens', `${challenge.token}`),
      );
      try {
        const result = await syncSslTokens(challenge.token);
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
    await this.client.finalizeOrder(order, csr);
    const certificate = await this.client.getCertificate(order);
    await this.convertStringToTextFile(
      certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    const cert = forge.pki.certificateFromPem(certificate);
    const expiryDate = cert.validity.notAfter;
    await this.certificateModel.findOneAndUpdate(
      { _id: domain.name },
      {
        expiresAt: expiryDate,
        certificate: certificate,
        privateKey: privateKey,
        csr: csr,
      },
    );
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: false,
      certificateStatus: true,
    });
    return true;
  }

  async ifCertificateAvailable(certificateData) {
    const domain = await this.domainModel.findOne({
      name: certificateData._id,
    });
    await this.convertStringToTextFile(
      certificateData.privateKey,
      path.join('./src/sslCertificates', `${domain.name}.key`),
    );
    await this.convertStringToTextFile(
      certificateData.http01KeyAuthorization,
      path.join('./src/tokens', `${certificateData.http01Token}`),
    );
    try {
      const result = await syncSslTokens(certificateData.http01Token);
      console.log('Script executed successfully:');
    } catch (error) {
      console.error('Failed to execute script:');
    }
    await this.convertStringToTextFile(
      certificateData.certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: false,
      certificateStatus: true,
    });
    return true;
  }

  @Cron('*/1 * * * *')
  async checkCertificateDeployStatus() {
    const domains = await this.domainModel.find({ verified: false });
    for (const domain of domains) {
      if (domain.certificateStatus === false) {
        continue;
      }
      await this.certificateDeploy(domain.name);
    }
  }

  public async certificateDeploy(name: string): Promise<boolean> {
    const domain = await this.domainModel.findOne({ name: name });
    if (!domain) throw new NotFoundException(`Domain ${name} not found`);
    if (!domain.certificateStatus) {
      throw new Error('Certificate not verified');
    }
    if (domain.verified) {
      console.log('Domain already verified');
      return true;
    }
    const certificate: Certificates = await this.certificateModel.findOne({
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
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
    const result = await deployNginxConfig(domain.name);
    if (!result) return false;
    console.log('Script executed successfully:', result);
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: true,
    });
    return true;
  }

  private async findDomainsNeedingRenewal(): Promise<Certificates[]> {
    const today = new Date();
    const expirationThreshold = new Date(today.setDate(today.getDate() + 30)); // Looking 30 days ahead

    return this.certificateModel.find({
      expiresAt: { $lte: expirationThreshold },
    });
  }

  // cron job run in every 15 days
  @Cron('0 0 */15 * *')
  public async renewCertificates() {
    const domainsNeedingRenewal = await this.findDomainsNeedingRenewal();
    for (const domain of domainsNeedingRenewal) {
      try {
        const x = await this.initiateDomainVerification(domain._id);
        if (x) {
          await this.certificateDeploy(domain._id);
        }
        console.log(`Renewed certificate for ${domain._id}`);
      } catch (error) {
        console.error(
          `Failed to renew certificate for ${domain._id}: ${error}`,
        );
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
      await writeFile(filename, content);
      console.log(`File ${filename} has been saved.`);
    } catch (error) {
      console.error('Error writing file:', error);
    }
  }

  async remove(id: string) {
    const domain = await this.domainModel.findOneAndDelete({ _id: id });
    if (!domain) throw new NotFoundException(`Domain with ID ${id} not found`);
    const certificate = await this.certificateModel.findOne({
      _id: domain.name,
    });
    await removeDomain(domain.name, certificate.http01Token);
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

  private async checkCnameStatus(
    domain: Document<unknown, {}, Domain> & Domain & { _id: Types.ObjectId },
  ) {
    const cnameCheck = await this.checkCname(domain.name);
    if (cnameCheck === false) {
      return;
    }
    await this.domainModel.findOneAndUpdate(
      { _id: domain.id },
      { cnameVerified: true },
    );
  }
}
