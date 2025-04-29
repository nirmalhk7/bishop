import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getSettings(): SettingsInterface {
    if (process.env.NODE_ENV !== 'production') {
      const filePath = path.resolve(__dirname, '../settings.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } else {
      return JSON.parse(process.env.BISHOP_SETTINGS || "{}")
    }
  }
}
