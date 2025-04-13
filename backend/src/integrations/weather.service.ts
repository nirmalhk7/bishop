import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/integration.spec.service';

@Injectable()
export class WeatherService implements IntegrationInterface {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async get(lat: number, lon: number): Promise<any> {
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
}
