import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { shortenAddress } from '../hooks/useWallet'
import WalletModal from '../components/WalletModal'
import { useI18n } from '../i18n/LanguageProvider'
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

const stats = [
  { label: 'UX', value: { en: 'Clean and smooth', id: 'Rapi dan mulus' } },
  { label: { en: 'Proof', id: 'Bukti' }, value: { en: 'On-chain verification', id: 'Verifikasi on-chain' } },
  { label: 'Mode', value: 'Solana Devnet' },
]

const useCases = [
  { en: 'Class contribution', id: 'Iuran kelas' },
  { en: 'Student organization dues', id: 'Iuran organisasi mahasiswa' },
  { en: 'Ticketing and events', id: 'Tiket dan event' },
  { en: 'Donation drives', id: 'Penggalangan donasi' },
  { en: 'Campus merchant pilots', id: 'Uji coba merchant kampus' },
  { en: 'Temporary cashier booths', id: 'Kasir sementara' },
]

export default function LandingPage() {
  const { language, t } = useI18n()
  const { publicKey, connected, connecting } = useWallet()
  const wallet = publicKey?.toString()
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  const text = (value) => (typeof value === 'string' ? value : value[language])

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
                {t('landing.badge')}
              </div>
              <div className="hero-mini-nav">
                <span>{t('landing.heroNav.invoices')}</span>
                <span>{t('landing.heroNav.collections')}</span>
                <span>{t('landing.heroNav.devnet')}</span>
              </div>
            </div>

            <div className="hero-grid">
              <div className="hero-copy">
                <p className="hero-kicker">KampusPay Lite</p>
                <h1 className="hero-title">
                  {t('landing.title').split('\n').map((line) => (
                    <span key={line}>{line}<br /></span>
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
                <div className="hero-discs">
                  <div className="hero-disc hero-disc-back" />
                  <div className="hero-disc hero-disc-mid" />
                  <div className="hero-disc hero-disc-front" />
                </div>

                <div className="hero-side-note">
                  <p>
                    {t('landing.sideNote')}
                  </p>
                  <Link to="/create" className="hero-join-link">
                    {t('landing.startNow')}
                  </Link>
                </div>
              </div>
            </div>

            <div className="hero-stats">
              {stats.map((item) => (
                <div className="hero-stat" key={text(item.label)}>
                  <span className="hero-stat-label">{text(item.label)}</span>
                  <strong>{text(item.value)}</strong>
                </div>
              ))}
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
              <article className="card feature-card" key={feature.title}>
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
