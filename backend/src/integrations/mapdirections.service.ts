import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from "axios"
import { Coordinates } from 'src/interfaces/global.interface';

@Injectable()
export default class MapDirectionsService implements IntegrationInterface {
  private accessToken;
  constructor(
  ) {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }
  private log= new Logger(MapDirectionsService.name);

  async get(start: Coordinates, end: Coordinates): Promise<any> {
    const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}`;

    return axios.get(url, {
      params: {
        access_token: this.accessToken,
        alternatives: false,
        geometries: 'geojson',
        overview: 'full',
      },
    })
    .then(resp=> resp.data)
    .then(resp=>({
      distance: resp[0].distance,
      duration: resp[0].duration
    }))
    .catch(err=> this.log.error(err));
  }
}
