import CryptoEdDSAUtil from './CryptoEdDSAUtil';
import CryptoUtil from './CryptoUtil';
import { KeyPair } from './KeyPair';
import KeyPairs from "../operator/KeyPairs";

export class Wallet {
  id: string;
  passwordHash: string;
  secret: string;
  keyPairs: KeyPair[];

  constructor() {
    this.id = null;
    this.passwordHash = null;
    this.secret = null;
    this.keyPairs = [];
  }

  generateAddress() {
    if (this.secret == null) {
      this.generateSecret();
    }
    // more
    const lastPair = this.keyPairs[this.keyPairs.length - 1];

    // Generate next seed based on the first secret or a new secret from the last key pair.
    const seed = lastPair == null? this.secret : CryptoEdDSAUtil.generateSecret(lastPair.secretKey) || null;
    const keyPairRow = CryptoEdDSAUtil.generateKeyPairFromSecret(seed);
    const keyPairVar = {
      index: this.keyPairs.length + 1,
      secretKey: CryptoEdDSAUtil.toHex(keyPairRow.getSecret()),
      publicKey: CryptoEdDSAUtil.toHex(keyPairRow.getPublic()),
    };
    this.keyPairs.push(keyPairVar);
    return keyPairVar.publicKey;
  }

  generateSecret() {
    this.secret = CryptoEdDSAUtil.generateSecret(this.passwordHash);
    return this.secret;
  }

  static fromJson(data) {
    const wallet = new Wallet();
    data.map((key, value) => {
      return (wallet[key] = value);
    });
    return wallet;
  }

  getAddressByIndex(index) {
    const keyPair = this.keyPairs.find((keypair) => keypair.index == index);
    return keyPair ? keyPair.publicKey : null;
  }

  getAddressByPublicKey(publicKey) {
    const keyPair = this.keyPairs.find((keypair) => keypair.index == publicKey);
    return keyPair ? keyPair.publicKey : null;
  }

  getSecretKeyByAddress(publicKey) {
    const keyPair = this.keyPairs.find((keypair) => keypair.publicKey == publicKey);
    return keyPair ? keyPair.secretKey : null;
  }

  getAddresses() {
    return this.keyPairs.map((keypair) => keypair.publicKey);
  }

  static fromHash(hash) {
    const wallet = new Wallet();
    wallet.passwordHash = hash;
    wallet.id = CryptoUtil.randomId();
    return wallet.id;
  }

  static organizeJsonArray(wallet) {
    const data = new Wallet();
    const keys = Object.keys(wallet);
    keys.forEach((key) => {
      if (key == 'keyPairs' && wallet[key]) {
        data[key] = KeyPairs.fromJsonArray(wallet[key]);
      } else {
        data[key] = wallet[key];
      }
    });
    return data;
  }
}
