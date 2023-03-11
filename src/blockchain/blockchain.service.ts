import { Body, Injectable, Param } from "@nestjs/common";
import { Connection } from '../util/connection';
import { DB } from '../util/DB';
import Transactions from '../transaction/Transactions';
import { Config } from '../config';
import Blocks from './Blocks';
import { BlockAssertionError } from './blockAssertionError';
import { Block } from '../util/Block';
import { BlockchainAssertionError } from './blockchainAssertionError';
import { TransactionAssertionError } from '../transaction/TransactionAssertionError';
import { Transaction } from '../util/Transaction';
import * as lodash from 'lodash';
import { EmitterService } from "../services/emitter.service";

@Injectable()
export class BlockchainService {
  blocks: Blocks;
  transactions: Transactions;
  blocksDB: DB;
  transactionsDB: DB;

  constructor() {
    this.blocksDB = this.initializeBlockDB();
    this.transactionsDB = this.initializeTransactionDB();
    this.init();
  }

  async init() {
    this.blocks = await this.blocksDB.read(Blocks);
    this.transactions = await this.transactionsDB.read(Transactions);
  }

  initializeBlockDB() {
    return new DB(`./src/data/${Connection().name}/blocks.json`, new Blocks());
  }

  initializeTransactionDB() {
    return new DB(`./src/data/${Connection().name}/transactions.json`,
      new Transactions(),
    );
  }

  replaceChain(newBlockChain, blocks = this.blocks) {
    if (newBlockChain.length <= blocks.length) {
      throw new BlockAssertionError(
        'Blockchain shorter than the current blockchain',
      );
    }
    this.checkChain(newBlockChain);
    newBlockChain.slice(newBlockChain.length - blocks.length).map((block) => this.addBlock(block, false));
    EmitterService.getEmitter().emit('blockchainReplaced', blocks);
    return blocks;
  }

  getLastBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  getTransactionById(data) {
    return this.transactions.find((transaction) => transaction.id == data.id);
  }

  getTransactionFromBlocks(transactionId) {
    return this.blocks
      .map((block) =>
        block.transactions.find(
          (transaction) => transaction.id == transactionId,
        ),
      )
      .filter((item) => item);
  }

  addBlock(block, emit = true) {
    if (this.checkBlock(block, this.getLastBlock())) {
      this.blocks.push(block);
      this.blocksDB.write(this.blocks);
    }
    console.info(`Block added: ${block.hash}`);
    console.debug(`Block added: ${JSON.stringify(block)}`);
    if (emit) EmitterService.getEmitter().emit('blockAdded', block);
    return block;
  }

  checkChain(blocks: Block[]) {
    if (JSON.stringify(blocks[0]) !== JSON.stringify(Block.genesis)) {
      throw new BlockAssertionError('First element of the chain is invalid');
    }
    for (let i = 1; i < blocks.length - 1; i++) {
      this.checkBlock(blocks[i], blocks[i - 1], blocks);
    }
    return true;
  }

