import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/integration.spec.service';

@Injectable()
export class GoogleCalendarService implements IntegrationInterface {
  private accessToken;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken=""
  }

  async get(lat: number, lon: number): Promise<any> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
}
