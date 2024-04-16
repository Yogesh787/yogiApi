import { Injectable } from '@nestjs/common';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCard, PaymentType } from './schema/gift-card.schema';
import * as schedule from 'node-schedule';
import { MailchimpService } from '../mailchimp/mailchimp.service';
import { createMailTemplateSchema } from './schema/mailTemplate';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class GiftCardService {
  constructor(
    @InjectModel(GiftCard.name) private giftCardModel: Model<GiftCard>,
    private readonly mailchimpService: MailchimpService,
    private readonly payment: PaymentService,
  ) {
    this.ifNotDelivered();
  }

  async ifNotDelivered() {
    const giftCards = await this.giftCardModel.find({ isDelivered: false });
    giftCards.forEach((giftCard) => {
      if (giftCard.from.sendToMyself) {
        if (giftCard.delivery.deliverNow) {
          console.log('send mail Now to', giftCard.from.email);
          this.sendMail(
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
            this.deliverLater(
              giftCard,
              giftCard.from.email,
              giftCard.from.name,
            );
          } else {
            console.log('send mail Now to', giftCard.from.email);
            this.sendMail(
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
          console.log('send mail Now to', giftCard.to.email);
          this.sendMail(
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
            this.deliverLater(giftCard, giftCard.to.email, giftCard.to.name);
          } else {
            console.log('send mail Now to', giftCard.to.email);
            this.sendMail(
              giftCard.to.email,
              giftCard.id,
              giftCard.to.name,
              giftCard.amount,
              giftCard.giftCardNumber,
            );
          }
        }
      }
    });
  }

  async create(createGiftCardDto: any) {
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
    const payment = await this.payment.initiatePayment(
      createGiftCardDto.amount,
      x,
    );
    return payment;
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
    const status = await this.payment.statusCheck(orderId);
    console.log(status, 'status');
    if (status.status === 'settled') {
      const giftCard = await this.giftCardModel.findOne({
        transactionId: orderId,
      });
      console.log(giftCard, 'giftCard');
      await this.createGiftCard(giftCard);
      console.log(giftCard, 'giftCard');
    }
    return status;
  }

  async createGiftCard(giftCard) {
    if (giftCard.from.sendToMyself) {
      console.log(1);
      if (giftCard.delivery.deliverNow) {
        console.log('send mail Now to', giftCard.from.email);
        await this.sendMail(
          giftCard.from.email,
          giftCard.id,
          giftCard.from.name,
          giftCard.amount,
          giftCard.giftCardNumber,
        );
      } else {
        console.log(3);
        await this.deliverLater(
          giftCard,
          giftCard.from.email,
          giftCard.from.name,
        );
      }
    } else if (!giftCard.from.sendToMyself) {
      console.log(4);
      if (giftCard.delivery.deliverNow) {
        console.log('send mail Now to', giftCard.to.email);
        await this.sendMail(
          giftCard.to.email,
          giftCard.id,
          giftCard.to.name,
          giftCard.amount,
          giftCard.giftCardNumber,
        );
      } else {
        console.log(6);
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
    await this.mailchimpService.updateCampaignDetails(
      process.env.CAMPAIGN_ID,
      'A Gift Card for you',
      email,
      createMailTemplateSchema(recipientName, amount, code),
    );
    console.log(email);
    await this.mailchimpService.sendTestEmail(
      process.env.CAMPAIGN_ID,
      [email],
      'html',
    );
    await this.giftCardModel.findOneAndUpdate(
      { _id: id },
      { isDelivered: true, status: true },
      { new: true },
    );
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
      async function () {
        console.log('send mail later to', email);
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

  findOneByGiftCardNumber(number: string) {
    return this.giftCardModel.findOne({ giftCardNumber: number });
  }

  async makePayment(giftCardNumber: string, amount: number) {
    const giftCard = await this.giftCardModel.findOne({
      giftCardNumber: giftCardNumber,
    });
    console.log(giftCard, 'giftCard');
    if (!giftCard) throw new Error('Gift Card not found');
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
    if (giftCard.balance < amount) throw new Error('Insufficient balance');
    if (!giftCard) throw new Error('Gift Card not found');
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

  // findAll() {
  //   return this.giftCardModel.find();
  // }
}
