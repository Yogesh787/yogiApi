import { Controller, Get, Param, Res } from '@nestjs/common';
import { TestService } from './test.service';
import { Response } from 'express';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('')
  async findOneByGiftCardNumber(
    @Param('number') number: string,
    @Res() res: Response,
  ) {
    console.log('lsjfd');
    const x = await this.testService.test();
    res.status(200).send(x);
  }
}
