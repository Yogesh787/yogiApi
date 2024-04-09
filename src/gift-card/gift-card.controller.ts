import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';

@Controller()
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Post('gift-card/create')
  create(@Body() createGiftCardDto: CreateGiftCardDto) {
    return this.giftCardService.create(createGiftCardDto);
  }

  @Get('gift-cards')
  findAll() {
    return this.giftCardService.findAll();
  }

  @Get('gift-card/number/:number')
  findOneByGiftCardNumber(@Param('number') number: string) {
    return this.giftCardService.findOneByGiftCardNumber(number);
  }

  @Patch('gift-card/:id')
  update(
    @Param('id') id: string,
    @Body() updateGiftCardDto: UpdateGiftCardDto,
  ) {
    return this.giftCardService.update(id, updateGiftCardDto);
  }

  @Delete('gift-card/:id')
  remove(@Param('id') id: string) {
    return this.giftCardService.remove(id);
  }
}
