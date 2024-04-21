import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DomainDocument = HydratedDocument<Domain>;
@Schema({ timestamps: true })
export class Domain {
  @Prop({ type: String })
  name: string;
  @Prop({ type: Boolean })
  verified: boolean;
  @Prop({ type: Boolean })
  certificateStatus: boolean;
  @Prop({ type: Boolean })
  cnameVerified: boolean;
  @Prop({ type: String })
  accountUrl: string;
}

export const DomainSchema = SchemaFactory.createForClass(Domain);
