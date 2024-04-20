import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CnameService {
  constructor() {
    // this.cname('nbb.ai');
    // this.cnameChecker('custom-domain.nbb.ai');
  }

  async cname(name: string) {
    // const allRecords = await (
    //   await import('@layered/dns-records')
    // ).getAllDnsRecords(name);
    // const cnameList = allRecords.filter((x) => x.type === 'CNAME');
    const cnameList = await axios.get(`${process.env.CNAME_RECORD_URL}${name}`);
    // console.log(cnameList.data, 'cnameList');
    return cnameList;
    // return allRecords;
  }

  async cnameChecker(cname: string) {
    const cnameList = await this.cname('nbb.ai');
    let isAvailable = false;
    for (const name of cnameList.data) {
      // console.log(name);
      if (cname === name.domain) {
        isAvailable = true;
      }
    }
    if (!isAvailable) {
      console.log(
        'please register first or if you have registered then wait for some time',
      );
      return {
        status: false,
        message:
          'please register first or if you have registered then wait for some time',
      };
    }
    return {
      status: true,
      message: 'Please proceed with the next step',
    };
  }
}
