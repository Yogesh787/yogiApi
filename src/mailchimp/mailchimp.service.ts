import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MailchimpService {
  constructor(private httpService: HttpService) {}

  async updateCampaignDetails(
    campaignId: string,
    subjectLine: string,
    replyTo: string,
    htmlContent: string,
  ) {
    // Update campaign settings
    const settingsUrl = `${process.env.MAILCHIMP_API_URL}/${campaignId}`;
    const settingsPayload = {
      settings: {
        subject_line: subjectLine,
        reply_to: replyTo,
      },
    };

    // Update campaign content
    const contentUrl = `${settingsUrl}/content`;
    const contentPayload = {
      html: htmlContent,
    };

    try {
      // Update settings
      await lastValueFrom(
        this.httpService.patch(settingsUrl, settingsPayload, {
          auth: {
            username: process.env.MAILCHIMP_USER_NAME,
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      // Update content
      await lastValueFrom(
        this.httpService.put(contentUrl, contentPayload, {
          auth: {
            username: process.env.MAILCHIMP_USER_NAME,
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      console.log('Campaign details updated successfully');
    } catch (error) {
      console.error('Failed to update campaign details:');
      throw new Error('Failed to update campaign details');
    }
  }

  async sendTestEmail(
    campaignId: string,
    testEmails: string[],
    sendType: string = 'html',
  ): Promise<void> {
    const url = `${process.env.MAILCHIMP_API_URL}/${campaignId}/actions/test`;

    const data = {
      test_emails: testEmails,
      send_type: sendType,
    };

    try {
      await lastValueFrom(
        this.httpService.post(url, data, {
          auth: {
            username: process.env.MAILCHIMP_USER_NAME,
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      console.log('Test email sent successfully');
    } catch (error) {
      console.error('Failed to send test email');
    }
  }
}
