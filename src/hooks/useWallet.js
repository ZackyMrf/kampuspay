/**
 * useWallet.js
 * Thin wrapper around @solana/wallet-adapter-react's useWallet hook.
 * Re-exports helpers like shortenAddress for convenience across the app.
 */
export { useWallet, useConnection } from '@solana/wallet-adapter-react'

/** Shorten a wallet address for display: "AbCd...wxYz" */
export function shortenAddress(addr) {
  if (!addr) return ''
  const str = typeof addr === 'string' ? addr : addr.toString()
  return `${str.slice(0, 4)}...${str.slice(-4)}`
}
