import { Test, TestingModule } from '@nestjs/testing';
import { HttpserverController } from './httpserver.controller';

describe('HttpserverController', () => {
  let controller: HttpserverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HttpserverController],
    }).compile();

    controller = module.get<HttpserverController>(HttpserverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
