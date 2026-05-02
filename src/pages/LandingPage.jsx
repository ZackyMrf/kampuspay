import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { shortenAddress } from '../hooks/useWallet'
import WalletModal from '../components/WalletModal'
import './LandingPage.css'

const features = [
  {
    title: 'Instant settlement proof',
    desc: 'Every payment has a clear transaction trail on Solana Devnet, removing screenshot-based confirmation.',
  },
  {
    title: 'Shareable payment links',
    desc: 'Generate polished invoice pages for classes, events, treasury collection, and pilot merchant flows.',
  },
  {
    title: 'Treasury visibility',
    desc: 'Track paid and unpaid invoices in one calm dashboard with less friction for organizers.',
  },
]

const flows = [
  {
    step: '01',
    title: 'Create invoice',
    desc: 'Set the title, amount, category, and receiver wallet in a lightweight form.',
  },
  {
    step: '02',
    title: 'Distribute link',
    desc: 'Share one payment page as a URL or QR code for online and offline use.',
  },
  {
    step: '03',
    title: 'Collect and verify',
    desc: 'Students connect a wallet, pay, and treasury teams verify on-chain immediately.',
  },
]

const stats = [
  { label: 'UX', value: 'Clean and smooth' },
  { label: 'Proof', value: 'On-chain verification' },
  { label: 'Mode', value: 'Solana Devnet' },
]

const useCases = [
  'Class contribution',
  'Student organization dues',
  'Ticketing and events',
  'Donation drives',
  'Campus merchant pilots',
  'Temporary cashier booths',
]

export default function LandingPage() {
  const { publicKey, connected, connecting } = useWallet()
  const wallet = publicKey?.toString()
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  return (
    <div className="landing">
      <section className="hero-shell">
        <div className="container">
          <div className="hero-panel">
            <div className="hero-orb hero-orb-left" />
            <div className="hero-orb hero-orb-right" />
            <div className="hero-ribbon hero-ribbon-a" />
            <div className="hero-ribbon hero-ribbon-b" />

            <div className="hero-topbar">
              <div className="hero-badge">
                <span className="badge-dot" />
                Clean campus payment flow
              </div>
              <div className="hero-mini-nav">
                <span>Invoices</span>
                <span>Collections</span>
                <span>Devnet</span>
              </div>
            </div>

            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker">KampusPay Lite</p>
                <h1 className="hero-title">
                  Real-time
                  <br />
                  payments for
                  <br />
                  campus teams
                </h1>
                <p className="hero-subtitle">
                  A cleaner way to create payment links, collect Devnet SOL, and
                  verify each transfer in a more professional interface.
                </p>

                <div className="hero-cta">
                  <Link to="/create" className="btn btn-primary btn-lg">
                    Create invoice
                  </Link>
                  <Link to="/dashboard" className="btn btn-outline btn-lg">
                    Open dashboard
                  </Link>
                </div>

                {connected ? (
                  <div className="hero-wallet-status">
                    <span className="wallet-dot-green" />
                    Connected as {shortenAddress(wallet)}
                  </div>
                ) : (
                  <div className="hero-wallet-hint">
                    <span>Wallet ready:</span>
                    <button
                      className="link-btn"
                      onClick={() => setWalletModalOpen(true)}
                      disabled={connecting}
                    >
                      {connecting ? 'Connecting...' : 'Connect your Solana wallet'}
                    </button>
                  </div>
                )}
              </div>

              <div className="hero-visual">
                <div className="hero-discs">
                  <div className="hero-disc hero-disc-back" />
                  <div className="hero-disc hero-disc-mid" />
                  <div className="hero-disc hero-disc-front" />
                </div>

                <div className="hero-side-note">
                  <p>
                    Receive and verify payments instantly with a softer visual
                    flow built for student finance operations.
                  </p>
                  <Link to="/create" className="hero-join-link">
                    Start now
                  </Link>
                </div>
              </div>
            </div>

            <div className="hero-stats">
              {stats.map((item) => (
                <div className="hero-stat" key={item.label}>
                  <span className="hero-stat-label">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-header section-header-left">
            <div className="section-tag">Why it feels better</div>
            <h2 className="section-title">Professional by default, simple for daily use</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="card feature-card" key={feature.title}>
                <div className="feature-index" />
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="showcase-grid">
            <div className="card showcase-card showcase-primary">
              <div className="section-tag">Workflow</div>
              <h2 className="section-title">One calm flow from invoice to confirmation</h2>
              <div className="flow-list">
                {flows.map((flow) => (
                  <div className="flow-item" key={flow.step}>
                    <div className="flow-step">{flow.step}</div>
                    <div>
                      <h3>{flow.title}</h3>
                      <p>{flow.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card showcase-card showcase-secondary">
              <div className="section-tag">Use cases</div>
              <h2 className="section-title">Built for campus operations</h2>
              <div className="usecase-list">
                {useCases.map((item) => (
                  <div className="usecase-pill" key={item}>
                    {item}
                  </div>
                ))}
              </div>
              <p className="showcase-note">
                Suitable for payment pilots, internal demos, and blockchain-backed
                collection experiments in campus environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <div className="section-tag">Ready</div>
              <h2 className="cta-title">Launch a smoother payment page in minutes</h2>
              <p className="cta-sub">
                Create your first invoice, test with Devnet SOL, and share a more
                polished experience with your team.
              </p>
            </div>
            <div className="cta-actions">
              <Link to="/create" className="btn btn-primary btn-lg">
                Create your first invoice
              </Link>
              <button className="btn btn-ghost btn-lg" onClick={() => setWalletModalOpen(true)}>
                Connect wallet
              </button>
            </div>
          </div>
        </div>
      </section>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
