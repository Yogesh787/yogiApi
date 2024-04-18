import { Module } from '@nestjs/common';
import { CnameService } from './cname.service';
import { CnameController } from './cname.controller';
import { AcmeModule } from '../domainManagement/acme.module';

@Module({
  imports: [AcmeModule],
  controllers: [CnameController],
  providers: [CnameService],
})
export class CnameModule {}
