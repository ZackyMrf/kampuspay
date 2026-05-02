import { Connection, clusterApiUrl } from '@solana/web3.js'

export const SOLANA_CLUSTER = 'devnet'
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER)
export const SOLANA_FAUCET_RPC_URL =
  import.meta.env.VITE_SOLANA_FAUCET_RPC_URL || SOLANA_RPC_URL

export function createSolanaConnection(endpoint = SOLANA_RPC_URL, commitment = 'confirmed') {
  return new Connection(endpoint, commitment)
}
