import CryptoUtil from './CryptoUtil';
import { Argumenterror } from '../operator/argumenterror';
import CryptoEdDSAUtil from './CryptoEdDSAUtil';
import { Config } from '../config';

export class Transaction {
  id: string;
  hash: string;
  type: string;
  data: any;

  constructor() {
    this.id = null;
    this.hash = null;
    this.type = null;
    this.data = {
      inputs: [],
      outputs: [],
    };
  }

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
    transactions.hash = transactions.toHash();
    return transactions;
  }

  toHash() {
    return CryptoUtil.hash(this.id + this.type + JSON.stringify(this.data));
  }

  check() {
    const checkHash = (this.hash == this.toHash());
    if (!checkHash) throw new Argumenterror('Hash Not Correct');

    this.data.inputs.map((inHash) => {
      const hash = CryptoUtil.hash({
        transaction: inHash.transaction,
        index: inHash.index,
        address: inHash.address,
      });

      const validTransaction = CryptoEdDSAUtil.verifySignature(
        inHash.address,
        inHash.signature,
        hash,
      );
      if (!validTransaction) throw new Argumenterror('Trasanction Not Correct');
    });

    if (this.type == 'regular') {
      let inputTransaction = 0;
      this.data.inputs.map((input) => {
        inputTransaction += input.amount;
      });
      let negativeOutput = 0;

      let outputTransaction = 0;
      this.data.outputs.map((output) => {
        outputTransaction += output.amount;
        if (output.amount < 0) negativeOutput++;
      });

      const isInputsAmountGreaterOrEqualThanOutputsAmount =
        inputTransaction >= outputTransaction;
      if (!isInputsAmountGreaterOrEqualThanOutputsAmount)
        throw new Argumenterror('Invalid Transaction Balance');

      const isEngoughFee =
        (inputTransaction - outputTransaction) >= Config.FEE_PER_TRANSACTION;

      if (!isEngoughFee) throw new Argumenterror('Not Enough fee');
      if (negativeOutput > 0) throw new Argumenterror('Negative Outputs found');
    }

    return true;
  }
}
