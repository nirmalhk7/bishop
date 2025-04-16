import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { HttpService } from '@nestjs/axios';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("/settings")
  getSettings(): SettingsInterface {
    return this.appService.getSettings();
  }
}