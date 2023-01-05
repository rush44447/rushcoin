import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BlockchainController } from './blockchain/blockchain.controller';
import { OperatorController } from './operator/operator.controller';
import { MinerController } from './miner/miner.controller';
import { NodeController } from './node/node.controller';
import { HttpserverController } from './httpserver/httpserver.controller';
import { BlockchainService } from './blockchain/blockchain.service';
import { WalletService } from './operator/wallet.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    AppController,
    BlockchainController,
    OperatorController,
    MinerController,
    NodeController,
    HttpserverController,
  ],
  providers: [AppService, BlockchainService, WalletService],
})
export class AppModule {}
