// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

 
  app.enableCors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
  });

 


  const config = new DocumentBuilder()
    .setTitle('Transaction Pattern Analyzer API')
    .setDescription(
      'API for analyzing transaction patterns and detecting subscriptions using AI',
    )
    .setVersion('1.0')
    .addTag('transactions', 'Transaction management and analysis')
    .addTag('merchants', 'Merchant normalization and categorization')
    .addTag('patterns', 'Pattern detection and analysis')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  const port = process.env.PORT || 3000;
  await app.listen(port);

}

bootstrap();
