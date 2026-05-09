import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useWallet } from '@solana/wallet-adapter-react'
import { saveInvoice, generateInvoiceId } from '../utils/invoiceStorage'
import { CATEGORIES } from '../utils/categories'
import { getAddressExplorerUrl } from '../utils/solana'
import { formatDeadline } from '../utils/invoiceStatus'
import { getCurrentTimestamp } from '../utils/time'
import { shortenAddress } from '../hooks/useWallet'
import { useToast } from '../components/toastContext'
import WalletModal from '../components/WalletModal'
import { useI18n } from '../i18n/LanguageProvider'
import './CreateInvoicePage.css'

export default function CreateInvoicePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { publicKey, connected } = useWallet()
  const toast = useToast()
  const wallet = publicKey?.toString()
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  const [form, setForm] = useState({
    title: searchParams.get('title') || '',
    description: searchParams.get('description') || '',
    amount: searchParams.get('amount') || '',
    category: searchParams.get('category') || 'class-fee',
    receiver: searchParams.get('receiver') || wallet || '',
    expiresAt: '',
    payerName: '',
    payerId: '',
    notes: searchParams.get('notes') || '',
  })
  const [errors, setErrors] = useState({})
  const [createdInvoice, setCreatedInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const receiverAddress = form.receiver.trim()
  const receiverIsValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(receiverAddress)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = (now) => {
    const nextErrors = {}

    if (!form.title.trim()) nextErrors.title = 'Invoice title is required'
    if (!form.amount || Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      nextErrors.amount = 'Enter a valid SOL amount greater than 0'
    }
    if (!receiverAddress) {
      nextErrors.receiver = 'Receiver wallet address is required'
    } else if (!receiverIsValid) {
      nextErrors.receiver = 'Invalid Solana wallet address'
    }
    if (form.expiresAt) {
      const expiresAtMs = new Date(form.expiresAt).getTime()
      if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
        nextErrors.expiresAt = 'Deadline must be in the future'
      }
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(getCurrentTimestamp())
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast.error('Please fix the invoice form first.')
      return
    }

    const invoice = {
      id: generateInvoiceId(),
      title: form.title.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category,
      receiver: receiverAddress,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      txSignature: null,
      paidAt: null,
      paidBy: null,
      payerName: form.payerName.trim(),
      payerId: form.payerId.trim(),
      notes: form.notes.trim(),
    }

    try {
      setSaving(true)
      const savedInvoice = await saveInvoice(invoice)
      setCreatedInvoice(savedInvoice)
      toast.success('Invoice created successfully.')
    } catch (error) {
      toast.error(error.message || 'Failed to save invoice to Supabase.')
    } finally {
      setSaving(false)
    }
  }

  const paymentUrl = createdInvoice
    ? `${window.location.origin}/pay/${createdInvoice.id}`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
    toast.success('Payment link copied.')
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdInvoice) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="card success-invoice-card">
            <div className="success-header">
              <div className="success-icon">+</div>
              <h2>{t('invoice.created')}</h2>
              <p className="text-secondary">{t('invoice.createdSub')}</p>
            </div>

            <div className="invoice-summary">
              <div className="summary-row"><span>{t('invoice.title').replace(' *', '')}</span><strong>{createdInvoice.title}</strong></div>
              <div className="summary-row"><span>{t('invoice.amountLabel')}</span><strong className="text-accent">{createdInvoice.amount} SOL</strong></div>
              <div className="summary-row"><span>{t('invoice.invoiceId')}</span><code className="font-mono">{createdInvoice.id}</code></div>
              <div className="summary-row"><span>{t('invoice.category').replace(' *', '')}</span><span>{createdInvoice.category}</span></div>
              <div className="summary-row"><span>{t('invoice.deadline')}</span><span>{formatDeadline(createdInvoice.expiresAt)}</span></div>
            </div>

            <div className="divider" />

            <div className="link-section">
              <label className="form-label">{t('invoice.paymentLink')}</label>
              <div className="link-copy-row">
                <input className="form-input" value={paymentUrl} readOnly />
                <button className="btn btn-primary btn-sm" onClick={copyLink}>
                  {copied ? t('invoice.copied') : t('invoice.copy')}
                </button>
              </div>
            </div>

            <div className="qr-section">
              <label className="form-label">{t('invoice.qrCode')}</label>
              <div className="qr-wrapper">
                <QRCodeCanvas
                  value={paymentUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#13162a"
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted text-center">{t('invoice.scanHint')}</p>
            </div>

            <div className="divider" />

            <div className="success-actions">
              <button className="btn btn-outline btn-full" onClick={() => setCreatedInvoice(null)}>
                {t('invoice.createAnother')}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin')}>
                {t('invoice.adminDashboard')}
              </button>
              <button className="btn btn-primary btn-full" onClick={() => navigate(`/pay/${createdInvoice.id}`)}>
                {t('invoice.viewPayment')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 840 }}>
        <div className="page-header">
          <h1 className="page-title">{t('invoice.createTitle')}</h1>
          <p className="page-sub">{t('invoice.createSub')}</p>
        </div>

        {!connected && (
          <div className="alert alert-info mb-6">
            <span>{t('invoice.info')}</span>
            <span>
              {t('invoice.connectInfo')}{' '}
              <button className="link-btn" onClick={() => setWalletModalOpen(true)}>
                {t('invoice.connectNow')}
              </button>
            </span>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('invoice.title')}</label>
              <input
                className="form-input"
                name="title"
                placeholder={t('invoice.titlePlaceholder')}
                value={form.title}
                onChange={handleChange}
                maxLength={100}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">{t('invoice.description')}</label>
              <textarea
                className="form-textarea"
                name="description"
                placeholder={t('invoice.descriptionPlaceholder')}
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('invoice.amount')}</label>
                <input
                  className="form-input"
                  name="amount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.1"
                  value={form.amount}
                  onChange={handleChange}
                />
                {errors.amount && <span className="form-error">{errors.amount}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">{t('invoice.category')}</label>
                <select
                  className="form-select"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <div className="label-row">
                  <label className="form-label">{t('invoice.receiver')}</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => connected ? setForm((prev) => ({ ...prev, receiver: wallet })) : setWalletModalOpen(true)}
                  >
                    {connected ? t('invoice.useMyWallet') : t('landing.connectWalletShort')}
                  </button>
                </div>
                <input
                  className="form-input"
                  name="receiver"
                  placeholder={t('invoice.receiverPlaceholder')}
                  value={form.receiver}
                  onChange={handleChange}
                  style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
                {errors.receiver && <span className="form-error">{errors.receiver}</span>}
                {receiverAddress && (
                  <div className={`receiver-preview ${receiverIsValid ? 'valid' : 'invalid'}`}>
                    <span>{receiverIsValid ? t('invoice.verifiedWallet', { wallet: shortenAddress(receiverAddress) }) : t('invoice.invalidAddress')}</span>
                    {receiverIsValid && (
                      <a href={getAddressExplorerUrl(receiverAddress)} target="_blank" rel="noopener noreferrer">
                        {t('invoice.openExplorer')}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('invoice.deadline')}</label>
                <input
                  className="form-input"
                  name="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={handleChange}
                />
                {errors.expiresAt && <span className="form-error">{errors.expiresAt}</span>}
                <span className="form-hint">{t('invoice.deadlineHint')}</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('invoice.payerName')}</label>
                <input
                  className="form-input"
                  name="payerName"
                  placeholder={t('invoice.payerNamePlaceholder')}
                  value={form.payerName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('invoice.payerId')}</label>
                <input
                  className="form-input"
                  name="payerId"
                  placeholder="e.g. 231011234"
                  value={form.payerId}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('invoice.notes')}</label>
              <textarea
                className="form-textarea"
                name="notes"
                placeholder={t('invoice.notesPlaceholder')}
                value={form.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 8 }}
              disabled={saving}
            >
              {saving ? t('invoice.saving') : t('invoice.generate')}
            </button>
          </form>
        </div>
      </div>
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  )
}
