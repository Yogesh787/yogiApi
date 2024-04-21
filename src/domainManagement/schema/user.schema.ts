import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

class Key {
  @Prop({ type: String })
  kty: string;
  @Prop({ type: String })
  n: string;
  @Prop({ type: String })
  e: string;
}
@Schema()
export class User {
  @Prop({ type: Key })
  key: Key;
  @Prop([{ type: String }])
  contact: string[];
  @Prop({ type: String })
  initialIp: string;
  @Prop({ type: String })
  createdAt: string;
  @Prop({ type: String })
  status: string;
  @Prop({ type: String })
  accountKey: string;
}
export const UserSchema = SchemaFactory.createForClass(User);
