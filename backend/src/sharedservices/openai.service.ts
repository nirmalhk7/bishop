import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private openai_apikey=process.env.OPENAI_API_KEY || ""
  constructor() {
    this.openai = new OpenAI({
      apiKey: this.openai_apikey,
    });
  }

  async ask(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content ?? 'No response';
  }
}