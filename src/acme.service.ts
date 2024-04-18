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
import { NodeSSH } from 'node-ssh';
import { Cron } from '@nestjs/schedule';
import { promises as fs } from 'fs';

@Injectable()
export class AcmeService implements OnModuleInit {
  private client: acme.Client;
  private logger = new Logger(AcmeService.name);
  private ssh = new NodeSSH();
  private privateKey: string;

  constructor(
    @InjectModel(Domain.name) private readonly domainModel: Model<Domain>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    console.log('ACME client initialized.');
    // this.logger.log('ACME client initialized.***');
  }
  onModuleInit() {
    // this.initializeAcmeClient();
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
    await this.initiateDomainVerification(domain.name);
    return {
      status: 'success',
      message: `Now verify domain ${domain.name} to get certificate.`,
    };
  }

  // public async getChallengeResponse(token: string): Promise<string> {
  //   console.log(token);
  //   console.log({ http01Token: token });
  //   const domain = await this.domainModel
  //     .findOne({ http01Token: token })
  //     .exec();
  //   console.log(domain);
  //   if (!domain) {
  //     throw new Error('Domain not found or challenge response does not exist.');
  //   }
  //   return domain.http01KeyAuthorization;
  // }

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
      // const result = await this.executeScript(
      //   domain.name,
      //   'src/script/nginx.sh',
      //   domain.accountUrl,
      // );
      const result = await this.deployNginxConfig(domain.name);
      console.log('Script executed successfully:', result);
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
  }
  async deployNginxConfig(domainName: string): Promise<void> {
    const server = process.env.SERVER;
    const [serverUser, serverIp] = server.split('@');
    const localNginxDir = './src/sslCertificates/';
    const localNginxDir1 = './src/configuration/';
    const remoteNginxDir = '/etc/nginx/sites-available/';
    const certNginxDir = '/etc/nginx/ssl/';
    fs.readFile('src/script/omnimenu-pwa.pem', 'utf8').then((data) => {
      this.privateKey = data;
      // console.log('data', data);
    });
    try {
      this.privateKey = await fs.readFile(
        'src/script/omnimenu-pwa.pem',
        'utf8',
      );
    } catch (error) {
      throw new Error('Failed to read file: ' + error.message);
    }

    try {
      await this.ssh.connect({
        host: serverIp,
        username: serverUser,
        // privateKey: `/home/yougalkumar/.ssh/id_rsa`,
        privateKey: this.privateKey,
      });

      console.log('login success');
      // Step 1: Sync SSL certificates
      await this.ssh.putDirectory(localNginxDir, certNginxDir);
      console.log('SSL Certificates updated successfully');

      // Step 2: Sync Nginx configuration
      await this.ssh.putDirectory(localNginxDir1, remoteNginxDir);
      await this.ssh.execCommand(
        `rm /etc/nginx/sites-enabled/${domainName}.conf && ln -s /etc/nginx/sites-available/${domainName}.conf /etc/nginx/sites-enabled/`,
      );
      console.log('Nginx configuration updated successfully');

      // Step 3: Check Nginx Configuration
      const nginxTest = await this.ssh.execCommand('nginx -t');
      if (nginxTest.code !== 0)
        throw new Error('Wrong Nginx Configuration: ' + nginxTest.stderr);

      console.log('Nginx Configuration is correct');

      // Step 4: Reload Nginx
      const reloadNginx = await this.ssh.execCommand('systemctl reload nginx');
      if (reloadNginx.code !== 0)
        throw new Error('Failed to reload Nginx: ' + reloadNginx.stderr);

      console.log('Nginx reloaded successfully');
      console.log('Deployment completed successfully');
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      this.ssh.dispose();
    }
  }

  public async initiateDomainVerification(domainName: string): Promise<string> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domain.name} not found`);
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
        // const result = await this.executeScript(
        //   challenge.token,
        //   'src/script/token.sh',
        //   domain.accountUrl,
        // );
        const result = await this.syncSslTokens();
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

  async syncSslTokens(): Promise<void> {
    const server = process.env.SERVER;
    const [serverUser, serverIp] = server.split('@');
    const localNginxDir = '/home/yougalkumar/WebstormProjects/ssl/src/tokens/';
    const remoteNginxDir = '/var/www/html/.well-known/acme-challenge';

    try {
      this.privateKey = await fs.readFile(
        'src/script/omnimenu-pwa.pem',
        'utf8',
      );
    } catch (error) {
      throw new Error('Failed to read file: ' + error.message);
    }

    try {
      await this.ssh.connect({
        host: serverIp,
        username: serverUser,
        privateKey: this.privateKey,
      });

      console.log('Connecting to server...');

      // Sync SSL tokens
      const result = await this.ssh.putDirectory(
        localNginxDir,
        remoteNginxDir,
        {
          recursive: true,
          concurrency: 10,
          validate: function (itemPath) {
            const baseName = path.basename(itemPath);
            return baseName.substr(0, 1) !== '.'; // do not allow hidden files
          },
          tick: function (localPath, remotePath, error) {
            if (error) {
              console.error(
                'Failed to transfer:',
                localPath,
                'to',
                remotePath,
                'due to',
                error,
              );
            } else {
              console.log(
                `Successfully transferred ${localPath} to ${remotePath}`,
              );
            }
          },
        },
      );

      if (!result) {
        throw new Error('Failed to update Nginx configuration');
      }

      console.log('Nginx configuration updated successfully');
      console.log('Upload completed successfully');
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      this.ssh.dispose();
    }
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

  async revokeCertificate(domainName: string): Promise<void> {
    const domain = await this.domainModel.findOne({ name: domainName });
    if (!domain) throw new NotFoundException(`Domain ${domainName} not found`);
    await this.client.revokeCertificate(domain.certificate);
    await this.domainModel.findByIdAndUpdate(domain.id, {
      verified: false,
      certificateStatus: 'revoked',
    });
  }

  private async findDomainsNeedingRenewal(): Promise<Domain[]> {
    const today = new Date();
    const expirationThreshold = new Date(today.setDate(today.getDate() + 30)); // Looking 30 days ahead

    return this.domainModel.find({
      expiresAt: { $lte: expirationThreshold },
      verified: true, // Assuming you only want to renew verified domains
    });
  }

  // cron job to renew certificates
  @Cron('* * * 1 * *')
  public async renewCertificates() {
    console.log('************run**************');
    const domainsNeedingRenewal = await this.findDomainsNeedingRenewal();
    for (const domain of domainsNeedingRenewal) {
      try {
        await this.initiateDomainVerification(domain.name);
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

  async remove(id: string) {
    const domain = await this.domainModel.findOneAndDelete({ _id: id });
    if (!domain) throw new NotFoundException(`Domain with ID ${id} not found`);
    await this.revokeCertificate(domain.name);
    return domain;
  }
}
