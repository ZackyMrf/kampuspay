import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { shortenAddress } from '../hooks/useWallet'
import WalletModal from '../components/WalletModal'
import { useI18n } from '../i18n/LanguageProvider'
import heroLayer from '../assets/hero.png'
import './LandingPage.css'

const features = [
  {
    title: { en: 'Instant settlement proof', id: 'Bukti pembayaran instan' },
    desc: {
      en: 'Every payment has a clear transaction trail on Solana Devnet, removing screenshot-based confirmation.',
      id: 'Setiap pembayaran punya jejak transaksi jelas di Solana Devnet, tanpa konfirmasi berbasis screenshot.',
    },
  },
  {
    title: { en: 'Shareable payment links', id: 'Link pembayaran siap dibagikan' },
    desc: {
      en: 'Generate polished invoice pages for classes, events, treasury collection, and pilot merchant flows.',
      id: 'Buat halaman invoice rapi untuk kelas, event, kas, dan alur uji coba merchant.',
    },
  },
  {
    title: { en: 'Treasury visibility', id: 'Kas lebih mudah dipantau' },
    desc: {
      en: 'Track paid and unpaid invoices in one calm dashboard with less friction for organizers.',
      id: 'Pantau invoice lunas dan belum lunas di satu dashboard yang nyaman untuk panitia.',
    },
  },
]

const flows = [
  {
    step: '01',
    title: { en: 'Create invoice', id: 'Buat invoice' },
    desc: { en: 'Set the title, amount, category, and receiver wallet in a lightweight form.', id: 'Isi judul, nominal, kategori, dan wallet penerima lewat form ringan.' },
  },
  {
    step: '02',
    title: { en: 'Distribute link', id: 'Bagikan link' },
    desc: { en: 'Share one payment page as a URL or QR code for online and offline use.', id: 'Bagikan satu halaman pembayaran sebagai URL atau QR code untuk online maupun offline.' },
  },
  {
    step: '03',
    title: { en: 'Collect and verify', id: 'Terima dan verifikasi' },
    desc: { en: 'Students connect a wallet, pay, and treasury teams verify on-chain immediately.', id: 'Mahasiswa menghubungkan wallet, membayar, lalu tim kas bisa verifikasi on-chain saat itu juga.' },
  },
]

const useCases = [
  { en: 'Class contribution', id: 'Iuran kelas' },
  { en: 'Student organization dues', id: 'Iuran organisasi mahasiswa' },
  { en: 'Ticketing and events', id: 'Tiket dan event' },
  { en: 'Donation drives', id: 'Penggalangan donasi' },
  { en: 'Campus merchant pilots', id: 'Uji coba merchant kampus' },
  { en: 'Temporary cashier booths', id: 'Kasir sementara' },
]

const heroModes = [
  {
    key: 'invoice',
    label: { en: 'Invoice', id: 'Invoice' },
    title: { en: 'Payment link ready', id: 'Link pembayaran siap' },
    desc: { en: 'Share a clean URL or QR code with students and buyers.', id: 'Bagikan URL atau QR code yang rapi ke mahasiswa dan pembeli.' },
  },
  {
    key: 'review',
    label: { en: 'Review', id: 'Review' },
    title: { en: 'Seller verification', id: 'Verifikasi seller' },
    desc: { en: 'QRIS, bank, and pickup flows stay visible in one place.', id: 'Alur QRIS, bank, dan pickup tetap terlihat di satu tempat.' },
  },
  {
    key: 'settle',
    label: { en: 'Settle', id: 'Lunas' },
    title: { en: 'On-chain proof', id: 'Bukti on-chain' },
    desc: { en: 'Solana payments keep a public transaction trail.', id: 'Pembayaran Solana punya jejak transaksi publik.' },
  },
]

