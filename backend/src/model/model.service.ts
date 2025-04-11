import { HttpServer, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

@Injectable()
export class ModelService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}
  // =============================
  // 🔮 ML MODEL API
  // =============================

  private get modelApiUrl(): string {
    return this.configService.get<string>('MODEL_API_URL', 'http://localhost:5000');
  }

  async predictLocation(userId: string, timestamp: number): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.modelApiUrl}/predict`, {
        params: { userId, timestamp },
      }),
    );
    return response.data;
  }

  async storeLocationData(data): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.modelApiUrl}/data`, data),
    );
    return response.data;
  }

  // =============================
  // 🌤️ WEATHER API (OpenWeather)
  // =============================

  async getWeather(lat: number, lon: number): Promise<any> {
    const apiKey = this.configService.get<string>('WEATHER_API_KEY');
    const url = 'https://api.openweathermap.org/data/2.5/weather';

    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'metric',
        },
      }),
    );

    return response.data;
  }

  // =============================
  // 📅 GOOGLE CALENDAR API
  // =============================

  async getUpcomingCalendarEvents(accessToken: string): Promise<any> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          maxResults: 5,
          orderBy: 'startTime',
          singleEvents: true,
          timeMin: new Date().toISOString(),
        },
      }),
    );

    return response.data;
  }

  // =============================
  // 🗺️ MAPBOX APIS
  // =============================

  // Reverse geocoding: coordinates to place name
  async reverseGeocode(lat: number, lon: number): Promise<any> {
    const accessToken = this.configService.get<string>('MAPBOX_API_KEY');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          access_token: accessToken,
        },
      }),
    );

    return response.data;
  }

  // Directions between two coordinates
  async getDirections(start: [number, number], end: [number, number]): Promise<any> {
    const accessToken = this.configService.get<string>('MAPBOX_API_KEY');
    const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          access_token: accessToken,
          alternatives: false,
          geometries: 'geojson',
          overview: 'full',
        },
      }),
    );

    return response.data;
  }

  // Map matching: clean up noisy GPS track
  async matchRoute(gpsPoints: [number, number][]): Promise<any> {
    const accessToken = this.configService.get<string>('MAPBOX_API_KEY');
    const coordStr = gpsPoints.map(([lon, lat]) => `${lon},${lat}`).join(';');
    const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordStr}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          access_token: accessToken,
          geometries: 'geojson',
          overview: 'simplified',
        },
      }),
    );

    return response.data;
  }
}
