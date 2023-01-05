import { Config } from '../config';
import Transactions from '../transaction/Transactions';
import CryptoUtil from './CryptoUtil';
import { Transaction } from './Transaction';

export class Block {
  index: number;
  nonce: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];

  constructor() {}

  static toHash(block: Block) {
    return CryptoUtil.hash(
      block.index +
        block.previousHash +
        block.timestamp +
        JSON.stringify(block.transactions) +
        block.nonce,
    );
  }

  static getDifficulty(hash: string) {
    return parseInt(hash.substring(0, 14), 16);
  }

  static get genesis() {
    return Block.organizeJsonArray(Config.genesisBlock);
  }

  // check if the block data has same instance as Block
  static organizeJsonArray(block) {
    const data = new Block();
    const keys = Object.keys(block);
    keys.forEach((key) => {
      if (key == 'transactions' && block[key]) {
        data[key] = Transactions.fromJsonArray(block[key]);
      } else {
        data[key] = block[key];
      }
    });
    return data;
  }

  toHash() {
    return CryptoUtil.hash(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce,
    );
  }
}
