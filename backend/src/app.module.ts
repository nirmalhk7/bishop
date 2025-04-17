import { Crypto } from '@peculiar/webcrypto';
global.crypto = new Crypto();

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CoordinatesController } from './coordinates.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { IntegrationMgmtService } from './integrationmgmt.service';
import { ChatGptModule } from './chatgpt/chatgpt.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    ChatGptModule,
    IntegrationsModule,
  ],
  controllers: [AppController, CoordinatesController],
  providers: [AppService, IntegrationMgmtService],
})
export class AppModule {}