import { Controller } from '@nestjs/common';

@Controller('miner')
export class MinerController {
  blockchain: any;
  constructor() {
  }

  mine(rewardAddress, feeAddress){
    const block = this.generateNextBlock(rewardAddress, feeAddress, this.blockchain)
  }

  private generateNextBlock(rewardAddress, feeAddress, blockchain: any) {

  }
}
