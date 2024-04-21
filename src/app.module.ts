import { Module } from '@nestjs/common';
import { GiftCardModule } from './gift-card/gift-card.module';
import { MailchimpModule } from './mailchimp/mailchimp.module';
import { DbModule } from './database/db.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payment/payment.module';
import { AcmeModule } from './domainManagement/acme.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    GiftCardModule,
    MailchimpModule,
    DbModule,
    PaymentModule,
    AcmeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
