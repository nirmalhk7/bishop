import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import ReverseGeocodeService from './reversegeocode.service';
import { OpenAIService } from './openai.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [ReverseGeocodeService, OpenAIService],
  exports: [ReverseGeocodeService, OpenAIService],
})
export class SharedServicesModule {} 