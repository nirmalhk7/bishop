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

  distance(current: Coordinates, predicted: Coordinates): number {
    // Convert decimal degrees to radians
    const toRadians = (degrees: number): number => degrees * Math.PI / 180;
    
    const dLat = toRadians(predicted.lat - current.lat);
    const dLon = toRadians(predicted.lon - current.lon);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(predicted.lat)) * Math.cos(toRadians(current.lat)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusInMiles = 3956; // Earth's radius in miles
    
    return earthRadiusInMiles * c;
  }

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
