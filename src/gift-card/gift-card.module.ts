import { Module } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftCard, GiftCardSchema } from './schema/gift-card.schema';
import { MailchimpModule } from '../mailchimp/mailchimp.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GiftCard.name, schema: GiftCardSchema },
    ]),
    MailchimpModule,
  ],
  controllers: [GiftCardController],
  providers: [GiftCardService],
})
export class GiftCardModule {}
