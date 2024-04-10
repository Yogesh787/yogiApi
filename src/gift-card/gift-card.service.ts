import { Injectable } from '@nestjs/common';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCard } from './schema/gift-card.schema';
import * as schedule from 'node-schedule';
import { MailchimpService } from '../mailchimp/mailchimp.service';
import { createMailTemplateSchema } from './schema/mailTemplate';

@Injectable()
export class GiftCardService {
  constructor(
    @InjectModel(GiftCard.name) private giftCardModel: Model<GiftCard>,
    private readonly mailchimpService: MailchimpService,
  ) {
    // this.fun();
    // this.ifNotDelivered();
  }
  campaignId = '2edffce556';

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

  async create(createGiftCardDto: CreateGiftCardDto) {
    // console.log(createGiftCardDto);
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log(result);
    const create = await this.giftCardModel.create({
      giftCardNumber: result,
      isDelivered: false,
      ...createGiftCardDto,
    });
    if (!create) throw new Error('Gift Card not created');
    if (create.from.sendToMyself) {
      console.log(1);
      if (create.delivery.deliverNow) {
        console.log('send mail Now to', create.from.email);
        await this.sendMail(
          create.from.email,
          create.id,
          create.from.name,
          create.amount,
          result,
        );
      } else {
        console.log(3);
        await this.deliverLater(create, create.from.email, create.from.name);
      }
    } else if (!create.from.sendToMyself) {
      console.log(4);
      if (create.delivery.deliverNow) {
        console.log('send mail Now to', create.to.email);
        await this.sendMail(
          create.to.email,
          create.id,
          create.to.name,
          create.amount,
          result,
        );
      } else {
        console.log(6);
        await this.deliverLater(create, create.to.email, create.to.name);
      }
    }
  }

  async sendMail(
    email: string,
    id: string,
    recipientName: string,
    amount: number,
    code: string,
  ) {
    await this.mailchimpService.updateCampaignDetails(
      this.campaignId,
      'New Subject Line',
      email,
      createMailTemplateSchema(recipientName, amount, code),
    );
    console.log(email);
    await this.mailchimpService.sendTestEmail(this.campaignId, [email], 'html');
    await this.giftCardModel.findOneAndUpdate(
      { _id: id },
      { isDelivered: true },
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

  findAll() {
    return this.giftCardModel.find();
  }

  findOneByGiftCardNumber(number: string) {
    return this.giftCardModel.findOne({ giftCardNumber: number });
  }

  update(id: string, updateGiftCardDto: UpdateGiftCardDto) {
    return this.giftCardModel.findOneAndUpdate({ _id: id }, updateGiftCardDto, {
      new: true,
    });
  }

  remove(id: string) {
    return this.giftCardModel.findOneAndDelete({ _id: id });
  }
}
