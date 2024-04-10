import { Module } from '@nestjs/common';
import { MailchimpService } from './mailchimp.service';
import { MailchimpController } from './mailchimp.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [MailchimpController],
  providers: [MailchimpService],
  exports: [MailchimpService],
})
export class MailchimpModule {}
