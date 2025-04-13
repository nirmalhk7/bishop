import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/integration.spec.service';

@Injectable()
export class ReverseGeocodeService implements IntegrationInterface {
  private accessToken;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>('MAPBOX_API_KEY');
  }

  async get(lat: number, lon: number): Promise<any> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: {
          access_token: this.accessToken,
        },
      }),
    );

    return response.data;
  }
}
