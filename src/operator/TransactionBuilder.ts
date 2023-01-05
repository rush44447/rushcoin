import { Argumenterror } from './argumenterror';
import CryptoUtil from '../util/CryptoUtil';
import CryptoEdDSAUtil from '../util/CryptoEdDSAUtil';
import { Transaction } from '../util/Transaction';

export class TransactionBuilder {
  amount: number;
  utxo: any;
  toAddressId: string;
  changeAddressId: string;
  type: string;
  feeamount: number;
  secretID: string;

  constructor() {
    this.utxo = null;
    this.toAddressId = null;
    this.changeAddressId = null;
    this.amount = null;
    this.feeamount = null;
    this.secretID = null;
    this.type = 'regular';
  }

  from(utxo) {
    this.utxo = utxo;
    return this;
  }

  to(toAddressId, amount) {
    this.toAddressId = toAddressId;
    this.amount = amount;
    return this;
  }

  change(change: string) {
    this.changeAddressId = change;
    return this;
  }

  sign(secretKey: string) {
    this.secretID = secretKey;
    return this;
  }

  fee(fee: number) {
    this.feeamount = fee;
    return this;
  }

  settype(type) {
    this.type = type;
  }

  build() {
    if (!this.utxo) throw new Argumenterror('Unspent Transaction is required');
    if (!this.toAddressId)
      throw new Argumenterror('Receipent address is required');
    if (!this.amount) throw new Argumenterror('Amount is required');

    let unspentamount = 0;
    this.utxo.map((transaction) => (unspentamount += transaction.amount));

    unspentamount = unspentamount - this.amount - this.feeamount; // remaining balance

    const secretId = this.secretID;
    const inputs = this.utxo.map((objutxo) => {
      objutxo.signature = CryptoEdDSAUtil.signHash(
        CryptoEdDSAUtil.generateKeyPairFromSecret(secretId),
        CryptoUtil.hash({
          transaction: objutxo.transaction,
          index: objutxo.index,
          address: objutxo.address,
        }),
      );
      return objutxo;
    });

    const outputs = [];
    outputs.push({
      amount: this.amount,
      address: this.toAddressId,
    });

    if (unspentamount > 0) {
      outputs.push({
        amount: unspentamount,
        address: this.changeAddressId,
      });
    } else {
      throw new Argumenterror('Enough balance not available in wallet');
    }

    return Transaction.organizeJsonArray({
      id: CryptoUtil.randomId(64),
      hash: null,
      type: this.type,
      data: {
        inputs: inputs,
        outputs: outputs,
      },
    });
  }
}
