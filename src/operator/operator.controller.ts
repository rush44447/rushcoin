import { Controller } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DB } from '../util/DB';
import { Wallet } from '../util/Wallet';
import { Argumenterror } from './argumenterror';
import Wallets from './Wallets';
import { BlockchainService } from '../blockchain/blockchain.service';
import { TransactionBuilder } from './TransactionBuilder';
import { Config } from '../config';
import { Transaction } from '../util/Transaction';

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

  getWallets() {
    return this.wallets;
  }

  getWalletById(id) {
    return this.wallets.find((wallet: Wallet) => wallet.id == id);
  }

  private addWallet(wallet: Wallet) {
    this.wallets.push(wallet);
    if (this.wallets.length != 0) return this.walletDB.write(this.wallets);
    return [];
  }

  createWalletFromPassword(password: string) {
    const wallet = this.walletService.fromPassword(password);
    return this.addWallet(wallet);
  }

  checkWalletPassword(walletId, passwordHash) {
    const wall = this.wallets.find((wallet: Wallet) => wallet.id == walletId);
    if (!wall) throw new Argumenterror('Wallet Not Found');
    return wall.passwordHash == passwordHash;
  }

  getAddressesForWallet(walletId) {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');
    const address = wallet.generateAddress();
    this.walletDB.write(this.wallets);
    return address;
  }

  generateAddressForWallet(walletId) {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');
    wallet.generateAddress();
    const address = wallet.generateAddress();
    this.walletDB.write(this.wallets);
    return address;
  }

  getBalanceForAddress(addressid) {
    const utxo =
      this.blockchainService.getUnspentTransactionsForAddress(addressid);

    if (utxo == null || utxo.length == 0)
      throw new Argumenterror('No transaction found for this addressid');
    let sum = 0;
    utxo.map((obj) => (sum += obj.amount));
    return sum;
  }

  createTrasaction(){
    const newtransaction = this.createTransaction(
      'f5afef6a57dc54ed4c9ba8c0d49a903fee97c1f7bef8f4afe16c061da6bd0c53',
      '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
      'a1d5e72a806b77a39715ad6cd2c84c40198ae249090dd4e96d6c511ec2b5241c',
      10000,
      '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
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
