import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ProfileSummary } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('profile-summary')
  getProfileSummary(): ProfileSummary {
    return this.appService.getProfileSummary();
  }
}