  checkBlock(newBlock: Block, oldblock: Block, blocks: Block[] = this.blocks) {
    const blockHash = Block.toHash(newBlock);
    if (oldblock.index + 1 != newBlock.index) {
      throw new BlockchainAssertionError(
        `Index not proper for ${oldblock.index} and ${newBlock.index}`,
      );
    }
    if (newBlock.previousHash != oldblock.hash) {
      throw new BlockchainAssertionError('Invalid Hash');
    }

    if (newBlock.hash != blockHash) {
      throw new BlockchainAssertionError('Hash not proper');
    }
    if (
      Block.getDifficulty(newBlock.hash) >=
      this.getDifficulty(newBlock.index)
    ) {
      throw new BlockchainAssertionError('Invalid proof-of-work');
    }

    newBlock.transactions.map((transact: Transaction) =>
      this.checkTransactions(Transaction.organizeJsonArray(transact), blocks),
    );

    let sumofOutputTransactions = 0;
    let sumofInputTransactions = 0;

    newBlock.transactions.map((transaction) => {
      transaction.data.outputs.map(
        (output) => (sumofOutputTransactions += output.amount || 0),
      );
      transaction.data.inputs.map(
        (input) => (sumofInputTransactions += input.amount || 0),
      );
    });
    sumofInputTransactions += Config.MINING_REWARD;
    const isInputsAmountGreaterOrEqualThanOutputsAmount =
      sumofInputTransactions >= sumofOutputTransactions;
    if (!isInputsAmountGreaterOrEqualThanOutputsAmount)
      throw new BlockchainAssertionError('Invalid block balance');

    const transactionsList = lodash
      .flatten(
        newBlock.transactions.map((trans) =>
          trans.data.inputs.length > 0 ? trans.data.inputs : [],
        ),
      )
      .map((dat) => `${dat.transaction} | ${dat.index}`);
    const doublespendsList = lodash.forOwn(
      lodash.countBy(transactionsList),
      (value, key) => (value >= 2 ? key : null),
    );
    if (doublespendsList.length > 0)
      throw new BlockAssertionError(
        'There are unspent output transactions being used more than once',
      );

    const type = lodash.countBy(newBlock.transactions.map((x) => x.type));

    if (type.fee && type.fee > 1)
      throw new TransactionAssertionError(
        "Invalid fee transaction count: expected '1'",
      );
    if (type.reward && type.reward > 1)
      throw new TransactionAssertionError(
        "Invalid reward transaction count: expected '1'",
      );
    return true;
  }

  checkTransactions(transaction: Transaction, referenceBlocks = this.blocks) {
    transaction.check();
    const IsNotAlreadyPresent = referenceBlocks.map((block) => {
      return (
        block.transactions.find(
          (transaction) => transaction.id == block.transactions.id,
        ) == undefined
      );
    });

    if (!IsNotAlreadyPresent) {
      throw new TransactionAssertionError(
        `Transaction '${transaction.id}' is already in the blockchain`,
      );
    }
    let IsNotSpent = true;
    const listoftransactions = [];

    referenceBlocks.map((block) => {
      block.transactions.map((transact) => {
        if (transact.data.inputs.length > 0)
          listoftransactions.push(...transact.data.inputs);
      });
    });

    transaction.data.inputs.map((transaction) => {
      IsNotSpent =
        IsNotSpent &&
        !listoftransactions.find(
          (data) =>
            data.transaction == transaction.transaction &&
            data.index == transaction.index,
        );
    });

    if (!IsNotSpent) {
      //throw new TransactionAssertionError(`Input transaction spent`);
    }
    return true;
  }

  getDifficulty(index) {
    return Config.pow.getDifficulty(this.blocks, index);
  }

  setBlocks(blocks: Blocks) {
    this.blocks = blocks;
  }

  mapper(transactions: Transaction[], address: string, txinput, txoutput) {
    transactions.map((transaction: Transaction) => {
      let index = 0;
      transaction.data.outputs.map((output: any) => {
        if (address && output.address == address)
          txoutput.push({
            index,
            address: output.address,
            amount: output.amount,
            transaction: transaction.id,
          });
        index++;
      });

      transaction.data.inputs.map((input: any) => {
        if (address && input.address != address) return;
        txinput.push({
          index: input.index,
          address: input.address,
          amount: input.amount,
          transaction: input.transaction,
        });
      });
    });
  }
  getUnspentTransactionsForAddress(address) {
    const txinput = [];
    const txoutput = [];

    this.blocks.map((block) =>
      this.mapper(block.transactions, address, txinput, txoutput),
    );
    this.mapper(this.transactions, address, txinput, txoutput);

    const unspentTransaction = [];
    txoutput.map((output) => {
      if (
        !txinput.find(
          (input) =>
            input.index == output.index &&
            input.transaction == output.transaction,
        )
      )
        unspentTransaction.push(output);
    });
    return unspentTransaction;
  }

  addTransaction(transaction: Transaction, emit = true) {
    if (this.checkTransactions(transaction)) {
      this.transactions.push(transaction);
      this.writeTransactions();
      console.info(`Transaction added: ${transaction.id}`);

      if (emit) EmitterService.getEmitter().emit('transactionAdded', transaction);

      return transaction;
    }
  }

  async writeTransactions() {
    await this.transactionsDB.write(this.transactions);
  }

  getAllBlocks() {
    return this.blocks;
  }
}
