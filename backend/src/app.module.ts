import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelModule } from './model/model.module';

@Module({
  imports: [
    // Global configuration module
    // Allows use of environment variables across the app
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Import the Model module
    ModelModule,
  ],
})
export class AppModule {}