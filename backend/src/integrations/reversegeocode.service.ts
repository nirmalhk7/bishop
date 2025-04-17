import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';

@Injectable()
export default class ReverseGeocodeService implements IntegrationInterface {
  private accessToken;
  private log= new Logger(ReverseGeocodeService.name);

  constructor(
  ) {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }

  async get(coordinates: Coordinates): Promise<any> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lon},${coordinates.lat}.json`;

    return axios.get(url, {
      params: {
        access_token: this.accessToken,
      },
    })
    .then(resp=> resp.data)
    .then(resp=> resp.features[0].place_name)
    .catch(err=> this.log.error(err));
  }
}
