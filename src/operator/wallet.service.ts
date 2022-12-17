import { Injectable } from '@nestjs/common';
import { Connection } from '../connection';
import { DB } from '../util/DB';
import Wallets from './Wallets';
import { Wallet } from '../util/Wallet';
import CryptoUtil from '../util/CryptoUtil';

@Injectable()
export class WalletService {
  dbName: string;

  initializeWalletDB() {
    this.dbName = Connection.name;
    return new DB('./src/data/' + this.dbName + '/wallets.json', new Wallets());
  }

  fromPassword(password: string) {
    const wallet = new Wallet();
    wallet.passwordHash = CryptoUtil.hash(password);
    wallet.id = CryptoUtil.randomId();
    return wallet;
  }

  generateKeyPairFromSecret() {}
}
