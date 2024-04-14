import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response, Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // @Get('')
  // async initiatePayment2(@Res() res: Response) {
  //   const url = await this.paymentService.initiatePayment(3);
  //   console.log(url);
  //   res.redirect(url.redirect_url);
  // }

  // @Get('/:orderId/status')
  // async statusCheck(@Param('orderId') orderId: string, @Res() res: Response) {
  //   console.log('statusCheck', orderId);
  //   const x = await this.paymentService.statusCheck(orderId);
  //   if (x.status === 'settled') {
  //     res.status(200).send(x);
  //   }
  //   res.status(400).send(x);
  //   // console.log('x', x);
  //   // return x;
  // }

  // @Get('callback')
  // async paymentCallback(@Req() req: Request) {
  //   console.log('get');
  //   console.log('res', req);
  // }
}
