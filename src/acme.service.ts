import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as acme from 'acme-client';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Domain } from './schema/domain.schema';
import { writeFile } from 'fs/promises';
import { User } from './schema/user.schema';
import forge from 'node-forge';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class AcmeService implements OnModuleInit {
  private client: acme.Client;
  private logger = new Logger(AcmeService.name);

  constructor(
    @InjectModel(Domain.name) private readonly domainModel: Model<Domain>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    console.log('ACME client initialized.');
    // this.logger.log('ACME client initialized.***');
  }
  onModuleInit() {
    this.initializeAcmeClient();
    // this.createUser();
    // console.log(path.resolve(__dirname, '../', '/src/script/script.sh'));
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
    const res = await this.userModel.findOne(
      {},
      {},
      {
        sort: {
          createdAt: -1,
        },
      },
    );
    return res;
  }

  public async addDomain(name: string, accountUrl: string) {
    console.log(name);
    const domain = await this.domainModel.create({
      name: name,
      userId: '66143ed12bdde3d8cf62d0aa',
      certificateStatus: 'pending',
      accountUrl: accountUrl,
    });
    if (!domain) throw new Error('Domain not created');
    console.log(domain);
    // await this.initiateDomainVerification(domain.name);
    return {
      status: 'success',
      message: `Now verify domain ${domain.name} to get certificate.`,
    };
  }

  public async getChallengeResponse(token: string): Promise<string> {
    console.log(token);
    console.log({ http01Token: token });
    const domain = await this.domainModel
      .findOne({ http01Token: token })
      .exec();
    console.log(domain);
    if (!domain) {
      throw new Error('Domain not found or challenge response does not exist.');
    }
    return domain.http01KeyAuthorization;
  }

  async generateCsrAndKey(domainName) {
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

  public async certificateDeploy(id: string): Promise<any> {
    const domain = await this.domainModel.findOne({ _id: id });
    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
    await this.convertStringToTextFile(
      domain.privateKey,
      path.join('./src/sslCertificates', `${domain.name}.key`),
    );
    await this.convertStringToTextFile(
      domain.http01KeyAuthorization,
      path.join('./src/tokens', `${domain.http01Token}`),
    );
    await this.convertStringToTextFile(
      domain.certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    try {
      const result = await this.executeScript(
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
      const result = await this.executeScript(
        domain.name,
        'src/script/nginx.sh',
        domain.accountUrl,
      );
      console.log('Script executed successfully:', result);
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
  }

  public async initiateDomainVerification(id: string): Promise<string> {
    const domain = await this.domainModel.findOne({ _id: id });
    if (!domain) throw new NotFoundException(`Domain ${id} not found`);
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
      const challenge = auth.challenges.find((c) => c.type === 'http-01');
      if (!challenge) continue;
      const keyAuthorization =
        await this.client.getChallengeKeyAuthorization(challenge);
      await this.domainModel.findByIdAndUpdate(domain.id, {
        http01Token: challenge.token,
        http01KeyAuthorization: keyAuthorization,
      });
      console.log(1);
      await this.convertStringToTextFile(
        keyAuthorization,
        path.join('./src/tokens', `${challenge.token}`),
      );
      try {
        const result = await this.executeScript(
          challenge.token,
          'src/script/token.sh',
          domain.accountUrl,
        );
        console.log('Script executed successfully:', result);
      } catch (error) {
        console.error('Failed to execute script:', error);
      }
      await this.client.verifyChallenge(auth, challenge);
      await this.client.completeChallenge(challenge);
      await this.client.waitForValidStatus(challenge);
    }
    const finalizeOrder = await this.client.finalizeOrder(order, csr);
    const certificate = await this.client.getCertificate(order);
    await this.convertStringToTextFile(
      certificate,
      path.join('./src/sslCertificates', `${domain.name}.crt`),
    );
    const cert = forge.pki.certificateFromPem(certificate);
    const expiryDate = cert.validity.notAfter;
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: true,
      certificateStatus: 'active',
      expiresAt: expiryDate,
      // expiresAt: finalizeOrder.expires,
      certificate: certificate,
      privateKey: privateKey,
      csr: csr,
    });
    return certificate;
  }

  private async executeScript(
    domainName: string,
    path: string,
    accountUrl: string,
  ): Promise<any> {
    console.log(path, 'path');
    console.log(domainName, 'domainName');
    const x = await new Promise((resolve, reject) => {
      exec(`${path} ${domainName} ${accountUrl}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
          return;
        } else if (stderr) {
          console.error(`stderr: ${stderr}`);
          reject(stderr);
          // return;
        }
        console.log(`stdout: ${stdout}`);
        resolve(stdout);
      });
    });
    console.log(x, 'x');
    return x;
  }

  public async verifyDomain(domainId: string): Promise<boolean> {
    const domain = await this.domainModel.findById(domainId);
    if (!domain) throw new Error(`Domain with ID ${domainId} not found.`);
    const isVerified = domain.verified && domain.certificateStatus === 'active';
    return isVerified;
  }

  async findAll() {
    return this.domainModel.find();
  }

  public async checkCertificateStatus(domainName: string): Promise<string> {
    const domain = await this.domainModel.findOne({ name: domainName }).exec();
    if (!domain) return 'unknown';
    return domain.certificateStatus;
  }

  public async certificate(domainName: string): Promise<string> {
    const domain = await this.domainModel.findOne({ name: domainName }).exec();
    if (!domain) return 'unknown';
    return domain.certificate;
  }

  async checkCertificateExpiry(domainName: string): Promise<Date> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domainName} not found`);
    return domain.expiresAt;
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

  async revokeCertificate(domainName: string): Promise<void> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domainName} not found`);
    await this.client.revokeCertificate(domain.certificate);
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: false,
      certificateStatus: 'revoked',
    });
  }

  // Scheduled task to check for and renew certificates nearing expiration

  // private async findDomainsNeedingRenewal(): Promise<Domain[]> {
  //   const today = new Date();
  //   const expirationThreshold = new Date(today.setDate(today.getDate() + 30)); // Looking 30 days ahead
  //
  //   return this.domainModel.find({
  //     expiresAt: { $lte: expirationThreshold },
  //     verified: true, // Assuming you only want to renew verified domains
  //   });
  // }

  public async renewCertificates(domainName: string) {
    // const domainsNeedingRenewal = await this.findDomainsNeedingRenewal();
    // for (const domain of domainsNeedingRenewal) {
    try {
      await this.initiateDomainVerification(domainName);
      // Update the domain model with the new certificate status
      console.log(`Renewed certificate for ${domainName}`);
    } catch (error) {
      console.error(`Failed to renew certificate for ${domainName}: ${error}`);
      // Handle errors appropriately, possibly alerting an admin
    }
    // }
  }

  async remove(id: string) {
    const domain = await this.domainModel.findOneAndDelete({ _id: id });
    if (!domain) throw new NotFoundException(`Domain with ID ${id} not found`);
    return domain;
  }
}
