import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from './authContext'
import { shortenAddress } from '../hooks/useWallet'
import { useToast } from './toastContext'
import FaucetModal from './FaucetModal'
import LanguageToggle from './LanguageToggle'
import WalletModal from './WalletModal'
import { useI18n } from '../i18n/LanguageProvider'
import { getLocalChatReadReceipts, getUnreadChatCount, subscribeToChatMessageChanges } from '../utils/chatStorage'
import {
  getLocalSellerOrderReadAt,
  getUnreadSellerOrderCount,
  subscribeToSellerOrderChanges,
} from '../utils/marketplaceStorage'
import './Navbar.css'

function getInitials(name, fallback = 'KP') {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || []
  if (parts.length === 0) return fallback
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function ProfileAvatar({ profile }) {
  const label = profile?.full_name || profile?.email || 'KampusPay User'

  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={label} />
  }

  return <span>{getInitials(label)}</span>
}

function WalletControls({
  connected,
  full = false,
  wallet,
  walletAddress,
  onDisconnect,
  onOpenWalletModal,
  onOpenFaucet,
  t,
}) {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const walletMenuRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!walletMenuRef.current?.contains(event.target)) setWalletMenuOpen(false)
    }

    if (walletMenuOpen) document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [walletMenuOpen])

  if (!connected) {
    return (
      <button
        className={`btn btn-primary btn-sm ${full ? 'btn-full' : ''}`}
        onClick={onOpenWalletModal}
      >
        {t('wallet.connect')}
      </button>
    )
  }

  return (
    <div className={`wallet-actions ${full ? 'wallet-actions-full' : ''}`} ref={walletMenuRef}>
      <button
        className={`wallet-menu-trigger ${full ? 'wallet-menu-trigger-full' : ''}`}
        onClick={() => setWalletMenuOpen((current) => !current)}
        aria-expanded={walletMenuOpen}
        aria-label="Open wallet menu"
      >
        <span className="wallet-indicator wallet-indicator-button">
          {wallet?.adapter?.icon && (
            <img
              src={wallet.adapter.icon}
              alt={wallet.adapter.name}
              className="wallet-icon-img"
            />
          )}
          <span className="wallet-dot" />
          <span className="wallet-address">{shortenAddress(walletAddress)}</span>
        </span>
        <span className="wallet-menu-chevron">v</span>
      </button>

      {walletMenuOpen && (
        <div className="wallet-menu-popover">
          <button
            className="wallet-menu-item"
            onClick={() => {
              setWalletMenuOpen(false)
              onOpenFaucet()
            }}
          >
            {t('wallet.faucet')}
          </button>
          <button
            className="wallet-menu-item danger"
            onClick={() => {
              setWalletMenuOpen(false)
              onDisconnect()
            }}
          >
            {t('wallet.disconnect')}
          </button>
        </div>
      )}
    </div>
  )
}

function ChatNavLabel({ count }) {
  return (
    <span className="nav-label-with-badge">
      Chat
      {count > 0 && <span className="nav-link-badge">{count > 99 ? '99+' : count}</span>}
    </span>
  )
}

function OrderNavLabel({ count, label }) {
  return (
    <span className="nav-label-with-badge">
      {label}
      {count > 0 && <span className="nav-link-badge">{count > 99 ? '99+' : count}</span>}
    </span>
  )
}

