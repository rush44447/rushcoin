import { Injectable } from '@nestjs/common';
import { Connection } from '../connection';
import { DB } from '../util/DB';
import Transactions from '../transaction/Transactions';
import { Config } from '../config';
import Blocks from './Blocks';
import { BlockAssertionError } from './blockAssertionError';
import { EventEmitter } from 'events';
import { Block } from '../util/Block';
import { BlockchainAssertionError } from './blockchainAssertionError';
import { TransactionAssertionError } from '../transaction/TransactionAssertionError';

@Injectable()
export class BlockchainService {
  dbName: string;
  private emitter = new EventEmitter();
  blocks: Blocks;

  initializeBlockDB() {
    this.dbName = Connection.name;
    return new DB('./src/data/' + this.dbName + '/blocks.json', new Blocks());
  }

  initializeTransactionDB() {
    this.dbName = Connection.name;
    return new DB(
      './src/data/' + this.dbName + '/transactions.json',
      new Transactions(),
    );
  }

  replaceChain(newBlockChain, blocks) {
    if (newBlockChain.length <= blocks.length) {
      throw new BlockAssertionError(
        'Blockchain shorter than the current blockchain',
      );
    }
    this.checkChain(newBlockChain);

    newBlockChain.splice(newBlockChain.length - blocks.length).map((block) => {
      blocks = this.addBlock(blocks, block);
    });
    this.emitter.emit('blockchainReplaced', blocks);
    return blocks;
  }

  addBlock(blocks, block) {}

  checkChain(blocks: Block[]) {
    if (JSON.stringify(blocks[0]) !== JSON.stringify(Block.genesis)) {
      throw new BlockAssertionError('First element of the chain is invalid');
    }
    for (let i = 1; i < blocks.length - 1; i++) {
      this.checkBlock(blocks[i], blocks[i - 1], blocks);
    }
    return true;
  }

  checkBlock(block2: Block, block1: Block, blocks: Block[]) {
    const blockHash = Block.toHash(block2);
    if (block1.index + 1 != block2.index) {
      throw new BlockchainAssertionError('Index not proper');
    }
    if (block2.previousHash != block1.hash) {
      throw new BlockchainAssertionError('Invalid Hash');
    }
    if (block2.hash != blockHash) {
      throw new BlockchainAssertionError('Hash not proper');
    }
    if (
      Block.getDifficulty(block2.hash) / 10 >=
      this.getDifficulty(this.blocks, block2.index)
    ) {
      throw new BlockchainAssertionError('Invalid proof-of-work');
    }

    blocks.map((block) =>
      this.checkTransactions(block['transactions'], blocks),
    );

    let sumofOutputTransactions;
    block2.transactions.map((transaction) => {
      let sum = 0;
      transaction.data.outputs.map((output) => (sum += output));
      sumofOutputTransactions += sum;
    });
    let sumofInputTransactions;
    block2.transactions.map((transaction) => {
      let sum = 0;
      transaction.data.inputs.map((input) => (sum += input));
      sumofInputTransactions += sum;
    });
    sumofInputTransactions += Config.MINING_REWARD;
    return true;
  }

  checkTransactions(transactions, referenceBlocks) {
    // 1

    const IsNotAlreadyPresent = referenceBlocks.map((block) => {
      return (
        block.transactions.find(
          (transaction) => transaction.id == block.transactions.id,
        ) == undefined
      );
    });

    if (!IsNotAlreadyPresent) {
      throw new TransactionAssertionError(
        `Transaction '${transactions.id}' is already in the blockchain`,
      );
    }
  }

  getDifficulty(blocks, index) {
    return Config.pow.getDifficulty(blocks, index);
  }

  setBlocks(blocks: Blocks) {
    this.blocks = blocks;
  }
}
