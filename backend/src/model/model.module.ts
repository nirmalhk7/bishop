import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ModelController } from './model.controller';
import { ModelService } from './model.service';

@Module({
  imports: [
    // HTTP module for making external API calls
    HttpModule.register({
      timeout: 5000,      // 5-second timeout
      maxRedirects: 5,    // Maximum redirects allowed
    }),
    ConfigModule,
  ],
  controllers: [ModelController],  // Register controller
  providers: [ModelService],       // Register service
  exports: [ModelService],         // Allow service to be used in other modules
})
export class ModelModule {}