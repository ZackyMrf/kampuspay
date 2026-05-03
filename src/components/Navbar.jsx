import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from './authContext'
import { shortenAddress } from '../hooks/useWallet'
import { useToast } from './toastContext'
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
  const { isLoggedIn, profile, logout } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [faucetModalOpen, setFaucetModalOpen] = useState(false)

  const walletAddress = publicKey?.toString()

  const dashboardPath = profile?.role === 'seller' ? '/seller/dashboard' : '/student/dashboard'
  const navLinks = isLoggedIn
    ? profile?.role === 'seller'
      ? [
          { path: '/', label: 'Home' },
          { path: '/marketplace', label: 'Marketplace' },
          { path: '/seller/dashboard', label: 'Seller Dashboard' },
          { path: '/seller/products', label: 'Products' },
          { path: '/seller/orders', label: 'Orders' },
        ]
      : [
          { path: '/', label: 'Home' },
          { path: '/marketplace', label: 'Marketplace' },
          { path: '/student/dashboard', label: 'Student Dashboard' },
        ]
    : [
        { path: '/', label: 'Home' },
        { path: '/marketplace', label: 'Marketplace' },
        { path: '/login', label: 'Login' },
        { path: '/register', label: 'Register' },
      ]

  const handleLogout = async () => {
    try {
      await logout()
      setMenuOpen(false)
      toast.success('Logged out.')
    } catch (error) {
      toast.error(error.message || 'Failed to logout.')
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to={isLoggedIn ? dashboardPath : '/'} className="navbar-logo">
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
            {isLoggedIn && (
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Logout
              </button>
            )}
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
              {isLoggedIn && (
                <button className="btn btn-ghost btn-full" onClick={handleLogout}>
                  Logout
                </button>
              )}
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
