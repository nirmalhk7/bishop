import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';

@Injectable()
export default class GoogleCalendarService implements IntegrationInterface {
  private accessToken;
  constructor(
  ) {
    this.accessToken="AIzaSyAAq8L3ou_L5577MEN6XDiIPw36VrEzLUM"
  }
  private log= new Logger(GoogleCalendarService.name);

  
  async get(start: Coordinates, end: Coordinates): Promise<any> {
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
