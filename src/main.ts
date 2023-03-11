import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SwaggerDocumentOptions } from './util/SwaggerDocumentOptions';
import { swagger } from "./util/swagger";
const swaggerdoc = swagger;
const options: SwaggerDocumentOptions = {
  deepScanRoutes: true,
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // @ts-ignore
  SwaggerModule.setup('api-docs', app, swaggerdoc, options);
  await app.listen(process.env.PORT);
}
bootstrap();
