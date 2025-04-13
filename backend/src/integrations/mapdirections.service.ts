import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/integration.spec.service';

@Injectable()
export class MapDirectionsService implements IntegrationInterface {
  private accessToken;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>('MAPBOX_API_KEY');
  }

  async directions(
    start: { lat: number; lon: number },
    end: { lat: number; lon: number },
  ): Promise<any> {
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
}
