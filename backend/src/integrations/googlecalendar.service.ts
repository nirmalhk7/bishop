import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';
import { google } from 'googleapis';
import * as path from 'path';
import GeocodeService from 'src/sharedservices/geocode.service';
import { NotificationInterface } from 'src/interfaces/notification.interface';
import MapDirectionsService from './mapdirections.service';
const fs = require('fs');

@Injectable()
export default class GoogleCalendarService implements IntegrationInterface {
  private readonly log = new Logger(GoogleCalendarService.name);
  private mapDirections = new MapDirectionsService();
  private geocodeService = new GeocodeService();
  private calendar;

  constructor() {
    let keyFilePath;
    if (process.env.NODE_ENV === 'production') {
      const settings = process.env.BISHOP_GCAL_SETTINGS;
      if (settings) {
        const filePath = '/tmp/bdarch-bishop-calendar-svc.gcp.json';
        fs.writeFileSync(filePath, settings);
        keyFilePath = filePath;
        this.log.debug(`Using production env at ${keyFilePath}`)
      } else {
        throw new Error('BISHOP_GCAL_SETTINGS environment variable is not set');
      }
    } else {
      keyFilePath = path.join(
        __dirname,
        '../../bdarch-bishop-calendar-svc.gcp.json',
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  distance(current: Coordinates, predicted: Coordinates): number {
    // Convert decimal degrees to radians
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

    const dLat = toRadians(predicted.lat - current.lat);
    const dLon = toRadians(predicted.lon - current.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(predicted.lat)) *
        Math.cos(toRadians(current.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusInMiles = 3956; // Earth's radius in miles

    return earthRadiusInMiles * c;
  }

  async get(
    start: Coordinates,
    end: Coordinates,
  ): Promise<NotificationInterface | null> {
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
      const upcomingLocationEvent = events.filter(
        (event) =>
          typeof event.location === 'string' && event.location !== null,
      )[0];
      const location_coordinates = await this.geocodeService.get(
        upcomingLocationEvent.location,
      );

      if (this.distance(start, location_coordinates) >= 0.0) {
        const duration = (
          await this.mapDirections.getDirectionsData(start, end)
        )?.durationMins;
        return {
          title: 'Upcoming Event',
          body: `You are too far from your upcoming event at "${upcomingLocationEvent.location}". ETA (current traffic): ${duration} mins`,
        };
      }
    } catch (error: any) {
      this.log.error('Error fetching calendar events', error);
    }
    return null;
  }
}
