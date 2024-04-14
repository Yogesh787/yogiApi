import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // @Get('')
  // async initiatePayment2(@Res() res: Response) {
  //   const url = await this.paymentService.initiatePayment(3);
  //   console.log(url);
  //   res.redirect(url.redirect_url);
  // }

  @Get('callback')
  async paymentCallback(@Res() res: Response) {
    console.log('get');
    console.log('res', res);
  }

  @Get(':oderId')
  async statusCheck(@Param('orderId') orderId: string) {
    return this.paymentService.statusCheck(orderId);
  }
}
