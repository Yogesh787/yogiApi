import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Certificates {
  @Prop({ required: true })
  _id: string;
  // @Prop({ type: String })
  // certificateStatus: string;
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
}
export const CertificatesSchema = SchemaFactory.createForClass(Certificates);
