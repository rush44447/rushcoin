import { Controller } from '@nestjs/common';
import CryptoUtil from '../util/CryptoUtil';
import { Transaction } from '../util/Transaction';
import { Argumenterror } from '../operator/argumenterror';
import CryptoEdDSAUtil from '../util/CryptoEdDSAUtil';
import { Config } from '../config';

@Controller('transaction')
export class TransactionController {
  id: string;
  hash: string;
  type: string;
  data: any;

  constructor(id: string, hash: string, type: string, data: any) {
    this.id = id;
    this.hash = hash;
    this.type = type;
    this.data = data;
  }

  toHash() {
    return CryptoUtil.hash(this.id + this.type + JSON.stringify(this.data));
  }

  static fromJson(data) {
    const transaction = new Transaction();
    data.map((key, value) => {
      return (transaction[key] = value);
    });
    transaction.hash = transaction.toHash();
    return transaction;
  }

  check() {
    const checkHash = (this.hash = this.toHash());
    if (!checkHash) throw new Argumenterror('Hash Not Correct');

    this.data.inputs.map((inHash) => {
      const hash = {
        transaction: inHash.transaction,
        amount: inHash.amount,
        address: inHash.address,
      };
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
        if (output.amount < 0) negativeOutput--;
      });

      const isInputsAmountGreaterOrEqualThanOutputsAmount =
        inputTransaction >= outputTransaction;
      if (!isInputsAmountGreaterOrEqualThanOutputsAmount)
        throw new Argumenterror('Invalid Transaction Balance');

      const isEngoughFee =
        inputTransaction - outputTransaction >= Config.FEE_PER_TRANSACTION;

      if (!isEngoughFee) throw new Argumenterror('Not Enough fee');
      if (!negativeOutput) throw new Argumenterror('Negative Outputs found');
    }

    return true;
  }
}