export default function LandingPage() {
  const { language, t } = useI18n()
  const { publicKey, connected, connecting } = useWallet()
  const wallet = publicKey?.toString()
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [activeMode, setActiveMode] = useState(heroModes[0].key)

  const text = (value) => (typeof value === 'string' ? value : value[language])
  const selectedMode = heroModes.find((mode) => mode.key === activeMode) || heroModes[0]

  return (
    <div className="landing">
      <section className="hero-shell">
        <div className="container">
          <div className="hero-panel">
            <div className="hero-orb hero-orb-left" />
            <div className="hero-orb hero-orb-right" />
            <div className="hero-ribbon hero-ribbon-a" />
            <div className="hero-ribbon hero-ribbon-b" />

            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker">KampusPay Lite</p>
                <h1 className="hero-title">
                  {t('landing.title').split('\n').map((line, index, lines) => (
                    <span key={line}>
                      {line}
                      {index < lines.length - 1 && <><br />{' '}</>}
                    </span>
                  ))}
                </h1>
                <p className="hero-subtitle">
                  {t('landing.subtitle')}
                </p>

                <div className="hero-cta">
                  <Link to="/create" className="btn btn-primary btn-lg">
                    {t('landing.createInvoice')}
                  </Link>
                  <Link to="/dashboard" className="btn btn-outline btn-lg">
                    {t('landing.openDashboard')}
                  </Link>
                </div>

                {connected ? (
                  <div className="hero-wallet-status">
                    <span className="wallet-dot-green" />
                    {t('landing.connectedAs', { wallet: shortenAddress(wallet) })}
                  </div>
                ) : (
                  <div className="hero-wallet-hint">
                    <span>{t('landing.walletReady')}</span>
                    <button
                      className="link-btn"
                      onClick={() => setWalletModalOpen(true)}
                      disabled={connecting}
                    >
                      {connecting ? t('landing.connecting') : t('landing.connectWallet')}
                    </button>
                  </div>
                )}
              </div>

              <div className="hero-visual">
                <div className="hero-product-card">
                  <div className="hero-product-head">
                    <div>
                      <span className="product-eyebrow">Live checkout</span>
                      <strong>KampusPay</strong>
                    </div>
                    <span className="product-status">Devnet</span>
                  </div>

                  <div className="product-balance">
                    <span>Total collected</span>
                    <strong>12.480 SOL</strong>
                    <small>+ IDR demo payments in review</small>
                  </div>

                  <div className="product-tabs" role="tablist" aria-label="KampusPay workflow preview">
                    {heroModes.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        className={activeMode === mode.key ? 'active' : ''}
                        onClick={() => setActiveMode(mode.key)}
                      >
                        {text(mode.label)}
                      </button>
                    ))}
                  </div>

                  <div className="product-preview">
                    <div className="preview-icon">
                      <img src={heroLayer} alt="" />
                    </div>
                    <div>
                      <h3>{text(selectedMode.title)}</h3>
                      <p>{text(selectedMode.desc)}</p>
                    </div>
                  </div>

                  <div className="checkout-panel">
                    <div className="checkout-row">
                      <span>Campus Event Ticket</span>
                      <strong>0.120 SOL</strong>
                    </div>
                    <div className="checkout-qr" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="checkout-progress">
                      <span style={{ width: activeMode === 'invoice' ? '38%' : activeMode === 'review' ? '68%' : '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="hero-side-note">
                  <div className="side-note-dot" />
                  <p>{t('landing.sideNote')}</p>
                  <Link to="/create" className="hero-join-link">
                    {t('landing.startNow')}
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-header section-header-left">
            <div className="section-tag">{t('landing.whyTag')}</div>
            <h2 className="section-title">{t('landing.whyTitle')}</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="card feature-card" key={text(feature.title)}>
                <div className="feature-index" />
                <h3 className="feature-title">{text(feature.title)}</h3>
                <p className="feature-desc">{text(feature.desc)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="showcase-grid">
            <div className="card showcase-card showcase-primary">
              <div className="section-tag">{t('landing.workflowTag')}</div>
              <h2 className="section-title">{t('landing.workflowTitle')}</h2>
              <div className="flow-list">
                {flows.map((flow) => (
                  <div className="flow-item" key={flow.step}>
                    <div className="flow-step">{flow.step}</div>
                    <div>
                      <h3>{text(flow.title)}</h3>
                      <p>{text(flow.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card showcase-card showcase-secondary">
              <div className="section-tag">{t('landing.useCasesTag')}</div>
              <h2 className="section-title">{t('landing.useCasesTitle')}</h2>
              <div className="usecase-list">
                {useCases.map((item) => (
                  <div className="usecase-pill" key={text(item)}>
                    {text(item)}
                  </div>
                ))}
              </div>
              <p className="showcase-note">
                {t('landing.useCasesNote')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <div className="section-tag">{t('landing.readyTag')}</div>
              <h2 className="cta-title">{t('landing.ctaTitle')}</h2>
              <p className="cta-sub">
                {t('landing.ctaSub')}
              </p>
            </div>
            <div className="cta-actions">
              <Link to="/create" className="btn btn-primary btn-lg">
                {t('landing.firstInvoice')}
              </Link>
              <button className="btn btn-ghost btn-lg" onClick={() => setWalletModalOpen(true)}>
                {t('landing.connectWalletShort')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
