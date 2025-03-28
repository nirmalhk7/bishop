import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LocationDataDto } from './dto/model.dto';

@Injectable()
export class ModelService {
  constructor(
    // Dependency Injection of required services
    private readonly httpService: HttpService, // for HTTP requests
    private readonly configService: ConfigService, // for ML Model API
  ) {}

  // Retrieves Model API URL from environment variables
  private get modelApiUrl(): string {
    return this.configService.get<string>('MODEL_API_URL', 'http://localhost:5000');
  }

  // Method to get location prediction from ML model
  async predictLocation(userId: string, timestamp: number): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.modelApiUrl}/predict`, {
        params: { userId, timestamp },  
      })
    );
    
    return response.data;
  }

  // Method to store location data in ML model's database
  async storeLocationData(data: LocationDataDto): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.modelApiUrl}/data`,
        data
      )
    );
    
    return response.data;
  }
}
