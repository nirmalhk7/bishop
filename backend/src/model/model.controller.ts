import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ModelService } from './model.service';
import { LocationDataDto, LocationPredictionDto } from './dto/model.dto';

@Controller('model')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  // GET endpoint for location prediction
  @Get('predict')
  async getPrediction(@Query() query: LocationPredictionDto) {
    try {
      const { userId, timestamp } = query;
      const prediction = await this.modelService.predictLocation(userId, timestamp);
      
      return {
        success: true,
        data: prediction,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // POST endpoint for storing location data
  @Post('location')
  async storeLocation(@Body() locationData: LocationDataDto) {
    try {
      await this.modelService.storeLocationData(locationData);
      
      return {
        success: true,
        message: 'Location data stored successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}