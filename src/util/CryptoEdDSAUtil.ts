import * as Crypto from 'crypto';
import * as elliptic from 'elliptic';
import CryptoUtil from "./CryptoUtil";
const EdDSA = elliptic.eddsa;
const ec = new EdDSA('ed25519');
const SALT = '0ffaa74d206930aaece253f090c88dbe6685b9e66ec49ad988d84fd7dff230d1';

export default class CryptoEdDSAUtil {

  static toHex(data) {
    return elliptic.utils.toHex(data);
  }

  static signHash(keyPair, messageHash) {
    return keyPair.sign(messageHash).toHex().toLowerCase();
  }

  static generateSecret(password) {
    return Crypto.pbkdf2Sync(password, SALT, 10000, 512, 'sha256').toString(
      'hex',
    );
  }

  static generateKeyPairFromSecret(secret) {
    return ec.keyFromSecret(secret);
  }

  static verifySignature(publicKey, signature, messageHash) {
    const key = ec.keyFromPublic(publicKey, 'hex');
    const verified = key.verify(messageHash, signature);
    console.debug(`Verified: ${verified}`);
    return verified;

  }

  static getKey(key) {
  }
}
