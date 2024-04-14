import { Controller, Get, Post, Body, Param, Req, Res } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import * as process from 'node:process';
import { Response } from 'express';

@Controller()
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Get('gift-cards')
  findAll() {
    return this.giftCardService.findAll();
  }

  @Post('gift-card/create')
  async create(@Body() createGiftCardDto: any, @Res() res: Response) {
    console.log('create');
    const url = await this.giftCardService.create(createGiftCardDto);
    console.log('url', url.redirect_url);
    res.status(301).redirect(url.redirect_url);
  }

  @Get('gift-card/number/:number')
  findOneByGiftCardNumber(@Param('number') number: string) {
    return this.giftCardService.findOneByGiftCardNumber(number);
  }

  @Get('status/:oderId')
  async statusCheck(@Param('orderId') orderId: string) {
    return this.giftCardService.statusCheck(orderId);
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
