import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from './schema/domain.schema';
import { User, UserSchema } from './schema/user.schema';
import { DomainController } from './domain.controller';
import { AcmeService } from './acme.service';
import { Certificates, CertificatesSchema } from './schema/certificates.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Domain.name, schema: DomainSchema },
      { name: User.name, schema: UserSchema },
      { name: Certificates.name, schema: CertificatesSchema },
    ]),
  ],
  controllers: [DomainController],
  providers: [AcmeService],
  exports: [AcmeService],
})
export class AcmeModule {}
