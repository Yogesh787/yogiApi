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
    const settingsUrl = `${process.env.API_URL}/${campaignId}`;
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
            username: process.env.USER_NAME,
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
            username: process.env.USER_NAME,
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
    const url = `${process.env.API_URL}/${campaignId}/actions/test`;

    const data = {
      test_emails: testEmails,
      send_type: sendType, // Can be "html" or "plaintext"
    };

    try {
      await lastValueFrom(
        this.httpService.post(url, data, {
          auth: {
            username: process.env.USER_NAME,
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
      throw new Error('Failed to send test email');
    }
  }

  // async getAllCampaigns(): Promise<any> {
  //   const url = process.env.API_URL;
  //
  //   try {
  //     const response = await lastValueFrom(
  //       this.httpService.get(url, {
  //         auth: {
  //           username: process.env.USER_NAME,
  //           password: process.env.MAILCHIMP_API_KEY,
  //         },
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       }),
  //     );
  //
  //     console.log(response);
  //
  //     return response.data; // This will include all campaign data, including IDs
  //   } catch (error) {
  //     console.error('Failed to fetch campaigns:', error);
  //     throw new Error('Failed to fetch campaigns');
  //   }
  // }

  // async addSubscriber(email: string): Promise<any> {
  //   const data = {
  //     email_address: email,
  //     status: 'subscribed', // You might want to change this depending on your use case
  //   };
  //
  //   const url = `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_AUDIENCE_ID}/members/`;
  //
  //   try {
  //     const response = await lastValueFrom(
  //       this.httpService.post(url, data, {
  //         auth: {
  //           username: process.env.USER_NAME,
  //           password: process.env.MAILCHIMP_API_KEY,
  //         },
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       }),
  //     );
  //
  //     return response.data;
  //   } catch (error) {
  //     throw new Error('Failed to add subscriber');
  //   }
  // }

  // async createCampaign(
  //   fromName: string,
  //   replyTo: string,
  //   subject: string,
  //   listId: string,
  // ): Promise<string> {
  //   const campaignData = {
  //     type: 'regular',
  //     recipients: { list_id: listId },
  //     settings: {
  //       subject_line: subject,
  //       reply_to: replyTo,
  //       from_name: fromName,
  //     },
  //   };
  //
  //   const url = process.env.API_URL;
  //
  //   const response = await lastValueFrom(
  //     this.httpService.post(url, campaignData, {
  //       auth: {
  //         username: process.env.USER_NAME,
  //         password: process.env.MAILCHIMP_API_KEY,
  //       },
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     }),
  //   );
  //
  //   return response.data.id; // Return the created campaign ID
  // }

  // async setCampaignContent(
  //   campaignId: string,
  //   htmlContent: string,
  // ): Promise<void> {
  //   const url = `${process.env.API_URL}/${campaignId}/content`;
  //
  //   await lastValueFrom(
  //     this.httpService.put(
  //       url,
  //       { html: htmlContent },
  //       {
  //         auth: {
  //           username: process.env.USER_NAME,
  //           password: process.env.MAILCHIMP_API_KEY,
  //         },
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       },
  //     ),
  //   );
  // }

  // async sendCampaign(campaignId: string): Promise<void> {
  //   const url = `${process.env.API_URL}/${campaignId}/actions/send`;
  //
  //   await lastValueFrom(
  //     this.httpService.post(
  //       url,
  //       {},
  //       {
  //         auth: {
  //           username: process.env.USER_NAME,
  //           password: process.env.MAILCHIMP_API_KEY,
  //         },
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //       },
  //     ),
  //   );
  // }
}
