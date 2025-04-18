import { Crypto } from '@peculiar/webcrypto';
Object.defineProperty(global, 'crypto', {
  value: new Crypto(),
  configurable: true,
  enumerable: true,
  writable: true
});

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CoordinatesController } from './coordinates.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { IntegrationMgmtService } from './integrationmgmt.service';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [AppController, CoordinatesController],
  providers: [AppService, IntegrationMgmtService],
})
export class AppModule {}