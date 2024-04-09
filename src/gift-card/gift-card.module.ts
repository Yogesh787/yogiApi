import { Module } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftCard, GiftCardSchema } from './schema/gift-card.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GiftCard.name, schema: GiftCardSchema },
    ]),
  ],
  controllers: [GiftCardController],
  providers: [GiftCardService],
})
export class GiftCardModule {}
