import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';

@Injectable()
export default class GeocodeService {
  private accessToken;
  private log= new Logger(GeocodeService.name);

  constructor(
  ) {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }

  async get(location: string): Promise<Coordinates> {
    const url = `https://api.mapbox.com/search/geocode/v6/forward`;

    return axios.get(url, {
      params: {
        q: location,
        limit: 1,
        access_token: this.accessToken,
      },
    })
    .then(resp=> resp.data)
    .then(resp=> resp.features[0].geometry.coordinates)
    .then(resp=> ({lat: resp[0], lon: resp[1]}))
    .catch(err => {
      this.log.error(err);
      return { lat: 40.03481674194336, lon: -105.2522964477539 }; // Provide a default value
    });
  }
}
