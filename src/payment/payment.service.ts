import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as CryptoJS from 'crypto-js';
import * as FormData from 'form-data';
import { Agent } from 'https';

@Injectable()
export class PaymentService {
  constructor(private httpService: HttpService) {}
  paymentUrl = 'https://api.edfapay.com/payment/initiate';
  // paymentUrl = process.env.EDFA_PAY_URL;
  async initiatePayment(orderAmount: number, orderNumber: string) {
    // const number = '1234567890';
    console.log('initiatePayment');
    const password = process.env.EDFA_PAY_PASSWORD;
    // const orderAmount = '1';
    const orderCurrency = 'SAR';
    const orderDescription = 'An order';
    const hashValue = this.generateHash(
      '9d6fadf5bd3bec15eb57c4b47f09ff52',
      orderAmount.toString(),
      orderCurrency,
      orderDescription,
      orderNumber,
    );
    const formData = new FormData();
    formData.append('action', 'SALE');
    formData.append('edfa_merchant_id', 'b8071c63-ee47-4e09-bb73-a0c0f78a2bb9');
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
    formData.append('payer_email', 'yougalkumar1@nbb.ai');
    formData.append('payer_phone', '966111234568');
    formData.append('payer_ip', '45.130.83.149');
    formData.append(
      'term_url_3ds',
      `http://192.168.10.210:8080/burger-craft/giftCards/${orderNumber}`,
      // `http://192.168.10.210:5197/payment/callback`,
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
    const result = CryptoJS.enc.Hex.stringify(hash);
    return result;
  }

  async statusCheck(orderId: string) {
    const formData = {
      merchant_id: 'b8071c63-ee47-4e09-bb73-a0c0f78a2bb9',
      order_id: orderId,
    };
    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });
    const response = await this.httpService
      .post('https://api.edfapay.com/payment/status', formData, {
        httpsAgent,
      })
      .toPromise()
      .catch((e) => {
        // console.error(e, e.code, e.cause, 'error in sendRequest');
        console.log('error');
      });
    if (response) {
      console.log('*********', response?.data);
      // return response?.data;
      return { status: response?.data?.responseBody.status };
    } else {
      console.log('error', response);
    }
  }
}

// https://pay.expresspay.sa/interaction/f4d6d216-f993-11ee-9b92-12f496fd756f
// https://pay.expresspay.sa/interaction/5a067d96-fa41-11ee-863f-12f496fd756f
// https://pay.expresspay.sa/interaction/2c529488-fa42-11ee-9c45-12f496fd756f
// b53f080e-fa4b-11ee-9eea-12f496fd756f
