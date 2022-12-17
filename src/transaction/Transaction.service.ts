import { Injectable } from '@nestjs/common';
import { Connection } from '../connection';
import { DB } from '../util/DB';
import Transactions from '../transaction/Transactions';
import { EventEmitter } from 'events';

@Injectable()
export class TransactionService {
  dbName: string;
  private emitter= new  EventEmitter();

  initializeBlockDB() {
      this.dbName = Connection.name;
      return new DB('./src/data/' + this.dbName + '/transactions.json', new Transactions());
  }

}
