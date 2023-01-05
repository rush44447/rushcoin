import { Transaction } from '../util/Transaction';

export default class Transactions extends Array {
  static fromJsonArray(data) {
    const transaction = new Transactions();

    if (Array.isArray(data))
      data.map((obj) => {
        transaction.push(Transaction.organizeJsonArray(obj));
      });
    return transaction;
  }
}
