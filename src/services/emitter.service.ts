import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class EmitterService {
  private static emitter: any;

  static getEmitter() {
    if (!this.emitter) this.emitter = new EventEmitter();
    return this.emitter;
  }
}
