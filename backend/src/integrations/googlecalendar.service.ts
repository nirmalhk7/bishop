import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';

@Injectable()
export default class GoogleCalendarService implements IntegrationInterface {
  private accessToken;
  constructor(
  ) {
    this.accessToken=""
  }
  private log= new Logger(GoogleCalendarService.name);

  async get(lat: number, lon: number): Promise<any> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    return await axios.get(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        maxResults: 5,
        orderBy: 'startTime',
        singleEvents: true,
        timeMin: new Date().toISOString(),
      },
    })
    .then(resp=> resp.data)
    .catch(err=> this.log.error(err));
  }
}
