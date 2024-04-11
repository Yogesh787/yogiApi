import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import * as process from 'node:process';

@Controller()
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Get('gift-card/create')
  findAll() {
    return this.giftCardService.findAll();
  }

  @Post('gift-card/create')
  create(@Body() createGiftCardDto: CreateGiftCardDto) {
    console.log('create');
    return this.giftCardService.create(createGiftCardDto);
  }

  @Get('gift-card/number/:number')
  findOneByGiftCardNumber(@Param('number') number: string) {
    return this.giftCardService.findOneByGiftCardNumber(number);
  }

  @Post('gift-card/payment')
  payment(
    @Body() data: { giftCardNumber: string; amount: number },
    @Req() req: any,
  ) {
    if (req.headers.password !== process.env.PASSWORD)
      throw new Error('Invalid password');
    return this.giftCardService.makePayment(data.giftCardNumber, data.amount);
  }

  @Post('gift-card/refund')
  refund(
    @Body() data: { giftCardNumber: string; amount: number },
    @Req() req: any,
  ) {
    if (req.headers.password !== process.env.PASSWORD)
      throw new Error('Invalid password');
    return this.giftCardService.refund(data.giftCardNumber, data.amount);
  }
}
