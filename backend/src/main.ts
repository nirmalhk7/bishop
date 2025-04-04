import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  // - Automatically validates incoming request data
  // - Transforms data to match DTO specifications
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,  // Strips out non-whitelisted properties
    transform: true   // Automatically transforms payload to DTO type
  }));
  
  // Enable CORS for cross-origin requests
  app.enableCors();
  
  // Use PORT from environment variable or default to 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();