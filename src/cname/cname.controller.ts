import { Controller, Get, Param } from '@nestjs/common';
import { CnameService } from './cname.service';

@Controller('cname')
export class CnameController {
  constructor(private readonly cnameService: CnameService) {}

  @Get('verify/:name')
  cnameChecker(@Param('name') name: string) {
    console.log(name);
    return this.cnameService.cnameChecker(name);
  }

  @Get(':name')
  cname(@Param('name') name: string) {
    console.log(name);
    return this.cnameService.cname(name);
  }
}
