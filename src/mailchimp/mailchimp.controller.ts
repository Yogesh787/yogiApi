import { Controller, Get } from '@nestjs/common';
import { MailchimpService } from './mailchimp.service';

@Controller('mailchimp')
export class MailchimpController {
  constructor(private readonly mailchimpService: MailchimpService) {}
}
