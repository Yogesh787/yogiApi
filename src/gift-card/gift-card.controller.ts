import { Controller, Get, Post, Body, Param, Req, Res } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import * as process from 'node:process';
import { Response } from 'express';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Post('create')
  async create(
    @Body() createGiftCardDto: CreateGiftCardDto,
    @Res() res: Response,
  ) {
    const url = await this.giftCardService.create(createGiftCardDto);
    res.status(301).redirect(url.redirect_url);
  }

  @Get('number/:number')
  async findOneByGiftCardNumber(
    @Param('number') number: string,
    @Res() res: Response,
  ) {
    const x = await this.giftCardService.findOneByGiftCardNumber(number);
    if (!x) {
      console.log('Gift card not found');
      return res.send({ status: 400 });
    }
    res.status(200).send(x);
  }

  @Get('status/:orderId')
  async statusCheck(@Param('orderId') orderId: string, @Res() res: Response) {
    const x = await this.giftCardService.statusCheck(orderId);
    res.status(200).send(x);
  }

  @Post('payment')
  payment(
    @Body() data: { giftCardNumber: string; amount: number },
    @Req() req: any,
  ) {
    if (req.headers.password !== process.env.PASSWORD)
      throw new Error('Invalid password');
    return this.giftCardService.makePayment(data.giftCardNumber, data.amount);
  }

  @Post('refund')
  refund(
    @Body() data: { giftCardNumber: string; amount: number },
    @Req() req: any,
  ) {
    if (req.headers.password !== process.env.PASSWORD)
      throw new Error('Invalid password');
    return this.giftCardService.refund(data.giftCardNumber, data.amount);
  }
}
