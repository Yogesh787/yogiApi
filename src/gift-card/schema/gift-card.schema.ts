import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

class From {
  @Prop({ type: String, required: true })
  name: string;
  @Prop({ type: String, required: true })
  email: string;
  @Prop({ type: String })
  note: string;
  @Prop({ type: Boolean })
  sendToMyself: boolean;
}

class To {
  @Prop({ type: String })
  name: string;
  @Prop({ type: String })
  email: string;
}

class Delivery {
  @Prop({ type: String })
  deliveryTime: string;
  @Prop({ type: String })
  deliveryDate: string;
}
@Schema({ timestamps: true })
export class GiftCard {
  @Prop({ type: String })
  location: string;
  @Prop({ type: Number })
  amount: number;
  @Prop({ type: From, required: true })
  from: From;
  @Prop({ type: To, required: true })
  to: To;
  @Prop({ type: Delivery, required: true })
  delivery: Delivery;
  @Prop({ type: String, required: true })
  giftCardNumber: string;
}
export const GiftCardSchema = SchemaFactory.createForClass(GiftCard);
