import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import * as FormData from 'form-data';
import { Agent } from 'https';

@Injectable()
export class PaymentService {
  constructor(private httpService: HttpService) {}
  // paymentUrl = 'https://api.edfapay.com/payment/initiate';
  paymentUrl = process.env.EDFA_PAY_URL;
  async initiatePayment() {
    const password = process.env.EDFA_PAY_PASSWORD;
    const orderAmount = '100';
    const orderCurrency = 'SAR';
    const orderDescription = 'An order';
    const orderNumber = 'ORD001';
    const hashValue = this.generateHash(
      password,
      orderAmount,
      orderCurrency,
      orderDescription,
      orderNumber,
    );
    const formData = new FormData();
    formData.append('action', 'SALE');
    formData.append('edfa_merchant_id', process.env.EDFA_PAY_API_KEY);
    formData.append('order_id', orderNumber);
    formData.append('order_amount', orderAmount);
    formData.append('order_currency', orderCurrency);
    formData.append('order_description', orderDescription);
    formData.append('payer_first_name', 'Yougal');
    formData.append('payer_last_name', 'Kumar');
    formData.append('payer_address', 'nbb');
    formData.append('payer_country', 'SA');
    formData.append('payer_city', 'Riyadh');
    formData.append('payer_zip', '12221');
    formData.append('payer_email', 'yougalkumar@nbb.ai');
    formData.append('payer_phone', '917988620067'); //966111234567
    formData.append('payer_ip', '202.176.3.47');
    formData.append('term_url_3ds', '192.168.10.210:5199/payment/callback');
    formData.append('hash', hashValue);

    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });

    const response = await lastValueFrom(
      this.httpService.post(this.paymentUrl, formData, {
        httpsAgent,
        headers: {
          ...formData.getHeaders(),
        },
      }),
    );

    return response.data;
  }

  generateHash(
    password: string,
    orderAmount: string,
    orderCurrency: string,
    orderDescription: string,
    orderNumber: string,
  ) {
    const to_md5 = `${orderNumber}${orderAmount}${orderCurrency}${orderDescription}${password}`;
    console.log(CryptoJS.MD5(to_md5.toUpperCase()).toString(), '1');
    console.log(
      CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString()),
      '2',
    );
    const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
    const result = CryptoJS.enc.Hex.stringify(hash);
    console.log(result, '3');
    return result;
  }
}
