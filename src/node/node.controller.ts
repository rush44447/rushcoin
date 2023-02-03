import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { catchError, map } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { EmitterService } from '../services/emitter.service';
import * as lodash from 'lodash';
import { Block } from '../util/Block';
import { Connection } from "../util/connection";
import Transactions from "../transaction/Transactions";
import Blocks from "../blockchain/Blocks";

@Controller('node')
export class NodeController {
  host: string;
  port: string;
  peers = [];
  private blockchain: any;

  constructor(
    private blockchainService: BlockchainService,
    private httpService: HttpService,
  ) {
    this.host = Connection().host;
    this.port = String(Connection().port);
    this.peers = [];
    this.hookBlockchain();
    this.connectToPeers(Connection().peers);
    // this.sendLatestBlock('http://localhost:3001', {
    //   index: 6,
    //   nonce: 351,
    //   previousHash:
    //     '00522e6b0014bc505e8c93aabe4623b9c06e27ae0ed83001bac9ca179181d47f',
    //   timestamp: 1673065975.604,
    //   transactions: [
    //     {
    //       id: 'd2bca73325f565ee96d98b7eb90a1bf5a50722b06248f02bcb5329f874636e75',
    //       hash: 'f480fcbb690a386b90d655d483b56b577de5a805d6fb08974103f497242d1fa1',
    //       type: 'regular',
    //       data: {
    //         inputs: [
    //           {
    //             transaction:
    //               '98ff20cba55784e630e8d2cd7c7cec257c60687cd693c8835eed0397f53a0271',
    //             index: 1,
    //             amount: 9999979898,
    //             address:
    //               '97f2e4f9aeb77cb793c1dd1ed98d0b16987a4fdb8b17a3f03b6299df00f68582',
    //             signature:
    //               '8755fbc9ee1949484c4026f2d7da82c320ba2753636e772e10d3bc02f9c8a3f726f495cc21c4c81b3715f02f691daa4f7af3e29c729c538727bba0ed22426f08',
    //           },
    //         ],
    //         outputs: [
    //           {
    //             amount: 10,
    //             address:
    //               '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
    //           },
    //           {
    //             amount: 9999979887,
    //             address:
    //               '97f2e4f9aeb77cb793c1dd1ed98d0b16987a4fdb8b17a3f03b6299df00f68582',
    //           },
    //         ],
    //       },
    //     },
    //     {
    //       id: '1d9268522c9a164abf9cfe354275c911100c81959cbbc35b7ec8edb32f4ed25b',
    //       hash: 'f3032250e80d5bd09694d14951b6d2eb89070f247b001d1928af554060aa9043',
    //       type: 'fee',
    //       data: {
    //         inputs: [],
    //         outputs: [
    //           {
    //             amount: 1,
    //             address:
    //               '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
    //           },
    //         ],
    //       },
    //     },
    //     {
    //       id: 'abbb5786cc07b8a0cb7cea53c1ac60de41ff109ce8b59d3697c0ae25f0f66d49',
    //       hash: '265731c72b123fec2de09f4e7925f71341d3e2fa079d7f158311665b3d2378bc',
    //       type: 'reward',
    //       data: {
    //         inputs: [],
    //         outputs: [
    //           {
    //             amount: 5000000000,
    //             address:
    //               '56c3455f6d9654d478f9bce4867da9b8e4cd57a57d2e4a3da8a711bd448a27a6',
    //           },
    //         ],
    //       },
    //     },
    //   ],
    //   hash: '00cc6f2c3c0114fec3d3f499640b061575a0de174ca745559517497b881d00b9',
    // });
  }

  hookBlockchain() {
    EmitterService.getEmitter().on('blockAdded', (block) => {
      this.broadcast(this.sendLatestBlock, block);
    });
    EmitterService.getEmitter().on('transactionAdded', (transact) => {
      this.broadcast(this.sendTransaction, transact);
    });
    EmitterService.getEmitter().on('blockchainReplaced', (blocks) => {
      this.broadcast(this.sendLatestBlock, blocks[blocks.length - 1]);
    });
  }

  @Post('peers')
  connectToPeer(@Body() body) {
    this.connectToPeers([body]);
    return body;
  }

  connectToPeers(newPeers) {
    // Connect to every peer
    const me = `http://${this.host}:${this.port}`;
    newPeers.forEach((peer) => {
      // If it already has that peer, ignore.
      if (
        !this.peers.find((element) => {
          return element.url == peer.url;
        }) &&
        peer.url != me
      ) {
        this.sendPeer(peer, { url: me });
        console.info(`Peer ${peer.url} added to connections.`);
        this.peers.push(peer);
        this.initConnection(peer);
     //   this.broadcast(this.sendPeer, peer);
      } else {
        console.info(
          `Peer ${peer.url} not added to connections, because I already have.`,
        );
      }
    }, this);
  }

