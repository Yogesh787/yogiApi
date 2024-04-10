import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

class From {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsNotEmpty()
  email: string;
  @IsString()
  note: string;
  @IsBoolean()
  sendToMyself: boolean;
}

class To {
  @IsString()
  name: string;
  @IsString()
  email: string;
}

class Delivery {
  @IsString()
  deliveryTime: string;
  @IsString()
  deliveryDate: string;
  @IsBoolean()
  deliverNow: boolean;
}

export class CreateGiftCardDto {
  @IsString()
  location: string;
  @IsNumber()
  amount: number;
  @IsNotEmpty()
  from: From;
  @IsNotEmpty()
  to: To;
  @IsNotEmpty()
  delivery: Delivery;
}
