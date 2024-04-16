import { Module } from '@nestjs/common';
import { GiftCardModule } from './gift-card/gift-card.module';
import { MailchimpModule } from './mailchimp/mailchimp.module';
import { DbModule } from './database/db.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payment/payment.module';
import { AppController } from './app.controller';
import { AcmeService } from './acme.service';
import { DomainController } from './domain.controller';
import { CnameModule } from './cname/cname.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from './schema/domain.schema';
import { User, UserSchema } from './schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Domain.name, schema: DomainSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    GiftCardModule,
    MailchimpModule,
    DbModule,
    PaymentModule,
    CnameModule,
  ],
  controllers: [AppController, DomainController],
  providers: [AcmeService],
  exports: [AcmeService],
})
export class AppModule {}
