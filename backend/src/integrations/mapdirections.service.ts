import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from "axios"

@Injectable()
export default class MapDirectionsService implements IntegrationInterface {
  private accessToken;
  constructor(
  ) {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }
  private log= new Logger(MapDirectionsService.name);

  async directions(
    start: { lat: number; lon: number },
    end: { lat: number; lon: number },
  ): Promise<any> {
    const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`;

    return axios.get(url, {
      params: {
        access_token: this.accessToken,
        alternatives: false,
        geometries: 'geojson',
        overview: 'full',
      },
    })
    .then(resp=> resp.data)
    .catch(err=> this.log.error(err));
  }
}
