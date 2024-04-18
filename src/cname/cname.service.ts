import { Injectable } from '@nestjs/common';
import { AcmeService } from '../domainManagement/acme.service';

@Injectable()
export class CnameService {
  constructor(private readonly acmeService: AcmeService) {
    // this.cname();
    // this.cnameChecker('');
  }

  async cname(name: string) {
    const allRecords = await (
      await import('@layered/dns-records')
    ).getAllDnsRecords(name);
    const cnameList = allRecords.filter((x) => x.type === 'CNAME');
    return cnameList;
    // return allRecords;
  }

  async cnameChecker(cname: string) {
    const cnameList = await this.cname('static-website-test.nbb.ai/');
    let isAvailable = false;
    for (const name of cnameList) {
      console.log(name);
      if (cname === name.name) {
        isAvailable = true;
      }
    }
    if (!isAvailable) {
      console.log(
        'please register first or if you have registered then wait for some time',
      );
      return {
        status: 'pending',
        message:
          'please register first or if you have registered then wait for some time',
      };
    }
    // const x = this.acmeService.initiateDomainVerification(cname);
    return {
      status: 'verified',
      message: 'Please proceed with the next step',
    };
  }
}
