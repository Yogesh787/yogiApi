import { Controller, Get, Post, Body, Param, Req, Res } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import * as process from 'node:process';
import { Response } from 'express';

// todo
// add gift-card in controller
@Controller()
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Post('gift-card/create')
  async create(@Body() createGiftCardDto: any, @Res() res: Response) {
    const url = await this.giftCardService.create(createGiftCardDto);
    res.status(301).redirect(url.redirect_url);
  }

  @Get('gift-card/number/:number')
  findOneByGiftCardNumber(@Param('number') number: string) {
    return this.giftCardService.findOneByGiftCardNumber(number);
  }

  @Get('status/:orderId')
  async statusCheck(@Param('orderId') orderId: string, @Res() res: Response) {
    const x = await this.giftCardService.statusCheck(orderId);
    if (x.status === 'settled') {
      res.status(200).send(x);
    }
    res.status(400).send(x);
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
