import { forwardRef, Module } from '@nestjs/common';
import { CnameService } from './cname.service';
import { CnameController } from './cname.controller';
import { AppModule } from '../app.module';

@Module({
  imports: [forwardRef(() => AppModule)],
  controllers: [CnameController],
  providers: [CnameService],
})
export class CnameModule {}
