import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AcmeService } from './acme.service';

@Controller('domains')
export class DomainController {
  constructor(private readonly acmeService: AcmeService) {}

  // @Get('createAccount')
  // async creatAccount() {
  //   await this.acmeService.createUser();
  // }

  @Post('create')
  async addDomain(@Body() domainData: { name: string; accountUrl: string }) {
    console.log(domainData);
    return this.acmeService.addDomain(domainData.name, domainData.accountUrl);
  }

  @Get('')
  async findAll() {
    console.log('findAll');
    return this.acmeService.findAll();
  }

  // @Get('findLatestUser')
  // async findLatestUser() {
  //   return this.acmeService.findLatestUser();
  // }

  @Get(':domainName/certificate')
  async certificate(@Param('domainName') domainName: string) {
    console.log(domainName);
    return this.acmeService.certificate(domainName);
  }

  @Get(':domainName/certificate-status')
  async checkCertificateStatus(@Param('domainName') domainName: string) {
    console.log(domainName);
    return this.acmeService.checkCertificateStatus(domainName);
  }

  @Get(':id/deploy')
  async certificateDeploy(@Param('id') id: string) {
    console.log(id);
    return this.acmeService.certificateDeploy(id);
  }

  @Get(':id/verify')
  async verifyDomain(@Param('id') id: string) {
    await this.acmeService.initiateDomainVerification(id);
    return { message: `Verification initiated for domain ${id}` };
  }

  @Get(':domainName/renew-certificate')
  async renewCertificates(@Param('domainName') domainName: string) {
    await this.acmeService.renewCertificates(domainName);
    return { message: 'Renew Certificates is successfully done' };
  }

  @Get(':domainName/expiry-check')
  async checkCertificateExpiry(@Param('domainName') domainName: string) {
    await this.acmeService.checkCertificateExpiry(domainName);
    return { message: 'Renew Certificates is successfully done' };
  }

  @Get(':domainName/revoke-certificate')
  async revokeCertificate(@Param('domainName') domainName: string) {
    await this.acmeService.revokeCertificate(domainName);
    return { message: 'Certificate revoked successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log(id);
    return this.acmeService.remove(id);
  }
}
