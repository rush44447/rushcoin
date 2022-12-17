import { Controller } from '@nestjs/common';
import Blocks from './Blocks';
import { BlockchainService } from './blockchain.service';
import Transactions from '../transaction/Transactions';
import { EventEmitter } from 'events';
import { Block } from '../util/Block';
import { dummy } from '../dummy';
import { TransactionController } from '../transaction/Transaction.controller';

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
    const transactionController = new TransactionController(
      'd35a24d076aa278bce3d71357ea5349444ce9627697b5ca078d03a4754ce4258',
      '2687d4a106e3f8fe70acac78c3b3a16a1e439cae7e78332a4e2bfd00eeb82f78',
      'regular',
      {
        inputs: [
          {
            transaction:
              '60a6fbdfa1d3ad139bde40665360d25aa01f027e46d99e9c2297b7f1c7d2eeb5',
            index: 0,
            amount: 5000000000,
            address:
              '4d40ae9157135f54f1ff7ae9ab4699dadbf59224e1d7f553476a530bea76e66d',
            signature:
              '10048b40561e9861022409e285029aa1d7cfc80778038febd09351de3ab023332c0c18ef8d7ce18e572f77bfa4f045205d7e83a872afc67316024d493cfd7205',
          },
        ],
        outputs: [
          {
            amount: 1000,
            address:
              '861d61389c3bdd9207a80fef57928c88cd6c7c7b73bc1e72fce8cbd844ecb921',
          },
          {
            amount: 4999998999,
            address:
              '861d61389c3bdd9207a80fef57928c88cd6c7c7b73bc1e72fce8cbd844ecb921',
          },
        ],
      },
    );
    transactionController.check();
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
    this.replaceChain(dummy);
  }

  replaceChain(newBlockChain) {
    const newChain = this.blockchainService.replaceChain(
      newBlockChain,
      this.blocks,
    );
    if (newChain) {
      this.blocks = newChain;
      this.blocksDB.write(this.blocks);
    }
  }

  checkChain() {
    this.blockchainService.checkChain(this.blocks);
  }

  getAllBlocks() {
    return this.blocks;
  }

  getLastBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  getBlockByIndex(index) {
    return this.blocks[index];
  }

  getBlockByHash(hash) {
    return this.blocks.find((block) => block.hash == hash);
  }

  getAllTransactions() {
    return JSON.stringify(this.transactions);
  }

  static getUnspentTransactionsForAddress(address) {
    // const outputtransactions = this.transactions.map((transaction)=>{
    //   let sum = 0;
    //   // transaction.data.inputs.map((input)=> {
    //   //   if(input.address == address)sum+=input.amount else sum+=0;
    //   // })
    //   transaction.data.outputs.map((output)=>{
    //     sum+=output.amount;
    //   })
    // })
  }

  getDifficulty(index) {
    return this.blockchainService.getDifficulty(this.blocks, index);
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
}
