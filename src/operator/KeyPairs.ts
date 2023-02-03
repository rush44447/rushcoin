import { KeyPair } from '../util/KeyPair';

export default class KeyPairs extends Array {
  static fromJsonArray(data) {
    const keypair = new KeyPairs();

    if (Array.isArray(data))
      data.map((obj) => {
        keypair.push(KeyPair.organizeJsonArray(obj));
      });
    return keypair;
  }
}
