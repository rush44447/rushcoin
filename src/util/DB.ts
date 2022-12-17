import * as fs from 'fs';
import * as path from 'path';
import { BlockAssertionError } from '../blockchain/blockAssertionError';

export class DB {
  filePath: string;
  defaultData: any;
  constructor(filePath, defaultData) {
    this.filePath = filePath;
    this.defaultData = defaultData;
  }

  write(data) {
    if (!fs.existsSync(path.dirname(this.filePath))) throw BlockAssertionError;
    fs.writeFileSync(this.filePath, JSON.stringify(data));
  }

  async read(prototype) {
    if (!fs.existsSync(this.filePath)) return this.defaultData;
    const fileContent = JSON.parse(fs.readFileSync(this.filePath).toString());
    if (fileContent.length == 0) return this.defaultData;
    return prototype ? prototype.fromJsonArray(fileContent) : fileContent;
  }
}
