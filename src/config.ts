export const Config = {
  MINING_REWARD: 5000000,
  FEE_PER_TRANSACTION: 1,
  TRANSACTIONS_PER_BLOCK: 2,
  genesisBlock: {
    index: 0,
    previousHash: '0',
    timestamp: 1465154705,
    nonce: 0,
    transactions: [
      {
        id: '63ec3ac02f822450039df13ddf7c3c0f19bab4acd4dc928c62fcd78d5ebc6dba',
        hash: 'c0f236ff133f5edbdeb0dc25e72338ee45a24fb0443edbe309b2738f0d49fcd5',
        type: 'regular',
        data: {
          inputs: [],
          outputs: [],
        },
      },
    ],
    hash: '2e2bb570cc7d1220ae9caf03d4c351877e49e33629eb51deea26a5f740dfae9e',
  },
  pow: {
    getDifficulty(blocks, index?) {
      const BASE_DIFFICULTY = Number.MAX_SAFE_INTEGER;
      const EVERY_X_BLOCKS = 5;
      const POW_CURVE = 5;

      return Math.max(
        Math.floor(
          BASE_DIFFICULTY /
            Math.pow(
              Math.floor(((index || blocks.length) + 1) / EVERY_X_BLOCKS) + 1,
              POW_CURVE,
            ),
        ),
        0,
      );
    },
  },
};
