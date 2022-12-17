import { Config } from '../config';
import Transactions from '../transaction/Transactions';
import CryptoUtil from './CryptoUtil';
import { Transaction } from "./Transaction";

export class Block {
  index: number;
  hash: string;
  previousHash: string;
  transactions: Transaction[];
  constructor() {}

  static toHash(block) {
    return CryptoUtil.hash(
      block.index +
        block.previousHash +
        block.timestamp +
        JSON.stringify(block.transactions),
    );
  }

  static getDifficulty(hash) {
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
}