  initConnection(peer) {
    // It initially gets the latest block and all pending transactions
    this.getLatestBlock(peer);
    this.getTransactions(peer);
  }

  sendPeer(peer, peerToSend) {
    const URL = `${peer.url}/node/peers`;
    console.info(`Sending ${peerToSend.url} to peer ${URL}.`);
    return this.httpService.post(URL, peerToSend).pipe(
      map((response) => response.data),
      catchError((e) => {
        console.warn(`Unable to send me to peer ${URL}: ${e.message}`);
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  getLatestBlock(peer) {
    const self = this;
    const URL = `${peer.url}/blockchain/blocks/latest`;
    console.info(`Geting latest block from: ${URL}`);
    return this.httpService.get(URL).pipe(
      map((response) => self.checkReceivedBlock(Block.organizeJsonArray(response.data))),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  sendLatestBlock(peer, block) {
    const URL = `${peer.url}/blockchain/blocks/latest`;
    console.info(`Posting latest block to: ${URL}`,block);
    return this.httpService.put(URL, block).pipe(
      map((response) => response.data),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  getBlocks(peer) {
    const self = this;
    const URL = `${peer.url}/blockchain/blocks`;
    console.info(`Geting blocks from: ${URL}`);
    return this.httpService.get(URL).pipe(
      map((response) =>self.checkReceivedBlocks(Blocks.fromJsonArray(response.data))),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  sendTransaction(peer, transaction) {
    const URL = `${peer.url}/blockchain/transactions`;
    console.info(`Posting transactions to: ${URL}`);
    return this.httpService.post(URL, transaction).pipe(
      map((response) => response.data),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  getTransactions(peer) {
    const self = this;
    const URL = `${peer.url}/blockchain/transactions`;
    console.info(`Geting transactions from: ${URL}`);
    return this.httpService.get(URL).pipe(
      map((response) =>
        self.syncTransactions(Transactions.fromJsonArray(response.data)),
      ),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  getConfirmation(peer, transactionId) {
    const URL = `${peer.url}/blockchain/transactions/${transactionId}`;
    console.info(`Checking transactions from: ${URL}`);
    return this.httpService.get(URL).pipe(
      map((response) => true),
      catchError((e) => {
        throw new HttpException(e.response.data, e.response.status);
      }),
    ).toPromise();
  }

  @Get('peers')
  getPeers() {
    return this.peers;
  }

  @Get('transactions/:transactionId/confirmations')
  getConfirmations(@Param('transactionId') transactionId: string) {
    // Get from all peers if the transaction has been confirmed
    const foundLocally =
      this.blockchain.getTransactionFromBlocks(transactionId) != null;
    return Promise.all(
      this.peers.map((peer) => this.getConfirmation(peer, transactionId)),
    ).then((values) => {
      return lodash.sum([foundLocally, ...values]);
    });
  }

  syncTransactions(transactions) {
    transactions.map((transaction) => {
      const transactionFound = this.blockchainService.getTransactionById(transaction);
      if (transactionFound == null) {
        console.info(`Syncing transaction '${transaction.id}'`);
        this.blockchainService.addTransaction(transaction);
      }
    });
  }

  checkReceivedBlock(blocks) {
    return this.checkReceivedBlocks([blocks]);
  }

  checkReceivedBlocks(blocks) {
    const receivedBlocks = blocks.sort((b1, b2) => b1.index - b2.index);
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = this.blockchainService.getLastBlock();
    if (latestBlockReceived.index <= latestBlockHeld.index) {
      console.info(
        'Received blockchain is not longer than blockchain. Do nothing',
      );
      return false;
    }
    console.info(
      `Blockchain possibly behind. We got: ${latestBlockHeld.index}, Peer got: ${latestBlockReceived.index}`,
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      // We can append the received block to our chain
      console.info('Appending received block to our chain');
     this.blockchainService.addBlock(latestBlockReceived);
      return true;
    } else if (receivedBlocks.length === 1) {
      // We have to query the chain from our peer
      console.info('Querying chain from our peers');
     this.broadcast(this.getBlocks);
      return null;
    } else {
      // Received blockchain is longer than current blockchain
      console.info('Received blockchain is longer than current blockchain');
     this.blockchainService.replaceChain(receivedBlocks);
      return true;
    }
  }
  broadcast(fn, ...args) {
    // Call the function for every peer connected
    console.info('Broadcasting');
    this.peers.map((peer) => {
      fn.apply(this, [peer, ...args]);
    }, this);
  }
}
