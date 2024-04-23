import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(5197);
  app.enableCors({ origin: '*' });
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
