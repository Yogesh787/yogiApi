import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AcmeService } from './acme.service';

@Controller('.well-known/acme-challenge')
export class AppController {
  constructor(private readonly acmeService: AcmeService) {}

  @Get(':token')
  async serveChallenge(@Param('token') token: string, @Res() res: Response) {
    console.log(token);
    const keyAuthorization = await this.acmeService.getChallengeResponse(token);
    if (keyAuthorization) {
      res.type('text/plain').send(keyAuthorization);
    } else {
      res.status(404).send('Not Found');
    }
  }
}
