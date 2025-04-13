import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from "axios"

@Injectable()
export default class WeatherService implements IntegrationInterface {
  constructor(
  ) {}

  private log= new Logger(WeatherService.name)

  public async get(lat: number, lon: number): Promise<any> {
    const apiKey = process.env.WEATHER_API_KEY;
    const url = 'https://api.openweathermap.org/data/2.5/weather';

    return axios.get(url, {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: 'metric',
      },
    })
    .then(resp=> resp.data)
    .catch(err=> this.log.error(err));
  }
}