export default function Navbar() {
  const { t } = useI18n()
  const { publicKey, connected, disconnect, wallet } = useWallet()
  const { isLoggedIn, profile, seller, user, logout } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [faucetModalOpen, setFaucetModalOpen] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadOrders, setUnreadOrders] = useState(0)
  const profileMenuRef = useRef(null)

  const walletAddress = publicKey?.toString()
  const activeChatThreadId = location.pathname.startsWith('/chats/')
    ? location.pathname.split('/')[2] || ''
    : ''

  const dashboardPath = profile?.role === 'seller' ? '/seller/dashboard' : '/student/dashboard'
  const navLinks = isLoggedIn
    ? profile?.role === 'seller'
      ? [
          { path: '/', label: t('nav.home') },
          { path: '/marketplace', label: t('nav.marketplace') },
          { path: '/seller/dashboard', label: t('nav.sellerDashboard') },
          { path: '/seller/products', label: t('nav.products') },
          { path: '/seller/orders', label: <OrderNavLabel count={unreadOrders} label={t('nav.orders')} /> },
          { path: '/seller/chats', label: <ChatNavLabel count={unreadChats} /> },
        ]
      : [
          { path: '/', label: t('nav.home') },
          { path: '/marketplace', label: t('nav.marketplace') },
          { path: '/student/dashboard', label: t('nav.studentDashboard') },
          { path: '/student/chats', label: <ChatNavLabel count={unreadChats} /> },
        ]
    : [
        { path: '/', label: t('nav.home') },
        { path: '/marketplace', label: t('nav.marketplace') },
        { path: '/login', label: t('nav.login') },
        { path: '/register', label: t('nav.register') },
      ]

  const handleLogout = async () => {
    try {
      if (connected) await disconnect()
      await logout()
      setMenuOpen(false)
      setProfileMenuOpen(false)
      toast.success('Logged out.')
    } catch (error) {
      toast.error(error.message || 'Failed to logout.')
    }
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }

    if (profileMenuOpen) document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [profileMenuOpen])

  useEffect(() => {
    if (!isLoggedIn || !user?.id || !profile?.role) {
      Promise.resolve().then(() => setUnreadChats(0))
      return undefined
    }

    let ignore = false
    const refreshUnread = () => {
      getUnreadChatCount({
        role: profile.role,
        userId: user.id,
        sellerId: seller?.id,
        excludeThreadId: activeChatThreadId,
        localReadReceipts: getLocalChatReadReceipts(user.id),
      })
        .then((count) => {
          if (!ignore) setUnreadChats(count)
        })
        .catch(() => {
          if (!ignore) setUnreadChats(0)
        })
    }

    refreshUnread()

    const unsubscribe = subscribeToChatMessageChanges(({ eventType, message }) => {
      refreshUnread()
      if (eventType === 'INSERT' && message?.senderId !== user.id && !location.pathname.startsWith('/chats/')) {
        toast.info('Ada chat baru masuk.')
      }
    })
    const handleLocalRead = () => refreshUnread()
    window.addEventListener('kampuspay-chat-read', handleLocalRead)

    return () => {
      ignore = true
      unsubscribe()
      window.removeEventListener('kampuspay-chat-read', handleLocalRead)
    }
  }, [activeChatThreadId, isLoggedIn, location.pathname, profile?.role, seller?.id, toast, user?.id])

  useEffect(() => {
    if (!isLoggedIn || profile?.role !== 'seller' || !seller?.id) {
      Promise.resolve().then(() => setUnreadOrders(0))
      return undefined
    }

    let ignore = false
    const isViewingOrders = location.pathname === '/seller/orders'

    const refreshUnreadOrders = () => {
      getUnreadSellerOrderCount({
        sellerId: seller.id,
        localReadAt: getLocalSellerOrderReadAt(seller.id),
        excludeWhenViewingOrders: isViewingOrders,
      })
        .then((count) => {
          if (!ignore) setUnreadOrders(count)
        })
        .catch(() => {
          if (!ignore) setUnreadOrders(0)
        })
    }

    refreshUnreadOrders()

    const unsubscribe = subscribeToSellerOrderChanges(seller.id, ({ eventType, order }) => {
      refreshUnreadOrders()
      if (eventType === 'INSERT' && order?.sellerId === seller.id && !isViewingOrders) {
        toast.info('Ada order baru masuk.')
      }
    })
    const handleLocalRead = () => refreshUnreadOrders()
    window.addEventListener('kampuspay-seller-orders-read', handleLocalRead)

    return () => {
      ignore = true
      unsubscribe()
      window.removeEventListener('kampuspay-seller-orders-read', handleLocalRead)
    }
  }, [isLoggedIn, location.pathname, profile?.role, seller?.id, toast])

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to={isLoggedIn ? dashboardPath : '/'} className="navbar-logo">
            <img
              src="/kampus_pay_whitebg_nav.png"
              alt="KampusPay"
              className="navbar-logo-img"
            />
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
              t={t}
            />
            <LanguageToggle />
            {isLoggedIn && (
              <div className="navbar-account">
                <div className="profile-menu" ref={profileMenuRef}>
                  <button
                    className="profile-avatar-button"
                    onClick={() => setProfileMenuOpen((current) => !current)}
                    aria-label={t('nav.openProfileMenu')}
                    aria-expanded={profileMenuOpen}
                  >
                    <ProfileAvatar profile={profile} />
                  </button>
                  {profileMenuOpen && (
                    <div className="profile-menu-popover">
                      <div className="profile-menu-head">
                        <strong>{profile?.full_name || 'KampusPay User'}</strong>
                        <span>{profile?.email || profile?.role || t('common.account')}</span>
                      </div>
                      <Link
                        to="/settings/profile"
                        className="profile-menu-link"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        {t('nav.profileSettings')}
                      </Link>
                      <button
                        className="profile-menu-link profile-menu-button danger"
                        onClick={handleLogout}
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={t('nav.toggleMenu')}
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
                t={t}
              />
              <LanguageToggle full />
              {isLoggedIn && (
                <div className="mobile-account-row">
                  <Link
                    to="/settings/profile"
                    className="mobile-profile-link"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Open profile settings"
                  >
                    <ProfileAvatar profile={profile} />
                    <span>{t('nav.profileSettings')}</span>
                  </Link>
                  <button className="btn btn-ghost btn-full" onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </div>
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
