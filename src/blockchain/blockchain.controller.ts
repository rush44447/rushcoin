import { Controller } from '@nestjs/common';
import Blocks from './Blocks';
import { BlockchainService } from './blockchain.service';
import Transactions from '../transaction/Transactions';
import { EventEmitter } from 'events';
import { Block } from '../util/Block';

@Controller('blockchain')
export class BlockchainController {
  blocksDB: any;
  transactionsDB: any;
  blocks: Blocks;
  transactions: Transactions;
  emitter: any;

  constructor(private blockchainService: BlockchainService) {
    this.blocksDB = this.blockchainService.initializeBlockDB();
    this.transactionsDB = this.blockchainService.initializeTransactionDB();
    this.init();
    this.emitter = new EventEmitter();
  }

  async init() {
    this.blocks = await this.blocksDB.read(Blocks);
    this.transactions = await this.transactionsDB.read(Transactions);
    if (this.blocks.length == 0) {
      this.blocks.push(Block.genesis);
      await this.blocksDB.write(this.blocks);
    }
    this.blocks.map((block) => this.removeTransactionsFromTransaction(block));
    this.blockchainService.setBlocks(this.blocks);
  }

  replaceChain(newBlockChain) {
    return this.blockchainService.replaceChain(newBlockChain, this.blocks);
  }

  checkChain() {
    this.blockchainService.checkChain(this.blocks);
  }

  getAllBlocks() {
    return this.blocks;
  }

  getBlockByIndex(index) {
    return this.blocks[index];
  }

  getBlockByHash(hash) {
    return this.blocks.find((block) => block.hash == hash);
  }

  getAllTransactions() {
    return this.transactions;
  }

  getUnspentTransactionsForAddress(address) {
    const txinput = [];
    const txoutput = [];
    this.blockchainService.blocks.map((block) => {
      block.transactions.map((transaction) => {
        let index = 0;
        transaction.data.outputs.map((output) => {
          if (address && output.address == address)
            txoutput.push({
              index,
              address: output.address,
              amount: output.amount,
              transaction: transaction.id,
            });
          index++;
        });

        transaction.data.inputs.map((input) => {
          if (address && input.address != address) return;
          txinput.push({
            index: input.index,
            address: input.address,
            amount: input.amount,
            transaction: input.transaction,
          });
        });
      });
    });

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

  getDifficulty(index) {
    return this.blockchainService.getDifficulty(index);
  }

  getTransactionById(id) {
    return this.transactions.find((transaction) => transaction.id == id);
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

  private removeTransactionsFromTransaction(block: Block) {
    const interimtransactions = this.transactions
      .map((data) =>
        block['transactions'].find((transact) => transact.id == data.id),
      )
      .filter((item) => item);
    this.transactions = this.transactions.filter(
      (transaction) =>
        !interimtransactions.find(
          (interItem) => interItem.id == transaction.id,
        ),
    );
    this.transactionsDB.write(this.transactions);
  }

  getLastBlock() {
    return this.blocks[this.blocks.length - 1];
  }
}
