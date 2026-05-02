import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import './WalletModal.css'

/**
 * WalletModal
 * Custom wallet picker modal that shows all detected/supported wallets.
 * - "Detected" wallets = extensions currently in browser (Phantom, Backpack, etc.)
 * - Other registered adapters (Solflare) are shown as installable fallback.
 */
export default function WalletModal({ isOpen, onClose }) {
  const { wallets, select, connect, wallet: activeWallet, connecting } = useWallet()
  const overlayRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // Split wallets into detected (installed) and others
  const detected = wallets.filter((w) => w.readyState === 'Installed' || w.readyState === 'Loadable')
  const others = wallets.filter((w) => w.readyState !== 'Installed' && w.readyState !== 'Loadable')

  const handleSelect = async (walletName) => {
    select(walletName)
    // Give the adapter a tick to register the selection
    setTimeout(async () => {
      try {
        await connect()
      } catch {
        return
      }
    }, 100)
    onClose()
  }

  return (
    <div
      className="wm-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="wm-modal" role="dialog" aria-modal="true" aria-label="Select Wallet">
        {/* Header */}
        <div className="wm-header">
          <div>
            <h2 className="wm-title">Connect Wallet</h2>
            <p className="wm-subtitle">Choose your Solana wallet to continue</p>
          </div>
          <button className="wm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Detected / Installed wallets */}
        {detected.length > 0 && (
          <div className="wm-section">
            <div className="wm-section-label">
              <span className="wm-dot-green" />
              Detected in browser
            </div>
            <div className="wm-wallet-list">
              {detected.map((w) => (
                <WalletOption
                  key={w.adapter.name}
                  wallet={w}
                  isActive={activeWallet?.adapter.name === w.adapter.name}
                  connecting={connecting && activeWallet?.adapter.name === w.adapter.name}
                  onClick={() => handleSelect(w.adapter.name)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {detected.length > 0 && others.length > 0 && (
          <div className="wm-divider">
            <span>More wallets</span>
          </div>
        )}

        {/* Other wallets (not installed) */}
        {others.length > 0 && (
          <div className="wm-section">
            {detected.length === 0 && (
              <div className="wm-section-label">All wallets</div>
            )}
            <div className="wm-wallet-list">
              {others.map((w) => (
                <WalletOption
                  key={w.adapter.name}
                  wallet={w}
                  isActive={false}
                  connecting={false}
                  onClick={() => handleSelect(w.adapter.name)}
                  notInstalled
                />
              ))}
            </div>
          </div>
        )}

        {/* Fallback: no wallets at all */}
        {wallets.length === 0 && (
          <div className="wm-empty">
            <div className="wm-empty-icon">🔍</div>
            <p>No Solana wallet detected.</p>
            <p className="wm-empty-hint">
              Install{' '}
              <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Phantom</a>,{' '}
              <a href="https://www.backpack.app" target="_blank" rel="noopener noreferrer">Backpack</a>, or{' '}
              <a href="https://solflare.com" target="_blank" rel="noopener noreferrer">Solflare</a>{' '}
              extension and refresh.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="wm-footer">
          <span>🔒 KampusPay never stores your private key</span>
          <span className="wm-network-tag">Solana Devnet</span>
        </div>
      </div>
    </div>
  )
}

function WalletOption({ wallet, isActive, connecting, onClick, notInstalled }) {
  const { adapter } = wallet
  return (
    <button
      className={`wm-wallet-btn ${isActive ? 'active' : ''} ${notInstalled ? 'not-installed' : ''}`}
      onClick={onClick}
    >
      {/* Wallet icon */}
      <div className="wm-wallet-icon">
        {adapter.icon ? (
          <img src={adapter.icon} alt={adapter.name} width={32} height={32} />
        ) : (
          <span className="wm-wallet-icon-fallback">
            {adapter.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Name + state */}
      <div className="wm-wallet-info">
        <span className="wm-wallet-name">{adapter.name}</span>
        {connecting ? (
          <span className="wm-wallet-state connecting">Connecting...</span>
        ) : notInstalled ? (
          <span className="wm-wallet-state install">Click to install ↗</span>
        ) : (
          <span className="wm-wallet-state detected">Detected</span>
        )}
      </div>

      {/* Arrow */}
      <span className="wm-arrow">→</span>
    </button>
  )
}
