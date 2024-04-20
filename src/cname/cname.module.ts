import { Module } from '@nestjs/common';
import { CnameService } from './cname.service';
import { CnameController } from './cname.controller';

@Module({
  imports: [],
  controllers: [CnameController],
  providers: [CnameService],
  exports: [CnameService],
})
export class CnameModule {}
