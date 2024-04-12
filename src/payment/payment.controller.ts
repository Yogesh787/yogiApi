import { Controller, Get, Res } from '@nestjs/common';
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

  @Get('callback')
  async paymentCallback(@Res() res: Response) {
    console.log('res', res);
  }
}
