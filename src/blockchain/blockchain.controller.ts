import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import Blocks from './Blocks';
import { BlockchainService } from './blockchain.service';
import Transactions from '../transaction/Transactions';
import { Block } from '../util/Block';
import { ApiTags } from '@nestjs/swagger';
import { EmitterService } from '../services/emitter.service';
import { NodeController } from '../node/node.controller';
import { HttpService } from '@nestjs/axios';
import { BlockchainAssertionError } from './blockchainAssertionError';
import { Transaction } from "../util/Transaction";
import { TransactionAssertionError } from "../transaction/TransactionAssertionError";

@Controller('blockchain')
@ApiTags('blockchain')
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
  }

  async init() {
    this.blocks = await this.blocksDB.read(Blocks);
    this.transactions = await this.transactionsDB.read(Transactions);
    if (this.blocks.length == 0) {
      this.blocks.push(Block.genesis);
      try{
        await this.blocksDB.write(this.blocks);
      } catch (e){console.log(e)}
    }
    this.blocks.map((block) => this.removeTransactionsFromTransaction(block));
    this.blockchainService.blocks = this.blocks;
    this.emitter = EmitterService.getEmitter();
  }

  replaceChain(newBlockChain) {
    return this.blockchainService.replaceChain(newBlockChain, this.blocks);
  }

  checkChain() {
    this.blockchainService.checkChain(this.blocks);
  }

  @Get()
  getAllBlocks() {
    return this.blocks;
  }

  @Get('blocks')
  getAllBlocksinchain() {
    return this.blocks;
  }

  @Get('blocks/:hash([a-zA-Z0-9]{64})')
  getBlockByHash(@Param('hash') hash) {
    return this.blocks.find((block) => block.hash == hash);
  }

  @Get('blocks/latest')
  getLastBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  @Put('blocks/latest')
  updateLastBlock(@Body() body) {
    if(body.timestamp2)body.timestamp = body.timestamp2;
    const block = Block.organizeJsonArray(body);
    const result = new NodeController(
      this.blockchainService,
      new HttpService(),
    ).checkReceivedBlock(block);
    if (!result) throw new BlockchainAssertionError('Blockchain is update.');
    return block;
  }

  @Get('blocks/:index')
  getBlockByIndex(@Param('index') index) {
    return this.blocks.find((block) => block.index == Number(index));
  }

  @Get('transactions')
  getAllTransactions() {console.log("getting transcations")
    return this.transactions;
  }

  @Get('transactions/unspent')
  getUnspentTransactionsForAddress(address, @Req() req) {
    const txinput = [];
    const txoutput = [];
    if (!address) address = req.query.address;
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
        //console.log("txoutput",txoutput)

        transaction.data.inputs.map((input) => {
          if (address && input.address != address) return;
          txinput.push({
            index: input.index,
            address: input.address,
            amount: input.amount,
            transaction: input.transaction,
          });
        });
        // console.log("txinput",txinput)
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

  @Post('transactions')
  getTransactionById(@Body() data) {
    const transactionReq = Transaction.organizeJsonArray(data)
    const transactionFound = this.transactions.find((transaction) => transaction.id == data.id);
    if (transactionFound != null) throw new TransactionAssertionError(`Transaction '${data.id}' already exists`);
    this.blockchainService.addTransaction(
      Transaction.organizeJsonArray(transactionReq),false
    );
  }

  @Get('transactions/:id([a-zA-Z0-9]{64})')
  getTransactionFromBlocks(@Param('id') transactionId) {
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
