import { Controller } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { BlockchainController } from '../blockchain/blockchain.controller';
import { Config } from '../config';
import { Transaction } from '../util/Transaction';
import CryptoUtil from '../util/CryptoUtil';
import { Block } from '../util/Block';
import * as lodash from 'lodash';
import { spawn } from "child_process";

@Controller('miner')
export class MinerController {
  logLevel: any;
  constructor(private blockchainservice: BlockchainService) {
    this.init();
  }

  async init() {
    this.mine(
      '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
      '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
    );
  }

  mine(rewardAddress, feeAddress) {
    const block = this.generateNextBlock(
      rewardAddress,
      feeAddress,
      new BlockchainController(this.blockchainservice),
    );
    process.execArgv = lodash.reject(process.execArgv, (data) =>
      data.includes('debug'),
    );

    /* istanbul ignore next */
    const thread = spawn((input, done) => {
      /*eslint-disable */
      require(input.__dirname + '/../util/consoleWrapper.js')('mine-worker', input.logLevel);
      const Block = require(input.__dirname + '/../blockchain/block');
      const Miner = require(input.__dirname);
      /*eslint-enable */

      done(
        Miner.proveWorkFor(Block.fromJson(input.jsonBlock), input.difficulty),
      );
    });

    const transactionList = lodash.countBy(
      block.transactions
        .toString()
        .replace('{', '')
        .replace('}', '')
        .replace(/"/g, ''),
    );

    console.info(`Mining a new block with ${block.transactions.length} (${transactionList}) transactions`);

    const promise = thread.promise().then((result) => {
      thread.kill();
      return result;
    });

    thread.send({
      __dirname: __dirname,
      logLevel: this.logLevel,
      jsonBlock: block,
      difficulty: this.blockchainservice.getDifficulty(block.index),
    });

    return promise;
  }

  private generateNextBlock(
    rewardAddress,
    feeAddress,
    blockchain: BlockchainController,
  ) {
    const previousblock = blockchain.getLastBlock();
    const index = previousblock.index + 1;
    const previousHash = previousblock.hash;
    const timestamp = new Date().getTime() / 1000;
    const blocks = blockchain.getAllBlocks();
    const candidateTransactions = blockchain.getAllTransactions();
    const transactionInBlocks = lodash.flatten(
      blocks.map((block) => block.transactions),
    );

    // Select transactions that can be mined
    const rejectedTransactions = [];
    const selectedTransactions = [];
    candidateTransactions.map((transaction) => {
      let negativeOutputsFound = 0;
      let i = 0;
      const outputsLen = transaction.data.outputs.length;

      // Check for negative outputs (avoiding negative transactions or 'stealing')
      for (i = 0; i < outputsLen; i++) {
        if (transaction.data.outputs[i].amount < 0) {
          negativeOutputsFound++;
        }
      }

      // Check if any of the inputs is found in the selectedTransactions or in the blockchain
      const transactionInputFoundAnywhere = transaction.data.inputs.map(
        (input) => {
          const findInputTransactionInTransactionList = selectedTransactions
            .map((data) => data.inputs)
            .find((arr) => {
              arr.transaction == input.transaction && arr.index == input.index;
            });

          // Find the candidate transaction in the selected transaction list (avoiding double spending)
          const wasItFoundInSelectedTransactions =
            !!findInputTransactionInTransactionList;

          // Find the candidate transaction in the blockchain (avoiding mining invalid transactions)
          const wasItFoundInBlocks = transactionInBlocks
            .map((data) => data.inputs)
            .find((arr) => {
              arr.transaction == input.transaction && arr.index == input.index;
            });
          const wasItFoundInBlocksTransaction = !!wasItFoundInBlocks;

          return (
            wasItFoundInSelectedTransactions || wasItFoundInBlocksTransaction
          );
        },
      );

      if (transactionInputFoundAnywhere) {
        if (transaction.type === 'regular' && negativeOutputsFound === 0) {
          selectedTransactions.push(transaction);
        } else if (transaction.type === 'reward') {
          selectedTransactions.push(transaction);
        } else if (negativeOutputsFound > 0) {
          rejectedTransactions.push(transaction);
        }
      } else {
        rejectedTransactions.push(transaction);
      }
    });
    console.info(
      `Selected ${selectedTransactions.length} candidate transactions with ${rejectedTransactions.length} being rejected.`,
    );

    const transactions =
      selectedTransactions.length >= Config.TRANSACTIONS_PER_BLOCK
        ? selectedTransactions.splice(0, 2)
        : [];
    if (transactions.length > 0) {
      const feeTransaction = Transaction.organizeJsonArray({
        id: CryptoUtil.randomId(64),
        hash: null,
        type: 'fee',
        data: {
          inputs: [],
          outputs: [
            {
              amount: Config.FEE_PER_TRANSACTION * transactions.length, // satoshis format
              address: feeAddress, // INFO: Usually here is a locking script (to check who and when this transaction output can be used), in this case it's a simple destination address
            },
          ],
        },
      });

      transactions.push(feeTransaction);
    }
    // Add reward transaction of 50 coins
    if (rewardAddress != null) {
      const rewardTransaction = Transaction.organizeJsonArray({
        id: CryptoUtil.randomId(64),
        hash: null,
        type: 'reward',
        data: {
          inputs: [],
          outputs: [
            {
              amount: Config.MINING_REWARD, // satoshis format
              address: rewardAddress, // INFO: Usually here is a locking script (to check who and when this transaction output can be used), in this case it's a simple destination address
            },
          ],
        },
      });

      transactions.push(rewardTransaction);
    }

    return Block.organizeJsonArray({
      index,
      nonce: 0,
      previousHash,
      timestamp,
      transactions,
    });
  }

  proveWorkFor(jsonBlock, difficulty) {
    const block = Block.organizeJsonArray(jsonBlock);

    const starttime = process.hrtime();
    let diff=null;
    do {
      block.timestamp = new Date().getTime() / 1000;
      block.nonce++;
      block.hash = block.toHash();
      diff = Block.getDifficulty(block.hash);
    } while (diff >= difficulty);
    console.info(`Block found: time '${process.hrtime(starttime)[0]} sec' dif '${difficulty}' hash '${block.hash}' nonce '${block.nonce}'`);
    return block;
  }
}
