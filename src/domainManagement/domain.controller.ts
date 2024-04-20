import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { AcmeService } from './acme.service';

@Controller('domains')
export class DomainController {
  constructor(private readonly acmeService: AcmeService) {}

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

  // @Get(':id/deploy')
  // async certificateDeploy(@Param('id') id: string) {
  //   console.log(id);
  //   return this.acmeService.certificateDeploy(id);
  // }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log(id);
    return this.acmeService.remove(id);
  }

  // @Get('createAccount')
  // async creatAccount() {
  //   await this.acmeService.createUser();
  // }
}
