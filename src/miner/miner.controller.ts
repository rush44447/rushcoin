import { Body, Controller, Post } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Config } from '../config';
import { Transaction } from '../util/Transaction';
import CryptoUtil from '../util/CryptoUtil';
import { Block } from '../util/Block';
import * as lodash from 'lodash';
import { Connection } from '../util/connection';

@Controller('miner')
export class MinerController {
  logLevel = Connection().logLevel;
  constructor(private blockchainservice: BlockchainService) {}

  @Post('mine')
  mine(@Body() data) {
    const block = this.generateNextBlock(data.rewardAddress, data.feeAddress);
    console.log("block>>>",block)
    process.execArgv = lodash.reject(process.execArgv, (data) =>
      data.includes('debug'),
    );

    const transactionList = lodash.countBy(
      block.transactions
        .toString()
        .replace('{', '')
        .replace('}', '')
        .replace(/"/g, ''),
    );

    console.info(
      `Mining a new block with ${block.transactions.length} (${transactionList}) transactions`,
    );

    const input = {
      __dirname: __dirname,
      logLevel: this.logLevel,
      jsonBlock: block,
      difficulty: Block.getDifficulty(
        this.blockchainservice.getLastBlock().hash,
      ),
    };
    console.log("input>>>",input)

    const generatedBlock = this.proveWorkFor(
      Block.organizeJsonArray(input.jsonBlock),
      input.difficulty,
    );

    return this.blockchainservice.addBlock(Block.organizeJsonArray(generatedBlock));;
  }

  private generateNextBlock(rewardAddress, feeAddress) {
    const previousblock = this.blockchainservice.getLastBlock();
    const index = previousblock.index + 1;
    const previousHash = previousblock.hash;
    const timestamp = new Date().getTime() / 1000;
    const blocks = this.blockchainservice.getAllBlocks();
    const candidateTransactions =
      this.blockchainservice.getLastBlock().transactions;
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
          // Find the candidate transaction in the selected transaction list (avoiding double spending)
          const wasItFoundInSelectedTransactions =
            !!this.findInputTransactionInTransactionList(
              input,
              selectedTransactions,
            );
          // Find the candidate transaction in the blockchain (avoiding mining invalid transactions)
          const wasItFoundInBlocksTransaction =
            !!this.findInputTransactionInTransactionList(
              input,
              transactionInBlocks,
            );

          return (
            wasItFoundInSelectedTransactions || wasItFoundInBlocksTransaction
          );
        },
      );
      console.log('selectedTransactions', selectedTransactions.length);

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
    let diff = null;
    do {
      block.timestamp = new Date().getTime() / 1000;
      block.nonce++;
      block.hash = block.toHash();
      diff = Block.getDifficulty(block.hash);
    } while (diff >= difficulty);
    console.info(
      `Block found: time '${
        process.hrtime(starttime)[0]
      } sec' dif '${difficulty}' hash '${block.hash}' nonce '${block.nonce}'`,
    );
    return block;
  }

  findInputTransactionInTransactionList(inputArg, selectedTransactions) {
    const inputTransactionsInTransaction = lodash.flatten(
      selectedTransactions.map((transact) => transact.data.inputs),
    );
    return inputTransactionsInTransaction.find(
      (input) =>
        inputArg.transaction == input.transaction &&
        inputArg.index == input.index,
    );
  }
}
