import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

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
      const x = this.httpService
        .patch(settingsUrl, settingsPayload, {
          auth: {
            username: process.env.MAILCHIMP_USER_NAME,
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .toPromise();
      if (!x) throw new Error('Failed to update campaign settings');

      // Update content
      const y = this.httpService
        .put(contentUrl, contentPayload, {
          auth: {
            username: process.env.MAILCHIMP_USER_NAME,
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .toPromise();
      if (!y) throw new Error('Failed to update campaign content');

      console.log('Campaign details updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update campaign details:');
      throw new Error('Failed to update campaign details');
    }
  }

  async sendTestEmail(
    campaignId: string,
    testEmails: string[],
    sendType: string = 'html',
  ): Promise<boolean> {
    const url = `${process.env.MAILCHIMP_API_URL}/${campaignId}${process.env.MAILCHIMP_API_URL_PREFIX_TEST}`;

    const data = {
      test_emails: testEmails,
      send_type: sendType,
    };
    const x = this.httpService
      .post(url, data, {
        auth: {
          username: process.env.MAILCHIMP_USER_NAME,
          password: process.env.MAILCHIMP_API_KEY,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .toPromise();
    if (!x) throw new Error('Failed to send test email');
    return true;
  }
}
