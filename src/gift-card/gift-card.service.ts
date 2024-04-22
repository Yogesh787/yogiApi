import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCard, PaymentType } from './schema/gift-card.schema';
import * as schedule from 'node-schedule';
import { MailchimpService } from '../mailchimp/mailchimp.service';
import { createMailTemplateSchema } from './schema/mailTemplate';
import { PaymentService } from '../payment/payment.service';
import { Cron } from '@nestjs/schedule';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

@Injectable()
export class GiftCardService {
  constructor(
    @InjectModel(GiftCard.name) private giftCardModel: Model<GiftCard>,
    private readonly mailchimpService: MailchimpService,
    private readonly payment: PaymentService,
  ) {}

  @Cron('*/1 * * * *')
  async ifNotDelivered() {
    const giftCards = await this.giftCardModel.find({ isDelivered: false });
    for (const giftCard of giftCards) {
      if (!giftCard.status) continue;
      if (giftCard.from.sendToMyself) {
        if (giftCard.delivery.deliverNow) {
          await this.sendMail(
            giftCard.from.email,
            giftCard.id,
            giftCard.from.name,
            giftCard.amount,
            giftCard.giftCardNumber,
          );
        } else {
          const dateTimeString = `${giftCard.delivery.deliveryDate}T${giftCard.delivery.deliveryTime}:00`;
          const dateTime = new Date(dateTimeString);
          const now = new Date();
          if (dateTime > now) {
            await this.deliverLater(
              giftCard,
              giftCard.from.email,
              giftCard.from.name,
            );
          } else {
            await this.sendMail(
              giftCard.from.email,
              giftCard.id,
              giftCard.from.name,
              giftCard.amount,
              giftCard.giftCardNumber,
            );
          }
        }
      } else if (!giftCard.from.sendToMyself) {
        if (giftCard.delivery.deliverNow) {
          await this.sendMail(
            giftCard.to.email,
            giftCard.id,
            giftCard.to.name,
            giftCard.amount,
            giftCard.giftCardNumber,
          );
        } else {
          const dateTimeString = `${giftCard.delivery.deliveryDate}T${giftCard.delivery.deliveryTime}:00`;
          const dateTime = new Date(dateTimeString);
          const now = new Date();
          if (dateTime > now) {
            await this.deliverLater(
              giftCard,
              giftCard.to.email,
              giftCard.to.name,
            );
          } else {
            await this.sendMail(
              giftCard.to.email,
              giftCard.id,
              giftCard.to.name,
              giftCard.amount,
              giftCard.giftCardNumber,
            );
          }
        }
      }
    }
  }

  async create(createGiftCardDto: CreateGiftCardDto) {
    const result = await this.createRendomNumber(16);

    const x = await this.createRendomNumber(12);
    const create = await this.giftCardModel.create({
      giftCardNumber: result,
      isDelivered: false,
      balance: createGiftCardDto.amount,
      status: false,
      transactionId: x,
      ...createGiftCardDto,
    });
    if (!create) throw new Error('Gift Card not created');
    const xAmount = await this.calculateTotal(createGiftCardDto.amount);
    return await this.payment.initiatePayment(
      xAmount,
      x,
      createGiftCardDto.redirectUrl,
    );
  }

  async calculateTotal(customAmount) {
    if (customAmount <= 150) {
      return parseFloat(customAmount) + (customAmount * 5) / 100;
    } else {
      return parseFloat(customAmount) + 7.5;
    }
  }

