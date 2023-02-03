export class KeyPair {
  index: number;
  secretKey: string;
  publicKey: string;

  static organizeJsonArray(data) {
    if (
      data.hasOwnProperty('index') &&
      data.hasOwnProperty('secretKey') &&
      data.hasOwnProperty('publicKey')
    )
      return data;
    return null;
  }
}
