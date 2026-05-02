import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { SOLANA_FAUCET_RPC_URL, createSolanaConnection } from '../utils/solanaConfig'
import './FaucetModal.css'

const AIRDROP_AMOUNT = 1
const FAUCET_EXTERNAL = 'https://faucet.solana.com'
const SHORT_COOLDOWN_MS = 60 * 1000
const LONG_COOLDOWN_MS = 8 * 60 * 60 * 1000
const HISTORY_LIMIT = 5

function getHistoryKey(address) {
  return `kampuspay_faucet_history_${address}`
}

function getCooldownKey(address) {
  return `kampuspay_faucet_cooldown_${address}`
}

function shortSignature(signature) {
  return signature ? `${signature.slice(0, 8)}...${signature.slice(-6)}` : ''
}

function explorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export default function FaucetModal({ isOpen, onClose }) {
  const { publicKey } = useWallet()
  const faucetConnection = useMemo(
    () => createSolanaConnection(SOLANA_FAUCET_RPC_URL),
    []
  )
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0)
  const walletAddress = publicKey?.toString()
  const isCoolingDown = cooldownRemainingMs > 0

  const persistCooldown = useCallback((nextCooldownUntil) => {
    if (!walletAddress) return
    localStorage.setItem(getCooldownKey(walletAddress), String(nextCooldownUntil))
    setCooldownUntil(nextCooldownUntil)
    setCooldownRemainingMs(Math.max(nextCooldownUntil - Date.now(), 0))
  }, [walletAddress])

  const persistHistory = useCallback((nextHistory) => {
    if (!walletAddress) return
    localStorage.setItem(getHistoryKey(walletAddress), JSON.stringify(nextHistory))
    setHistory(nextHistory)
  }, [walletAddress])

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !faucetConnection) {
      setBalance(null)
      return
    }

    try {
      setLoadingBalance(true)
      const walletBalance = await faucetConnection.getBalance(new PublicKey(publicKey.toString()))
      setBalance(walletBalance / LAMPORTS_PER_SOL)
    } catch {
      setBalance(null)
    } finally {
      setLoadingBalance(false)
    }
  }, [faucetConnection, publicKey])

  useEffect(() => {
    if (!isOpen) return undefined

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeydown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !publicKey) return undefined

    const timerId = window.setTimeout(() => {
      setStatus(null)
      void fetchBalance()
      const savedCooldown = Number(localStorage.getItem(getCooldownKey(publicKey.toString())) || '0')
      setCooldownUntil(savedCooldown)
      setCooldownRemainingMs(Math.max(savedCooldown - Date.now(), 0))

      try {
        const savedHistory = JSON.parse(
          localStorage.getItem(getHistoryKey(publicKey.toString())) || '[]'
        )
        setHistory(Array.isArray(savedHistory) ? savedHistory : [])
      } catch {
        setHistory([])
      }
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [fetchBalance, isOpen, publicKey])

  useEffect(() => {
    if (!isOpen || !isCoolingDown) return undefined

    const intervalId = window.setInterval(() => {
      setCooldownRemainingMs(Math.max(cooldownUntil - Date.now(), 0))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [cooldownUntil, isCoolingDown, isOpen])

  const formatCooldown = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) return `${hours}j ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}d`
    return `${seconds}d`
  }

  const requestAirdrop = async () => {
    if (!publicKey || !faucetConnection || isCoolingDown) return

    setStatus(null)
    setLoading(true)

    try {
      const walletPublicKey = new PublicKey(publicKey.toString())
      const lamports = AIRDROP_AMOUNT * LAMPORTS_PER_SOL
      const signature = await faucetConnection.requestAirdrop(walletPublicKey, lamports)
      const { blockhash, lastValidBlockHeight } = await faucetConnection.getLatestBlockhash()

      await faucetConnection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      )

      await fetchBalance()
      const nextHistory = [
        { sig: signature, amount: AIRDROP_AMOUNT, ts: Date.now() },
        ...history.slice(0, HISTORY_LIMIT - 1),
      ]
      persistHistory(nextHistory)
      setStatus({
        type: 'success',
        message: `${AIRDROP_AMOUNT} SOL berhasil dikirim ke wallet kamu.`,
        sig: signature,
      })
    } catch (error) {
      const message = error?.message || ''

      if (
        message.includes('airdrop limit') ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('Too Many Requests') ||
        message.includes('airdropped too much')
      ) {
        const longerCooldown =
          message.includes('airdrop limit') || message.includes('airdropped too much')
            ? LONG_COOLDOWN_MS
            : SHORT_COOLDOWN_MS
        persistCooldown(Date.now() + longerCooldown)
        setStatus({
          type: 'rate-limit',
          message:
            message.includes('airdrop limit') || message.includes('airdropped too much')
              ? 'Batas airdrop wallet ini tercapai. Tunggu beberapa jam atau pakai faucet alternatif.'
              : 'Endpoint publik Solana sedang rate limit. Faucet dikunci sementara selama 1 menit agar tidak spam.',
        })
      } else {
        setStatus({
          type: 'error',
          message: `Gagal airdrop: ${message || 'Unknown error'}`,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="faucet-overlay"
      onClick={(event) => {
        if (event.target.classList.contains('faucet-overlay')) onClose()
      }}
    >
      <div className="faucet-modal" role="dialog" aria-modal="true" aria-label="Devnet faucet">
        <div className="faucet-header">
          <div className="faucet-header-left">
            <div className="faucet-icon">SOL</div>
            <div>
              <h2 className="faucet-title">Devnet Faucet</h2>
              <p className="faucet-subtitle">Minta SOL gratis untuk testing di Solana Devnet.</p>
            </div>
          </div>
          <button className="faucet-close" onClick={onClose} aria-label="Close faucet">
            X
          </button>
        </div>

        <div className="faucet-network">
          <span className="faucet-net-dot" />
          <span>Solana Devnet only. Saldo ini hanya untuk pengujian.</span>
        </div>

        <div className="faucet-rpc-note">
          Endpoint faucet aktif: <code className="font-mono">{SOLANA_FAUCET_RPC_URL}</code>
        </div>

        <div className="faucet-balance-card">
          <div className="faucet-balance-label">Balance Saat Ini</div>
          {loadingBalance ? (
            <div className="faucet-balance-loading">
              <span className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : balance !== null ? (
            <div className="faucet-balance-amount">
              <span className="faucet-balance-num">{balance.toFixed(4)}</span>
              <span className="faucet-balance-unit">SOL</span>
            </div>
          ) : (
            <div className="faucet-balance-amount text-muted">Not available</div>
          )}
          <button
            className="faucet-refresh-btn"
            onClick={() => void fetchBalance()}
            disabled={loadingBalance}
            title="Refresh balance"
          >
            Refresh
          </button>
        </div>

        {publicKey && (
          <div className="faucet-address">
            <span className="faucet-address-label">Wallet</span>
            <code className="faucet-address-val font-mono">{publicKey.toString()}</code>
          </div>
        )}

        {status && (
          <div className={`faucet-status faucet-status-${status.type}`}>
            <div className="faucet-status-msg">{status.message}</div>
            {status.sig && (
              <a
                href={explorerUrl(status.sig)}
                target="_blank"
                rel="noopener noreferrer"
                className="faucet-tx-link"
              >
                Lihat transaksi: {shortSignature(status.sig)}
              </a>
            )}
            {status.type === 'rate-limit' && (
              <a
                href={FAUCET_EXTERNAL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                Buka faucet.solana.com
              </a>
            )}
          </div>
        )}

        <div className="faucet-actions">
          <button
            className="btn btn-primary btn-full btn-lg faucet-btn"
            onClick={requestAirdrop}
            disabled={loading || !publicKey || isCoolingDown}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                Requesting airdrop...
              </>
            ) : isCoolingDown ? (
              `Cooldown ${formatCooldown(cooldownRemainingMs)}`
            ) : (
              `Request ${AIRDROP_AMOUNT} SOL airdrop`
            )}
          </button>
          <p className="faucet-help-text">
            Public Devnet RPC memang rate-limited. Untuk limit yang lebih longgar, set
            ` VITE_SOLANA_FAUCET_RPC_URL ` ke RPC Devnet milik provider kamu sendiri.
          </p>
        </div>

        {history.length > 0 && (
          <div className="faucet-history">
            <div className="faucet-history-label">Riwayat Airdrop</div>
            {history.map((item) => (
              <div className="faucet-history-item" key={item.sig}>
                <span className="text-success">+{item.amount} SOL</span>
                <a
                  href={explorerUrl(item.sig)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="faucet-tx-link font-mono"
                >
                  {shortSignature(item.sig)}
                </a>
                <span className="text-muted text-sm">
                  {new Date(item.ts).toLocaleTimeString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="faucet-footer">
          <span className="faucet-footer-label">Alternatif faucet</span>
          <div className="faucet-links">
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-ext-link"
            >
              faucet.solana.com
            </a>
            <a
              href="https://solfaucet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-ext-link"
            >
              solfaucet.com
            </a>
            <a
              href="https://solana.com/developers/guides/getstarted/solana-token-airdrop-and-faucets"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-ext-link"
            >
              Solana faucet guide
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
