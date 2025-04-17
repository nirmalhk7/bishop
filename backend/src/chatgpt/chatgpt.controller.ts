import { Controller, Post, Body } from '@nestjs/common';
import { ChatGptService } from './chatgpt.service';

@Controller('chat')
export class ChatGptController {
  constructor(private readonly chatGptService: ChatGptService) {}

  @Post('ask')
  async askChat(@Body('prompt') prompt: string) {
    const reply = await this.chatGptService.ask(prompt);
    return { reply };
  }
}