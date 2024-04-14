import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import * as FormData from 'form-data';
import { Agent } from 'https';

@Injectable()
export class PaymentService {
  constructor(private httpService: HttpService) {}
  paymentUrl = 'https://api.edfapay.com/payment/initiate';
  // paymentUrl = process.env.EDFA_PAY_URL;
  async initiatePayment() {
    const password = process.env.EDFA_PAY_PASSWORD;
    const orderAmount = '1';
    const orderCurrency = 'SAR';
    const orderDescription = 'An order';
    const orderNumber = 'ORD0011';
    const hashValue = this.generateHash(
      '9d6fadf5bd3bec15eb57c4b47f09ff52',
      orderAmount,
      orderCurrency,
      orderDescription,
      orderNumber,
    );
    const formData = new FormData();
    formData.append('action', 'SALE');
    formData.append('edfa_merchant_id', 'b8071c63-ee47-4e09-bb73-a0c0f78a2bb9');
    formData.append('order_id', orderNumber);
    formData.append('order_amount', orderAmount);
    formData.append('order_currency', orderCurrency);
    formData.append('order_description', orderDescription);
    formData.append('payer_first_name', 'Yougal');
    formData.append('payer_last_name', 'Kumar');
    formData.append('payer_address', 'nbb');
    formData.append('req_token', 'N');
    formData.append('payer_country', 'SA');
    formData.append('payer_city', 'Riyadh');
    formData.append('payer_zip', '12221');
    formData.append('payer_email', 'yougalkumar1@nbb.ai');
    formData.append('payer_phone', '966111234568');
    formData.append('payer_ip', '51.15.212.225');
    formData.append(
      'term_url_3ds',
      'http://192.168.10.210:5197/payment/callback',
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

  async statusCheck() {
    const to_md5 =
      'f4d6d216-f993-11ee-9b92-12f496fd756f' +
      '1' +
      '9d6fadf5bd3bec15eb57c4b47f09ff52';
    const hash = CryptoJS.SHA1(CryptoJS.MD5(to_md5.toUpperCase()).toString());
    const result = CryptoJS.enc.Hex.stringify(hash);
    console.log(result, 1);
    // const formData = new FormData();
    // formData.append('edfa_merchant_id', 'b8071c63-ee47-4e09-bb73-a0c0f78a2bb9');
    // formData.append('order_id', 'ORD0011');
    // formData.append('gway_Payment_id', 'f4d6d216-f993-11ee-9b92-12f496fd756f');
    // formData.append('hash', result);
    const formData = {
      merchant_id: 'b8071c63-ee47-4e09-bb73-a0c0f78a2bb9',
      order_id: 'ORD0011',
      gway_Payment_id: 'f4d6d216-f993-11ee-9b92-12f496fd756f',
      hash: result,
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
        console.error(e, e.code, e.cause, 'error in sendRequest');
      });
    if (response) {
      return response?.data;
    } else {
      console.log(response);
    }
  }
}

// https://pay.expresspay.sa/interaction/f4d6d216-f993-11ee-9b92-12f496fd756f
