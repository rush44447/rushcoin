import { Controller } from '@nestjs/common';

@Controller('httpserver')
export class HttpserverController {
  constructor() {
    console.log(4)
  }
}
