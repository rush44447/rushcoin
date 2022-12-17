import CryptoUtil from './CryptoUtil';

export class Transaction {
  id: string;
  hash: string;
  type: string;
  data: { inputs: []; outputs: [] };

  static organizeJsonArray(data) {
    const transactions = new Transaction();
    const keys = Object.keys(data);
    keys.map((key) => {
      if (key == 'data' && data[key]) {
        transactions[key] = {
          inputs: data[key].inputs,
          outputs: data[key].outputs,
        };
      } else {
        transactions[key] = data[key];
      }
    });
    return transactions;
  }

  toHash() {
    return CryptoUtil.hash(this.id + this.type + JSON.stringify(this.data));
  }
}
