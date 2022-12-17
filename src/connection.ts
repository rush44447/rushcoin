export const Connection = {
  host: process.env.HOST || 'localhost',
  name: process.env.NAME || '1',
  port: process.env.PORT || '3001',
  peers: process.env.PEERS,
}