  async createRendomNumber(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  async statusCheck(orderId: string) {
    const res = await this.payment.statusCheck(orderId);
    if (!res) throw new Error('Order not found');
    const giftCard = await this.giftCardModel.findOne({
      transactionId: orderId,
    });
    await this.giftCardModel.findOneAndUpdate(
      { _id: giftCard._id },
      {
        paymentId: res.responseBody.payment_id,
      },
    );
    if (res?.responseBody.status === 'settled') {
      await this.giftCardModel.findOneAndUpdate(
        { _id: giftCard._id },
        {
          status: true,
        },
      );
      await this.createGiftCard(giftCard);
    }
    return { status: res?.responseBody.status };
  }

  async createGiftCard(giftCard) {
    if (giftCard.isDelivered) throw new Error('Gift Card already delivered');
    if (giftCard.from.sendToMyself) {
      if (giftCard.delivery.deliverNow) {
        await this.sendMail(
          giftCard.from.email,
          giftCard.id,
          giftCard.from.name,
          giftCard.amount,
          giftCard.giftCardNumber,
        );
      } else {
        await this.deliverLater(
          giftCard,
          giftCard.from.email,
          giftCard.from.name,
        );
      }
    } else if (!giftCard.from.sendToMyself) {
      if (giftCard.delivery.deliverNow) {
        await this.sendMail(
          giftCard.to.email,
          giftCard.id,
          giftCard.to.name,
          giftCard.amount,
          giftCard.giftCardNumber,
        );
      } else {
        await this.deliverLater(giftCard, giftCard.to.email, giftCard.to.name);
      }
    }
    return giftCard;
  }

  async sendMail(
    email: string,
    id: string,
    recipientName: string,
    amount: number,
    code: string,
  ) {
    const x = await this.mailchimpService.updateCampaignDetails(
      process.env.CAMPAIGN_ID,
      'A Gift Card for you',
      email,
      createMailTemplateSchema(recipientName, amount, code),
    );
    if (!x) throw new Error('Failed to update campaign details');
    const y = await this.mailchimpService.sendTestEmail(
      process.env.CAMPAIGN_ID,
      [email],
      'html',
    );
    if (!y) throw new Error('Failed to send test email');
    console.log('Email sent successfully');
    if (y) {
      console.log('**************');
      await this.giftCardModel.findOneAndUpdate(
        { _id: id },
        { isDelivered: true },
        { new: true },
      );
    }
    console.log('Gift Card delivered successfully');
  }

  async deliverLater(create, email, name) {
    const [year, month, day] = create.delivery.deliveryDate.split('-');
    const [hour, minute] = create.delivery.deliveryTime.split(':');
    schedule.scheduleJob(
      {
        year: Number(year),
        month: Number(month) - 1,
        date: Number(day),
        hour: Number(hour),
        minute: Number(minute),
      },
      async () => {
        await this.sendMail(
          email,
          create.id,
          name,
          create.amount,
          create.giftCardNumber,
        );
      },
    );
  }

  async findOneByGiftCardNumber(number: string) {
    return this.giftCardModel.findOne({ giftCardNumber: number });
  }

  async makePayment(giftCardNumber: string, amount: number) {
    const giftCard = await this.giftCardModel.findOne({
      giftCardNumber: giftCardNumber,
    });
    if (!giftCard) throw new Error('Gift Card not found');
    if (!giftCard.status) throw new Error('Gift Card not activated');
    if (giftCard.balance < amount) throw new Error('Insufficient balance');
    if (amount <= 0) throw new Error('Invalid amount');
    return this.giftCardModel.findOneAndUpdate(
      { giftCardNumber: giftCardNumber },
      {
        $push: { payments: { amount, type: PaymentType.payment } },
        balance: giftCard.balance - amount,
      },
      { new: true },
    );
  }

  async refund(giftCardNumber: string, amount: number) {
    const giftCard = await this.giftCardModel.findOne({
      giftCardNumber: giftCardNumber,
    });
    if (!giftCard) throw new Error('Gift Card not found');
    if (!giftCard.status) throw new Error('Gift Card not activated');
    if (giftCard.balance < amount) throw new Error('Insufficient balance');
    if (amount <= 0) throw new Error('Invalid amount');
    return this.giftCardModel.findOneAndUpdate(
      { giftCardNumber: giftCardNumber },
      {
        $push: { payments: { amount, type: PaymentType.refund } },
        balance: giftCard.balance - amount,
      },
      { new: true },
    );
  }
}
