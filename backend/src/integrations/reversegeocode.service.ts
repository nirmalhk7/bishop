import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';

@Injectable()
export default class ReverseGeocodeService implements IntegrationInterface {
  private accessToken;
  private log= new Logger(ReverseGeocodeService.name);

  constructor(
  ) {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }

  async get(lat: number, lon: number): Promise<any> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`;

    return axios.get(url, {
      params: {
        access_token: this.accessToken,
      },
    })
    .then(resp=> resp.data)
    .catch(err=> this.log.error(err));
  }
}
