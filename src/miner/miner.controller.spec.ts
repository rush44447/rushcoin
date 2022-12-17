import { Test, TestingModule } from '@nestjs/testing';
import { MinerController } from './miner.controller';

describe('MinerController', () => {
  let controller: MinerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinerController],
    }).compile();

    controller = module.get<MinerController>(MinerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
