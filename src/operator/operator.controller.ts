import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DB } from '../util/DB';
import { Wallet } from '../util/Wallet';
import { Argumenterror } from './argumenterror';
import Wallets from './Wallets';
import { BlockchainService } from '../blockchain/blockchain.service';
import { TransactionBuilder } from './TransactionBuilder';
import { Config } from '../config';
import { Transaction } from '../util/Transaction';
import CryptoUtil from '../util/CryptoUtil';

@Controller('operator')
export class OperatorController {
  private walletDB: DB;
  wallets: Wallet[];

  constructor(
    private walletService: WalletService,
    private blockchainService: BlockchainService,
  ) {
    this.walletDB = this.walletService.initializeWalletDB();
    this.init();
  }

  async init() {
    this.wallets = await this.walletDB.read(Wallets);
  }

  @Get('wallets')
  getWallets() {
    return this.wallets;
  }

  @Get('wallets/:walletId([a-zA-Z0-9]{64})')
  getWalletById(@Param('walletId') id) {
    return this.wallets.find((wallet: Wallet) => wallet.id == id);
  }

  private async addWallet(wallet: Wallet) {
    this.wallets.push(wallet);
    await this.walletDB.write(this.wallets);
    return this.wallets.length != 0 ? await this.walletDB.read(Wallets) : [];
  }

  @Post('wallets')
  createWalletFromPassword(@Body() data) {
    const wallet = this.walletService.fromPassword(data.password);
    return this.addWallet(Wallet.organizeJsonArray(wallet));
  }

  checkWalletPassword(walletId, req) {
    const wall = this.wallets.find((wallet: Wallet) => wallet.id == walletId);
    if (!wall) throw new Argumenterror('Wallet Not Found');
    return wall.passwordHash == CryptoUtil.hash(req.headers.password);
  }

  @Get('wallets/:walletId/addresses')
  getAddressesForWallet(@Param('walletId') walletId) {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');
    return wallet.getAddresses();
  }

  @Post('wallets/:walletId/addresses')
  generateAddressForWallet(@Param('walletId') walletId, @Req() req) {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');
    if (!this.checkWalletPassword(walletId, req))
      throw new Argumenterror('Invalid Wallet Password');
    const address = wallet.generateAddress();
    this.walletDB.write(this.wallets);
    return address;
  }

  @Get('/:addressId/balance')
  getBalanceForAddress(@Param('addressId') addressid) {
    const utxo =
      this.blockchainService.getUnspentTransactionsForAddress(addressid);

    if (utxo == null || utxo.length == 0)
      throw new Argumenterror('No transaction found for this addressid');
    let sum = 0;
    utxo.map((obj) => (sum += obj.amount));
    return sum;
  }

  @Post('wallets/:walletId/transactions')
  makeaTransaction(@Body() data, @Param('walletId') walletId: string) {
    const newtransaction = this.createTransaction(
      walletId,
      data.fromAddress,
      data.toAddress,
      data.amount,
      data.changeId || data.fromAddress,
    );
    newtransaction.check();

    this.blockchainService.addTransaction(
      Transaction.organizeJsonArray(newtransaction),
    );
  }

  createTransaction(
    walletId,
    fromAddressId,
    toAddressId,
    amount,
    changeAddressId,
  ): Transaction {
     const utxo =
      this.blockchainService.getUnspentTransactionsForAddress(fromAddressId);

    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');

    const secretKey = wallet.getSecretKeyByAddress(fromAddressId);
    if (!secretKey)
      throw new Argumenterror('Secret Key Not linked to any wallet');

    const tx = new TransactionBuilder();
    tx.from(utxo);
    tx.to(toAddressId, amount);
    tx.change(changeAddressId || fromAddressId);
    tx.fee(Config.FEE_PER_TRANSACTION);
    tx.sign(secretKey);
    return Transaction.organizeJsonArray(tx.build());
  }
}
