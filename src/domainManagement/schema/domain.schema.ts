import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DomainDocument = HydratedDocument<Domain>;
@Schema({ timestamps: true })
export class Domain {
  @Prop({ type: String })
  name: string;
  @Prop({ type: String })
  userId: string;
  @Prop({ type: Boolean })
  verified: boolean;
  @Prop({ type: String })
  certificateStatus: string;
  @Prop({ type: String })
  http01Token: string;
  @Prop({ type: String })
  http01KeyAuthorization: string;
  @Prop({ type: Date })
  expiresAt: Date;
  @Prop({ type: String })
  certificate: string;
  @Prop({ type: String })
  privateKey: string;
  @Prop({ type: String })
  csr: string;
  @Prop({ type: String })
  accountUrl: string;
}

export const DomainSchema = SchemaFactory.createForClass(Domain);
