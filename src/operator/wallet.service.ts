import { Injectable } from '@nestjs/common';
import { DB } from '../util/DB';
import Wallets from './Wallets';
import { Wallet } from '../util/Wallet';
import CryptoUtil from '../util/CryptoUtil';
import { Connection } from "../util/connection";

@Injectable()
export class WalletService {
   initializeWalletDB() {
    return new DB('./src/data/' + Connection().name + '/wallets.json', new Wallets());
  }

  fromPassword(password: string) {
    const wallet = new Wallet();
    wallet.passwordHash = CryptoUtil.hash(password);
    wallet.id = CryptoUtil.randomId();
    return wallet;
  }
}
