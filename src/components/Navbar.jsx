import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { shortenAddress } from '../hooks/useWallet'
import FaucetModal from './FaucetModal'
import WalletModal from './WalletModal'
import './Navbar.css'

function WalletControls({
  connected,
  full = false,
  wallet,
  walletAddress,
  onDisconnect,
  onOpenWalletModal,
  onOpenFaucet,
}) {
  if (!connected) {
    return (
      <button
        className={`btn btn-primary btn-sm ${full ? 'btn-full' : ''}`}
        onClick={onOpenWalletModal}
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className={`wallet-actions ${full ? 'wallet-actions-full' : ''}`}>
      <button className="btn btn-outline btn-sm wallet-faucet-btn" onClick={onOpenFaucet}>
        Faucet
      </button>
      <div className={`wallet-connected ${full ? 'wallet-full' : ''}`}>
        <div className="wallet-indicator">
          {wallet?.adapter?.icon && (
            <img
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              className="wallet-icon-img"
            />
          )}
          <span className="wallet-dot" />
          <span className="wallet-address">{shortenAddress(walletAddress)}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { publicKey, connected, disconnect, wallet } = useWallet()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [faucetModalOpen, setFaucetModalOpen] = useState(false)

  const walletAddress = publicKey?.toString()

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/create', label: 'Create Invoice' },
    { path: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">!</span>
            <span className="logo-text">
              KampusPay<span className="logo-lite">Lite</span>
            </span>
          </Link>

          <div className="navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="navbar-wallet">
            <WalletControls
              connected={connected}
              wallet={wallet}
              walletAddress={walletAddress}
              onDisconnect={() => disconnect()}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenFaucet={() => setFaucetModalOpen(true)}
            />
          </div>

          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mobile-wallet">
              <WalletControls
                connected={connected}
                full
                wallet={wallet}
                walletAddress={walletAddress}
                onDisconnect={() => {
                  setMenuOpen(false)
                  void disconnect()
                }}
                onOpenWalletModal={() => {
                  setMenuOpen(false)
                  setWalletModalOpen(true)
                }}
                onOpenFaucet={() => {
                  setMenuOpen(false)
                  setFaucetModalOpen(true)
                }}
              />
            </div>
          </div>
        )}
      </nav>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
      <FaucetModal
        isOpen={faucetModalOpen}
        onClose={() => setFaucetModalOpen(false)}
      />
    </>
  )
}
