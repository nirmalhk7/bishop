import { Module } from '@nestjs/common';
import WeatherService from './weather.service';
import GoogleCalendarService from './googlecalendar.service';
import MapDirectionsService from './mapdirections.service';
import ReverseGeocodeService from '../sharedservices/reversegeocode.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
  ],
  providers: [
    GoogleCalendarService,
    MapDirectionsService,
    ReverseGeocodeService,
    WeatherService,
  ],
})
export class IntegrationsModule {}
