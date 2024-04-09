import { Injectable } from '@nestjs/common';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftCard } from './schema/gift-card.schema';

@Injectable()
export class GiftCardService {
  constructor(
    @InjectModel(GiftCard.name) private giftCardModel: Model<GiftCard>,
  ) {}
  create(createGiftCardDto: CreateGiftCardDto) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log(result);
    return this.giftCardModel.create({
      giftCardNumber: result,
      ...createGiftCardDto,
    });
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
