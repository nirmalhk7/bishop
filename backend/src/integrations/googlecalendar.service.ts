// import { HttpService } from '@nestjs/axios';
// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { firstValueFrom } from 'rxjs';
// import { IntegrationInterface } from 'src/interfaces/integrations.interface';
// import axios from 'axios';
// import { Coordinates } from 'src/interfaces/global.interface';

// @Injectable()
// export default class GoogleCalendarService implements IntegrationInterface {
//   private accessToken;
//   constructor(
//   ) {
//     this.accessToken="AIzaSyAAq8L3ou_L5577MEN6XDiIPw36VrEzLUM"
//   }
//   private log= new Logger(GoogleCalendarService.name);

  
//   async get(start: Coordinates, end: Coordinates): Promise<any> {
//     const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

//     return await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${this.accessToken}`,
//       },
//       params: {
//         maxResults: 5,
//         orderBy: 'startTime',
//         singleEvents: true,
//         timeMin: new Date().toISOString(),
//       },
//     })
//     .then(resp=> resp.data)
//     .catch(err=> this.log.error(err));
//   }
// }




import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import { Coordinates } from 'src/interfaces/global.interface';

@Injectable()
export default class GoogleCalendarService implements IntegrationInterface {
  private readonly log = new Logger(GoogleCalendarService.name);
  private calendar;

  constructor() {
    const keyFilePath = path.join(__dirname, '../../calendar-service-account-key.json');

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async get(start: Coordinates, end: Coordinates): Promise<any> {
    this.log.debug('GoogleCalendarService.get() called');
    try {
      const response = await this.calendar.events.list({
        calendarId: 'thpa5058@colorado.edu',
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: new Date().toISOString(),
      });

      const events = response.data.items || [];
      this.log.debug(`Fetched ${events.length} events from calendar.`);

      return events;
    } catch (error: any) {
      this.log.error('Error fetching calendar events', error);
      return [];
    }
  }
}
