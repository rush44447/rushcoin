import { Controller } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DB } from '../util/DB';
import { Wallet } from '../util/Wallet';
import { Argumenterror } from './argumenterror';
import Wallets from "./Wallets";
import { BlockchainController } from "../blockchain/blockchain.controller";

@Controller('operator')
export class OperatorController {
  private walletDB: DB;
  wallets: Wallet[];

  constructor(private walletService: WalletService) {
    this.walletDB = this.walletService.initializeWalletDB();
    this.init();
  }

  async init() {
    this.wallets = await this.walletDB.read(Wallets);
    console.log(this.generateAddressForWallet("d0c73d5e5b6bf5f4f0c6ce4d66b48e0c8892fbcd55ee40b560989b5969b28734"))
  }

  getWallets() {
    return this.wallets;
  }

  getWalletById(id) {
    const wallet = this.wallets.find((wallet: Wallet) => wallet.id == id)
    return this.wallets.find((wallet: Wallet) => wallet.id == id);
  }

  private addWallet(wallet: Wallet) {
    this.wallets.push(wallet);
    if(this.wallets.length!=0)
    return this.walletDB.write(this.wallets);
    return []
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
    return wallet.generateAddress();
  }

  generateAddressForWallet(walletId) {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Argumenterror('Wallet Not Found');
    wallet.generateAddress();
    const address = wallet.generateAddress();
    this.walletDB.write(this.wallets);
    return address;
  }

  getBalanceForAddress(walletId) {

  }

  createTransaction(
    walletId,
    fromAddressId,
    toAddressId,
    amount,
    changeAddressId,
  ) {
      let utxo = BlockchainController.getUnspentTransactionsForAddress(fromAddressId);
  }
}
