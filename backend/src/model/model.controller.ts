import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { ModelService } from './model.service';

@Controller('model')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  // ========= ML MODEL ENDPOINTS =========

  // GET endpoint for location prediction
  @Get('predict')
  async getPrediction(@Query() query) {
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
  async storeLocation(@Body() locationData) {
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

  // ========= WEATHER API =========

  @Get('weather')
  async getWeather(@Query('lat') lat: string, @Query('lon') lon: string) {
    try {
      const data = await this.modelService.getWeather(Number(lat), Number(lon));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========= GOOGLE CALENDAR API =========

  @Get('calendar')
  async getCalendarEvents(@Headers('Authorization') authHeader: string) {
    try {
      const accessToken = authHeader.replace('Bearer ', '');
      const data = await this.modelService.getUpcomingCalendarEvents(accessToken);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========= MAPBOX: Reverse Geocoding =========

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lon') lon: string) {
    try {
      const data = await this.modelService.reverseGeocode(Number(lat), Number(lon));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========= MAPBOX: Directions =========

  @Get('directions')
  async getDirections(
    @Query('startLon') startLon: string,
    @Query('startLat') startLat: string,
    @Query('endLon') endLon: string,
    @Query('endLat') endLat: string,
  ) {
    try {
      const start: [number, number] = [Number(startLon), Number(startLat)];
      const end: [number, number] = [Number(endLon), Number(endLat)];
      const data = await this.modelService.getDirections(start, end);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ========= MAPBOX: Map Matching =========

  @Post('match-route')
  async matchRoute(@Body() body: { gpsPoints: [number, number][] }) {
    try {
      const data = await this.modelService.matchRoute(body.gpsPoints);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
