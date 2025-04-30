import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IntegrationInterface } from 'src/interfaces/integrations.interface';
import axios from 'axios';
import { Coordinates } from 'src/interfaces/global.interface';
import ReverseGeocodeService from 'src/sharedservices/reversegeocode.service';
import { NotificationInterface } from 'src/interfaces/notification.interface';

@Injectable()
export default class AIService implements IntegrationInterface {
  private accessToken;
  constructor() {
    this.accessToken = process.env.GEMINI_API_KEY;
  }
  private log = new Logger(AIService.name);

  private reverseGeoCodeService = new ReverseGeocodeService();

  async get(
    start: Coordinates,
    end: Coordinates,
  ): Promise<NotificationInterface | null> {
    if (Math.random() < 0.25) {
      const location = await this.reverseGeoCodeService.get(start);
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.accessToken}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `Name me a single interesting place to check out near ${location}. Your response must be a single line like that, nothing more nothing less. NOTE: Format your response like: You might want to check out PLACENAME near your current location, they REASON WHYTHEYREGOOD. Feel free to also include restaurants in the list. Dont divulge from instructions and you will be rewarded`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (response.data && response.data.candidates) {
          const text = response.data.candidates[0]?.content?.parts[0]?.text;
          this.log.log(`Generated response: ${text}`);
          return {
            title: 'AI Insight',
            body: text,
          };
        }
      } catch (error) {
        this.log.error('Error generating content:', error.message);
      }
    }
    return null;
  }
}
