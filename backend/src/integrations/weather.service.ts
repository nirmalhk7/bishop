import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';
import ReverseGeocodeService from '../sharedservices/reversegeocode.service';

interface WeatherInterface {}

const compareMetrics = (current: number, predict: number) => {
  return Math.abs((predict/current)-1)<=0.1;
}

@Injectable()
export default class WeatherService implements IntegrationInterface {
  constructor() {}

  private log = new Logger(WeatherService.name);
  private reverseGeoCodeService = new ReverseGeocodeService();
  
  async get(start: Coordinates, end: Coordinates): Promise<any> {
    const apiKey = process.env.WEATHER_API_KEY;
    const url = 'https://api.openweathermap.org/data/2.5/weather';

    const startWeatherPromise = axios.get(url, {
      params: {
        lat: start.lat,
        lon: start.lon,
        appid: apiKey,
        units: 'metric',
      },
    });

    const endWeatherPromise = axios.get(url, {
      params: {
        lat: end.lat,
        lon: end.lon,
        appid: apiKey,
        units: 'metric',
      },
    });



    return Promise.all([startWeatherPromise, endWeatherPromise, 
      this.reverseGeoCodeService.get(end)])
      .then(([startWeather, endWeather, endLocation]) => {
        const current_info = {
          brief: startWeather.data.weather[0].main,
          feels_like_temp: startWeather.data.main.feels_like,
          humidity: startWeather.data.main.humidity,
          wind_speed: startWeather.data.wind.speed,
        };
        const predict_info = {
          brief: endWeather.data.weather[0].main,
          feels_like_temp: endWeather.data.main.feels_like,
          humidity: endWeather.data.main.humidity,
          wind_speed: endWeather.data.wind.speed,
        };

        if (current_info.brief !== predict_info.brief) {
          return {
            title:"Weather Update",
            body: `Your expected location in future ${endLocation} has a change in weather: expect ${predict_info.brief}`
          };
        } else if(compareMetrics(current_info.feels_like_temp, predict_info.feels_like_temp)){
          return {
            title:"Weather Update",
            body: `Your expected location in future ${endLocation} has a change in weather: expect ${predict_info.feels_like_temp} deg C`
          };
        } else if(compareMetrics(current_info.humidity, predict_info.humidity)){
          return {
            title:"Weather Update",
            body: `Your expected location in future ${endLocation} has a change in weather: expect humidity ${predict_info.feels_like_temp}`
          };
        } else if(compareMetrics(current_info.wind_speed, predict_info.wind_speed)){
          return {
            title:"Weather Update",
            body: `Your expected location in future ${endLocation} has a change in weather: expect wind speed ${predict_info.feels_like_temp}`
          };
        }
        return null;
      })
      .catch((err) => this.log.error(err));
  }
}
