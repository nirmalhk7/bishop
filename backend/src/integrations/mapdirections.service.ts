import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';
import ReverseGeocodeService from 'src/sharedservices/reversegeocode.service';

@Injectable()
export default class MapDirectionsService implements IntegrationInterface {
  private accessToken;
  constructor() {
    this.accessToken = process.env.MAPBOX_API_KEY;
  }
  private log = new Logger(MapDirectionsService.name);

  private reverseGeoCodeService = new ReverseGeocodeService();

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

  async get(start: Coordinates, end: Coordinates): Promise<any> {
    const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`;
    console.log(coordinates);
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}`;

    if (this.distance(start, end) >= 0.5) {

      const location = await this.reverseGeoCodeService.get(end);
      return axios
        .get(url, {
          params: {
            access_token: this.accessToken,
            alternatives: false,
            geometries: 'geojson',
            annotations: 'distance,duration',
          },
        })
        .then((resp) => {
          if (resp.data.routes.length > 0) {
            const distanceMiles = (resp.data.routes[0].distance / 1609.344).toFixed(2);
            const durationMins = (resp.data.routes[0].duration / 60).toFixed(2);
            this.log.debug(`Duration (mins): ${durationMins}, Distance: ${distanceMiles}`)
            return {
              title: "Traffic Update",
              body: `Predicted future location ${location} is ${distanceMiles}mi away, and would take ${durationMins} mins by traffic conditions`
            }
          }
        })
        .catch((err) => this.log.error(err));
    }
  }
}
