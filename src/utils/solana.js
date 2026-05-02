/**
 * solana.js
 * Solana transaction helpers for KampusPay Lite (Devnet).
 *
 * sendSOL now uses the wallet adapter's sendTransaction so it works
 * with Phantom, Backpack, Solflare, or any Wallet Standard wallet.
 */
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { createSolanaConnection } from './solanaConfig'

// Shared Devnet connection
export const connection = createSolanaConnection()

/**
 * Send SOL from the connected wallet to a receiver address.
 *
 * @param {string}   fromAddress      - Sender's public key (string)
 * @param {string}   toAddress        - Receiver's public key (string)
 * @param {number}   amountSOL        - Amount in SOL (e.g. 0.05)
 * @param {Function} sendTransaction  - sendTransaction from useWallet() adapter hook
 * @param {Function} signTransaction  - signTransaction from useWallet() adapter hook
 * @param {Connection} conn           - Optional: injected Connection (default: Devnet)
 * @returns {string} transaction signature
 */
export async function sendSOL(
  fromAddress,
  toAddress,
  amountSOL,
  sendTransaction,
  signTransaction,
  conn
) {
  const rpc = conn || connection

  // 1. Validate receiver address
  let toPublicKey
  try {
    toPublicKey = new PublicKey(toAddress)
  } catch {
    throw new Error('Invalid receiver wallet address.')
  }

  const fromPublicKey = new PublicKey(fromAddress)

  // 2. Convert SOL → lamports (1 SOL = 1,000,000,000 lamports)
  const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL)

  // 3. Check sender balance (include ~5000 lamports buffer for tx fee)
  const balance = await rpc.getBalance(fromPublicKey)
  if (balance < lamports + 5000) {
    const balanceSOL = (balance / LAMPORTS_PER_SOL).toFixed(4)
    throw new Error(
      `Insufficient balance.\nYou have ${balanceSOL} SOL, need ${amountSOL} SOL + fee.\n` +
        `Get free Devnet SOL at: https://faucet.solana.com`
    )
  }

  // 4. Build the transfer transaction using SystemProgram.transfer
  const { blockhash, lastValidBlockHeight } =
    await rpc.getLatestBlockhash('confirmed')

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPublicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports,
    })
  )

  // 5. Prefer signTransaction + sendRawTransaction to avoid wallet-specific
  //    signAndSendTransaction issues observed in some Wallet Standard wallets.
  let signature

  if (typeof signTransaction === 'function') {
    const signedTransaction = await signTransaction(transaction)
    signature = await rpc.sendRawTransaction(signedTransaction.serialize(), {
      preflightCommitment: 'confirmed',
    })
  } else {
    signature = await sendTransaction(transaction, rpc, {
      preflightCommitment: 'confirmed',
    })
  }

  // 6. Wait for on-chain confirmation
  await rpc.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  )

  return signature
}

/** Solana Explorer URL for a transaction (Devnet) */
export function getExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

/** Solana Explorer URL for an address (Devnet) */
export function getAddressExplorerUrl(address) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`
}

export async function getTransactionLifecycle(signature, conn) {
  if (!signature) return { status: 'unknown', confirmationStatus: null, error: null }

  const rpc = conn || connection
  const { value } = await rpc.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  })
  const tx = value[0]

  if (!tx) {
    return { status: 'pending', confirmationStatus: null, error: null }
  }

  if (tx.err) {
    return {
      status: 'failed',
      confirmationStatus: tx.confirmationStatus ?? null,
      error: JSON.stringify(tx.err),
    }
  }

  if (tx.confirmationStatus === 'finalized' || tx.confirmationStatus === 'confirmed') {
    return {
      status: 'confirmed',
      confirmationStatus: tx.confirmationStatus,
      error: null,
    }
  }

  return {
    status: 'pending',
    confirmationStatus: tx.confirmationStatus ?? null,
    error: null,
  }
}
