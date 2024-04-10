import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MailchimpService {
  constructor(private httpService: HttpService) {
    // this.addSubscriber('yougalkumar@nbb.ai').then((r) => {
    //   console.log(r);
    // });
    // this.abc()
    //   .then((r) => {
    //     console.log(r);
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });
    const campaignId = '333090e220';
    const testEmails = ['yougalkumar@nbb.ai'];
    // Example of calling the method from a controller or service
    const subjectLine = 'New Subject Line';
    const replyTo = 'yougalkumar@nbb.ai';
    const htmlContent =
      '<p>This is the new HTML content for your campaign.</p>';

    // this.updateCampaignDetails(campaignId, subjectLine, replyTo, htmlContent);
    //
    // this.sendTestEmail(campaignId, testEmails).then((r) => {
    //   console.log('r', r);
    // });

    // this.getAllCampaigns();
  }

  async abc() {
    const fromName = 'Your Name or Company';
    const replyTo = 'yougalkumar@nbb.ai';
    const subject = 'Your Email Subject';
    const listId = process.env.MAILCHIMP_AUDIENCE_ID; // Ensure this is the ID of your Mailchimp audience/list
    const htmlContent =
      '<h1>Hello World</h1><p>This is my first Mailchimp campaign sent from NestJS!</p>';

    const campaignId = await this.createCampaign(
      fromName,
      replyTo,
      subject,
      '61a139d91ec1cbf4ce96873daa3ae483',
    );
    console.log('campaingId', campaignId);
    // await this.setCampaignContent(campaignId, htmlContent);
    // await this.sendCampaign(campaignId);
  }

  async updateCampaignDetails(
    campaignId: string,
    subjectLine: string,
    replyTo: string,
    htmlContent: string,
  ) {
    // Update campaign settings
    const settingsUrl = `https://us22.api.mailchimp.com/3.0/campaigns/${campaignId}`;
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
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
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
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
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
    const url = `https://us22.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/test`;

    const data = {
      test_emails: testEmails,
      send_type: sendType, // Can be "html" or "plaintext"
    };

    try {
      await lastValueFrom(
        this.httpService.post(url, data, {
          auth: {
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
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

  async getAllCampaigns(): Promise<any> {
    const url = `https://us22.api.mailchimp.com/3.0/campaigns`;

    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          auth: {
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      console.log(response);

      return response.data; // This will include all campaign data, including IDs
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  }

  async addSubscriber(email: string): Promise<any> {
    const data = {
      email_address: email,
      status: 'subscribed', // You might want to change this depending on your use case
    };

    const url = `https://us22.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_AUDIENCE_ID}/members/`;

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, data, {
          auth: {
            username: 'anystring',
            password: process.env.MAILCHIMP_API_KEY,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      throw new Error('Failed to add subscriber');
    }
  }

  async createCampaign(
    fromName: string,
    replyTo: string,
    subject: string,
    listId: string,
  ): Promise<string> {
    const campaignData = {
      type: 'regular',
      recipients: { list_id: listId },
      settings: {
        subject_line: subject,
        reply_to: replyTo,
        from_name: fromName,
      },
    };

    const url = `https://us22.api.mailchimp.com/3.0/campaigns`;

    const response = await lastValueFrom(
      this.httpService.post(url, campaignData, {
        auth: {
          username: 'yougal',
          password: '4aa193346a4fbd101ad77fa9789282ca-us22',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data.id; // Return the created campaign ID
  }

  async setCampaignContent(
    campaignId: string,
    htmlContent: string,
  ): Promise<void> {
    const url = `https://us22.api.mailchimp.com/3.0/campaigns/${campaignId}/content`;

    await lastValueFrom(
      this.httpService.put(
        url,
        { html: htmlContent },
        {
          auth: {
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
  }

  async sendCampaign(campaignId: string): Promise<void> {
    const url = `https://us22.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`;

    await lastValueFrom(
      this.httpService.post(
        url,
        {},
        {
          auth: {
            username: 'yougal',
            password: '4aa193346a4fbd101ad77fa9789282ca-us22',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
  }
}
