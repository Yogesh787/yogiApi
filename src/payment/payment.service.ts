import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as CryptoJS from 'crypto-js';
import FormData from 'form-data';
import { Agent } from 'https';

@Injectable()
export class PaymentService {
  constructor(private httpService: HttpService) {}
  paymentUrl = process.env.EDFA_PAY_URL + 'initiate';
  async initiatePayment(orderAmount: number, orderNumber: string) {
    console.log('initiatePayment');
    const orderCurrency = 'SAR';
    const orderDescription = 'An order';
    const hashValue = this.generateHash(
      process.env.EDFA_PAY_PASSWORD,
      orderAmount.toString(),
      orderCurrency,
      orderDescription,
      orderNumber,
    );
    const formData = new FormData();
    formData.append('action', 'SALE');
    formData.append('edfa_merchant_id', process.env.EDFA_PAY_API_KEY);
    formData.append('order_id', orderNumber);
    formData.append('order_amount', orderAmount.toString());
    formData.append('order_currency', orderCurrency);
    formData.append('order_description', orderDescription);
    formData.append('payer_first_name', 'Mohamed');
    formData.append('payer_last_name', 'Ayadi');
    formData.append('payer_address', '156 East 2nd Street');
    formData.append('req_token', 'N');
    formData.append('payer_country', 'NY');
    formData.append('payer_city', 'New York');
    formData.append('payer_zip', '10009');
    formData.append('payer_email', 'example@gmail.com');
    formData.append('payer_phone', '966111234568');
    formData.append('payer_ip', '45.130.83.149');
    formData.append(
      'term_url_3ds',
      process.env.EDFA_PAY_REDIRECT_URL + orderNumber,
    );
    formData.append('auth', 'N');
    formData.append('recurring_init', 'N');
    formData.append('hash', hashValue);

    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });

    const response = await this.httpService
      .post(this.paymentUrl, formData, {
        httpsAgent,
        headers: {
          ...formData.getHeaders(),
        },
      })
      .toPromise()
      .catch((e) => {
        console.error(e, e.code, e.cause, 'error in sendRequest');
      });
    if (response) {
      return response?.data;
    } else {
      console.log(response);
      throw new Error('error in payment initiation');
    }
  }

  generateHash(
    password: string,
    orderAmount: string,
    orderCurrency: string,
    orderDescription: string,
    orderNumber: string,
  ) {
    const to_md5 = `${orderNumber}${orderAmount}${orderCurrency}${orderDescription}${password}`;
    const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
    return CryptoJS.enc.Hex.stringify(hash);
  }

  async statusCheck(orderId: string) {
    const formData = {
      merchant_id: process.env.EDFA_PAY_API_KEY,
      order_id: orderId,
    };
    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });
    const response = await this.httpService
      .post(`${process.env.EDFA_PAY_URL}status`, formData, {
        httpsAgent,
      })
      .toPromise()
      .catch((e) => {
        console.log('error', e);
      });
    if (response) {
      console.log('*********', response?.data);
      return { status: response?.data?.responseBody.status };
    } else {
      console.log('error', response);
    }
  }
}
