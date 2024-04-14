import { Controller, Get, Post, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('')
  async initiatePayment2(@Res() res: Response) {
    const url = await this.paymentService.initiatePayment();
    console.log(url);
    res.redirect(url.redirect_url);
  }

  @Post('callback')
  async paymentCallback1(@Res() res: Response) {
    console.log('post');
    console.log('res', res);
  }

  @Get('callback')
  async paymentCallback(@Res() res: Response) {
    console.log('get');
    console.log('res', res);
  }

  @Get('status')
  async statusCheck() {
    return this.paymentService.statusCheck();
  }
}
