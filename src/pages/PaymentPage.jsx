import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { QRCodeSVG } from 'qrcode.react'
import { getInvoiceById, replaceInvoice } from '../utils/invoiceStorage'
import {
  cancelOrderByInvoice,
  getOrderByInvoiceId,
  markOrderPaidByInvoice,
  reserveCashPaymentByInvoice,
  submitReviewPaymentByInvoice,
  uploadPaymentProof,
} from '../utils/marketplaceStorage'
import { formatPickupStatus, getPickupStatusTone } from '../utils/pickupCode'
import { sendSOL, getExplorerUrl, getTransactionLifecycle } from '../utils/solana'
import { getCategoryLabel } from '../utils/categories'
import {
  formatDeadline,
  formatInvoiceStatusLabel,
  getInvoiceLifecycleStatus,
  getInvoiceStatusTone,
  isInvoiceExpired,
} from '../utils/invoiceStatus'
import {
  CANCELLABLE_ORDER_STATUSES,
  PAYMENT_METHODS,
  buildQrisDemoContent,
  calculateDemoFiatAmount,
  formatIdr,
  formatPaymentMethod,
  formatPaymentStatus,
} from '../utils/paymentMethods'
import { shortenAddress } from '../hooks/useWallet'
import { useToast } from '../components/toastContext'
import FaucetModal from '../components/FaucetModal'
import WalletModal from '../components/WalletModal'
import './PaymentPage.css'

function getStepState({ completed, current }) {
  if (completed) return 'completed'
  if (current) return 'current'
  return 'upcoming'
}

function formatTimelineTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function buildPaymentTimeline(invoice, marketplaceOrder) {
  if (!invoice) return []

  const method = invoice.paymentMethod || 'solana'
  const status = invoice.status || 'unpaid'
  const isMarketplace = Boolean(marketplaceOrder || invoice.productId)
  const isSubmitted = ['pending', 'payment_review', 'cash_pending', 'paid', 'paid_demo'].includes(status)
  const isConfirmed = ['paid', 'paid_demo'].includes(status)
  const isReview = status === 'payment_review'
  const isCashPending = status === 'cash_pending'
  const hasPickupCode = Boolean(marketplaceOrder?.pickupCode)
  const isPickedUp = marketplaceOrder?.pickupStatus === 'picked_up'

  const submitLabel = method === 'solana'
    ? 'Wallet Payment Submitted'
    : method === 'cash_on_pickup'
      ? 'Order Reserved'
      : 'Demo Payment Submitted'
  const submitDescription = method === 'solana'
    ? 'Wallet transaction is sent to Solana Devnet.'
    : method === 'cash_on_pickup'
      ? 'Student reserved the order and will pay at pickup.'
      : 'Student submitted a demo QRIS or bank payment for seller review.'

  const confirmLabel = method === 'solana'
    ? 'On-chain Confirmed'
    : method === 'cash_on_pickup'
      ? 'Cash Confirmed by Seller'
      : 'Seller Confirmed Demo Payment'
  const confirmDescription = method === 'solana'
    ? 'Transaction is verified on Solana Devnet.'
    : method === 'cash_on_pickup'
      ? 'Seller confirms cash payment when handing over the item.'
      : 'Seller marks the demo payment as Paid Demo.'

  const steps = [
    {
      key: 'created',
      title: 'Invoice Created',
      description: 'Payment link is ready to share.',
      time: formatTimelineTime(invoice.createdAt),
      state: 'completed',
    },
    {
      key: 'submitted',
      title: submitLabel,
      description: submitDescription,
      time: method === 'solana' && status === 'pending' ? 'Waiting confirmation' : '',
      state: getStepState({
        completed: isSubmitted,
        current: status === 'unpaid',
      }),
    },
    {
      key: 'confirmed',
      title: confirmLabel,
      description: confirmDescription,
      time: formatTimelineTime(invoice.paidAt),
      state: getStepState({
        completed: isConfirmed,
        current: status === 'pending' || isReview || isCashPending,
      }),
    },
  ]

  if (isMarketplace) {
    steps.push(
      {
        key: 'ready',
        title: 'Ready for Pickup',
        description: 'Pickup code is available for seller verification.',
        time: hasPickupCode ? marketplaceOrder.pickupCode : '',
        state: getStepState({
          completed: hasPickupCode,
          current: isConfirmed && !hasPickupCode,
        }),
      },
      {
        key: 'picked_up',
        title: 'Picked Up',
        description: 'Seller has handed over the item.',
        time: isPickedUp ? formatTimelineTime(marketplaceOrder?.paidAt || invoice.paidAt) : '',
        state: getStepState({
          completed: isPickedUp,
          current: hasPickupCode && !isPickedUp,
        }),
      }
    )
  }

  if (status === 'cancelled' || status === 'failed') {
    return [
      steps[0],
      {
        key: 'stopped',
        title: status === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed',
        description: invoice.txError || invoice.paymentNote || 'This invoice needs a new payment attempt or manual follow-up.',
        time: '',
        state: 'current',
      },
    ]
  }

  return steps
}

export default function PaymentPage() {
  const { invoiceId } = useParams()
  const { publicKey, connected, connecting, sendTransaction, signTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const toast = useToast()
  const walletAddress = publicKey?.toString()
  const [paying, setPaying] = useState(false)
  const [txError, setTxError] = useState(null)
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [faucetModalOpen, setFaucetModalOpen] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [marketplaceOrder, setMarketplaceOrder] = useState(null)
  const [loadingInvoice, setLoadingInvoice] = useState(true)
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('solana')
  const [proofFile, setProofFile] = useState(null)
  const [methodSubmitting, setMethodSubmitting] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(false)

  const lifecycleStatus = useMemo(() => getInvoiceLifecycleStatus(invoice), [invoice])
  const fiatAmount = useMemo(() => invoice?.fiatAmount || calculateDemoFiatAmount(invoice?.amount), [invoice])
  const merchantName = marketplaceOrder?.product?.seller?.storeName || 'KampusPay Demo Seller'
  const isMarketplacePayment = Boolean(marketplaceOrder || invoice?.productId)
  const isCompleted = ['paid', 'paid_demo'].includes(invoice?.status) || lifecycleStatus === 'confirmed'
  const isBlocked = lifecycleStatus === 'expired' || lifecycleStatus === 'failed' || lifecycleStatus === 'cancelled'
  const isAwaitingReview = invoice?.status === 'payment_review'
  const isCashPending = invoice?.status === 'cash_pending'
  const canChooseMethod = !isCompleted && !isBlocked && !isAwaitingReview && !isCashPending
  const canCancelOrder = isMarketplacePayment
    && !isCompleted
    && !isBlocked
    && (
      CANCELLABLE_ORDER_STATUSES.has(marketplaceOrder?.status)
      || invoice?.status === 'unpaid'
    )
  const paymentTimeline = useMemo(
    () => buildPaymentTimeline(invoice, marketplaceOrder),
    [invoice, marketplaceOrder]
  )

  useEffect(() => {
    if (!invoiceId) return undefined
    let ignore = false

    async function loadInvoice() {
      try {
        const latestInvoice = await getInvoiceById(invoiceId)
        let latestOrder = null
        if (latestInvoice?.sellerId || latestInvoice?.productId) {
          latestOrder = await getOrderByInvoiceId(invoiceId)
        }
        if (!ignore) {
          setInvoice(latestInvoice)
          setMarketplaceOrder(latestOrder)
          setSelectedMethod(latestInvoice?.paymentMethod || 'solana')
        }
      } catch (error) {
        if (!ignore) toast.error(error.message || 'Invoice not found or failed to load.')
      } finally {
        if (!ignore) setLoadingInvoice(false)
      }
    }

    loadInvoice()

    const intervalId = window.setInterval(() => {
      getInvoiceById(invoiceId)
        .then((latestInvoice) => {
          if (!latestInvoice) return null
          if (latestInvoice.sellerId || latestInvoice.productId) {
            return getOrderByInvoiceId(invoiceId).then((latestOrder) => ({ latestInvoice, latestOrder }))
          }
          return { latestInvoice, latestOrder: null }
        })
        .then((payload) => {
          if (!ignore && payload?.latestInvoice) {
            setInvoice(payload.latestInvoice)
            setMarketplaceOrder(payload.latestOrder)
          }
        })
        .catch((error) => {
          if (!ignore) toast.error(error.message || 'Failed to refresh invoice.')
        })
    }, 6000)

    return () => {
      ignore = true
      window.clearInterval(intervalId)
    }
  }, [invoiceId, toast])

  const refreshInvoiceAndOrder = async () => {
    const latestInvoice = await getInvoiceById(invoiceId)
    const latestOrder = latestInvoice?.sellerId || latestInvoice?.productId
      ? await getOrderByInvoiceId(invoiceId)
      : null
    setInvoice(latestInvoice)
    setMarketplaceOrder(latestOrder)
    return { latestInvoice, latestOrder }
  }

  const refreshTransactionStatus = async (showToast = false) => {
    try {
      const latestInvoice = await getInvoiceById(invoiceId)
      if (!latestInvoice?.txSignature) {
        if (showToast) toast.info('No transaction found yet for this invoice.')
        setInvoice(latestInvoice)
        return
      }

      setRefreshingStatus(true)
      const result = await getTransactionLifecycle(latestInvoice.txSignature, connection)
      const nextStatus =
        result.status === 'confirmed'
          ? 'paid'
          : result.status === 'failed'
            ? 'failed'
            : latestInvoice.status === 'paid' || latestInvoice.status === 'confirmed'
              ? latestInvoice.status
              : 'pending'

      const updatedInvoice = await replaceInvoice(invoiceId, {
        ...latestInvoice,
        status: nextStatus,
        txError: result.error,
      })
      setInvoice(updatedInvoice)

      if (showToast) {
        toast.info(`Transaction status: ${formatInvoiceStatusLabel(nextStatus)}`)
      }
    } catch (error) {
      if (showToast) toast.error(error.message || 'Failed to refresh transaction status.')
    } finally {
      setRefreshingStatus(false)
    }
  }

  const handlePay = async () => {
    if (!invoice) return

    setTxError(null)

    if (!connected || !walletAddress) {
      setTxError('Please connect your Solana wallet first.')
      return
    }

    if (isInvoiceExpired(invoice)) {
      setTxError('This invoice has expired and can no longer be paid.')
      return
    }

    if (walletAddress.toLowerCase() === invoice.receiver.toLowerCase()) {
      setTxError('You cannot pay your own invoice. Use a different wallet.')
      return
    }

    try {
      setPaying(true)
      const pendingInvoice = await replaceInvoice(invoiceId, {
        ...invoice,
        status: 'pending',
        paymentMethod: 'solana',
        paidBy: walletAddress,
        buyerWallet: walletAddress,
      })
      setInvoice(pendingInvoice)
      toast.info('Transaction submitted to wallet. Waiting for confirmation...')

      const signature = await sendSOL(
        walletAddress,
        invoice.receiver,
        invoice.amount,
        sendTransaction,
        signTransaction,
        connection
      )

      const paidAt = new Date().toISOString()
      const confirmedInvoice = await replaceInvoice(invoiceId, {
        ...pendingInvoice,
        status: 'paid',
        paymentMethod: 'solana',
        txSignature: signature,
        paidAt,
        paidBy: walletAddress,
        buyerWallet: walletAddress,
      })

      if (confirmedInvoice.sellerId || confirmedInvoice.productId) {
        const paidOrder = await markOrderPaidByInvoice(invoiceId, paidAt, { buyerWallet: walletAddress })
        setMarketplaceOrder(paidOrder)
      }

      setInvoice(confirmedInvoice)
      toast.success('Payment confirmed on Solana Devnet.')
    } catch (error) {
      setTxError(error.message || 'Transaction failed. Please try again.')
      toast.error(error.message || 'Transaction failed.')
      const latestInvoice = await getInvoiceById(invoiceId)
      if (latestInvoice?.status === 'pending' && !latestInvoice.txSignature) {
        const resetInvoice = await replaceInvoice(invoiceId, {
          ...latestInvoice,
          status: isInvoiceExpired(latestInvoice) ? 'expired' : 'unpaid',
        })
        setInvoice(resetInvoice)
      }
    } finally {
      setPaying(false)
    }
  }

  const submitReviewPayment = async (paymentMethod) => {
    if (!invoice) return
    setTxError(null)

    try {
      setMethodSubmitting(true)
      let paymentProofUrl = ''
      if (proofFile) {
        try {
          paymentProofUrl = await uploadPaymentProof(proofFile, invoice.id)
        } catch (error) {
          throw new Error(error.message || 'Failed to upload payment proof.', { cause: error })
        }
      }

      await submitReviewPaymentByInvoice(invoiceId, {
        paymentMethod,
        fiatAmount,
        fiatCurrency: 'IDR',
        paymentProofUrl,
        paymentNote: `${paymentMethod === 'qris' ? 'QRIS' : 'Bank transfer'} demo payment submitted for review`,
      })
      await refreshInvoiceAndOrder()
      setProofFile(null)
      toast.success(`${paymentMethod === 'qris' ? 'QRIS' : 'Bank transfer'} demo payment submitted for seller review.`)
    } catch (error) {
      const message = paymentMethod === 'qris'
        ? 'Failed to submit QRIS payment.'
        : 'Failed to submit bank transfer payment.'
      setTxError(error.message || message)
      toast.error(error.message || message)
    } finally {
      setMethodSubmitting(false)
    }
  }

  const reserveCashPayment = async () => {
    if (!invoice) return
    setTxError(null)

    try {
      setMethodSubmitting(true)
      await reserveCashPaymentByInvoice(invoiceId)
      await refreshInvoiceAndOrder()
      toast.success('Order reserved for cash on pickup.')
    } catch (error) {
      setTxError(error.message || 'Failed to reserve cash payment.')
      toast.error(error.message || 'Failed to reserve cash payment.')
    } finally {
      setMethodSubmitting(false)
    }
  }

  const cancelOrder = async () => {
    if (!invoiceId || !canCancelOrder) return
    const confirmed = window.confirm('Batalkan order ini? Status transaksi akan berubah menjadi cancelled.')
    if (!confirmed) return

    try {
      setCancellingOrder(true)
      setTxError(null)
      const result = await cancelOrderByInvoice(invoiceId)
      setInvoice(result.invoice)
      setMarketplaceOrder(result.order)
      toast.success('Order berhasil dibatalkan.')
    } catch (error) {
      setTxError(error.message || 'Gagal membatalkan order.')
      toast.error(error.message || 'Gagal membatalkan order.')
    } finally {
      setCancellingOrder(false)
    }
  }

  if (loadingInvoice) {
    return (
      <div className="page flex-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div className="spinner" />
        <h2>Loading Invoice</h2>
        <p className="text-secondary">Fetching payment details from Supabase.</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="page flex-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>?</div>
        <h2>Invoice Not Found</h2>
        <p className="text-secondary">
          Invoice ID <code>{invoiceId}</code> does not exist.
        </p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    )
  }

  const qrisContent = buildQrisDemoContent({ invoiceId: invoice.id, fiatAmount, merchant: merchantName })

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="pay-header">
          <Link to="/" className="back-link">Back to KampusPay Lite</Link>
          <div className="pay-network-badge">
            <span className="badge-dot" style={{ background: '#9945ff' }} />
            Solana Devnet primary
          </div>
        </div>

        <div className="card pay-card">
          <div className={`status-banner ${isCompleted ? 'paid' : 'unpaid'}`}>
            <span>{formatPaymentStatus(invoice.status, invoice.paymentMethod)}</span>
            <span className={`badge badge-${getInvoiceStatusTone(lifecycleStatus)}`}>
              {formatInvoiceStatusLabel(lifecycleStatus)}
            </span>
          </div>

          <div className="pay-invoice-head">
            <div className="pay-category">{getCategoryLabel(invoice.category)}</div>
            <h1 className="pay-title">{invoice.title}</h1>
            {invoice.description && (
              <p className="pay-desc">{invoice.description}</p>
            )}
          </div>

          <div className="pay-amount-box">
            <div className="pay-amount-label">Amount to Pay</div>
            <div className="pay-amount">{invoice.amount} <span>SOL</span></div>
            <div className="pay-amount-hint">Demo estimate: {formatIdr(fiatAmount)} at 1 SOL = {formatIdr(1000000)}.</div>
          </div>

          <div className="divider" />

          <div className="invoice-details">
            <div className="detail-row">
              <span className="detail-label">Invoice ID</span>
              <code className="font-mono">{invoice.id}</code>
            </div>
            <div className="detail-row">
              <span className="detail-label">Receiver</span>
              <a
                className="detail-address font-mono"
                href={`https://explorer.solana.com/address/${invoice.receiver}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortenAddress(invoice.receiver)}
              </a>
            </div>
            <div className="detail-row">
              <span className="detail-label">Payment Method</span>
              <span>{formatPaymentMethod(invoice.paymentMethod)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span>{new Date(invoice.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Deadline</span>
              <span>{formatDeadline(invoice.expiresAt)}</span>
            </div>
            {invoice.payerName && (
              <div className="detail-row">
                <span className="detail-label">Payer</span>
                <span>{invoice.payerName}{invoice.payerId ? ` - ${invoice.payerId}` : ''}</span>
              </div>
            )}
            {isCompleted && invoice.paidAt && (
              <div className="detail-row">
                <span className="detail-label">Paid At</span>
                <span>{new Date(invoice.paidAt).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {invoice.notes && (
            <>
              <div className="divider" />
              <div className="pay-note-card">
                <div className="detail-label">Treasurer Notes</div>
                <p className="pay-desc">{invoice.notes}</p>
              </div>
            </>
          )}

          <div className="payment-timeline mt-4">
            <div className="timeline-head">
              <div>
                <span className="detail-label">Order Timeline</span>
                <h2>Payment progress</h2>
              </div>
              <span className="badge badge-muted">{formatPaymentMethod(invoice.paymentMethod)}</span>
            </div>
            <ol className="timeline-list">
              {paymentTimeline.map((step) => (
                <li className={`timeline-item ${step.state}`} key={step.key}>
                  <span className="timeline-marker" />
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                    {step.time && <small>{step.time}</small>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {isCompleted && (
            <div className="payment-success-card mt-4">
              <div>
                <span className="detail-label">Payment Successful</span>
                <h2>{invoice.paymentMethod === 'solana' ? 'Payment confirmed on Solana Devnet.' : 'Paid Demo confirmed by seller.'}</h2>
                <p className="text-secondary">
                  {isMarketplacePayment
                    ? 'Show this code to the seller to collect your item.'
                    : 'Your invoice is marked paid in KampusPay Lite.'}
                </p>
              </div>
              {invoice.txSignature && (
                <div className="success-reference">
                  <span>Transaction</span>
                  <a href={getExplorerUrl(invoice.txSignature)} target="_blank" rel="noopener noreferrer">
                    {shortenAddress(invoice.txSignature)}
                  </a>
                </div>
              )}
              {invoice.paymentMethod !== 'solana' && (
                <div className="success-reference">
                  <span>Method</span>
                  <strong>{formatPaymentStatus(invoice.status, invoice.paymentMethod)}</strong>
                </div>
              )}
              {isMarketplacePayment && (
                <div className="pickup-code-panel">
                  <span>Pickup Code</span>
                  <strong>{marketplaceOrder?.pickupCode || '-'}</strong>
                  <small className={`badge badge-${getPickupStatusTone(marketplaceOrder?.pickupStatus)}`}>
                    {formatPickupStatus(marketplaceOrder?.pickupStatus)}
                  </small>
                </div>
              )}
            </div>
          )}

          {(isAwaitingReview || isCashPending) && (
            <div className="alert alert-info mt-4">
              <span>Status</span>
              <div>
                <strong>{formatPaymentStatus(invoice.status, invoice.paymentMethod)}</strong>
                <p className="text-sm mt-4">
                  {isAwaitingReview
                    ? 'Seller confirmation required. This demo payment is not a real gateway transaction.'
                    : 'Your order is reserved. Pay the seller directly when collecting the item.'}
                </p>
                {marketplaceOrder?.pickupCode && (
                  <p className="text-sm mt-4">Pickup code: <code>{marketplaceOrder.pickupCode}</code></p>
                )}
              </div>
            </div>
          )}

          {canCancelOrder && (
            <div className="alert alert-warning mt-4">
              <span>Cancel</span>
              <div>
                <strong>Belum ingin melanjutkan transaksi?</strong>
                <p className="text-sm mt-4">
                  Kamu bisa membatalkan order selama pembayaran belum dikonfirmasi.
                </p>
                <button
                  className="btn btn-danger btn-sm mt-4"
                  onClick={cancelOrder}
                  disabled={cancellingOrder || paying || methodSubmitting}
                >
                  {cancellingOrder ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          )}

          {invoice.txSignature && (
            <div className="alert alert-info mt-4">
              <div>
                <strong>Transaction reference</strong>
                <p className="text-sm mt-4">
                  TX:{' '}
                  <a
                    href={getExplorerUrl(invoice.txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    {shortenAddress(invoice.txSignature)}
                  </a>
                </p>
                <div className="pay-status-actions">
                  <a
                    href={getExplorerUrl(invoice.txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success btn-sm"
                  >
                    View on explorer
                  </a>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => refreshTransactionStatus(true)}
                    disabled={refreshingStatus}
                  >
                    {refreshingStatus ? 'Refreshing...' : 'Refresh status'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {txError && (
            <div className="alert alert-error mt-4">
              <span>!</span>
              <div style={{ whiteSpace: 'pre-line' }}>{txError}</div>
            </div>
          )}

          {isBlocked && (
            <div className="alert alert-warning mt-4">
              <span>Status</span>
              <span>
                {lifecycleStatus === 'expired'
                  ? 'This invoice has passed its deadline and payment is locked.'
                  : 'This invoice needs manual review before it can be paid again.'}
              </span>
            </div>
          )}

          <div className="divider" />

          {canChooseMethod && (
            <div className="pay-actions">
              <div>
                <h2 className="method-section-title">Choose Payment Method</h2>
                <div className="payment-method-grid">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`payment-method-card ${selectedMethod === method.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <span>{method.title}</span>
                      <small>{method.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod === 'solana' && (
                <div className="method-panel">
                  <div>
                    <h3>On-chain payment</h3>
                    <p className="text-secondary">Verified on Solana Devnet with a public Explorer transaction.</p>
                  </div>
                  {!connected ? (
                    <>
                      <div className="alert alert-info">
                        <span>Wallet</span>
                        <span>Connect your Solana wallet to pay this invoice.</span>
                      </div>
                      <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={() => setWalletModalOpen(true)}
                        disabled={connecting}
                      >
                        {connecting
                          ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Connecting...</>
                          : 'Connect Wallet to Pay'
                        }
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="pay-wallet-info">
                        {wallet?.adapter?.icon && (
                          <img
                            src={wallet.adapter.icon}
                            alt={wallet.adapter.name}
                            style={{ width: 18, height: 18, borderRadius: 4 }}
                          />
                        )}
                        <span className="wallet-dot" />
                        {wallet?.adapter?.name} - <code className="font-mono">{shortenAddress(walletAddress)}</code>
                      </div>
                      <button
                        className="btn btn-success btn-full btn-lg"
                        onClick={handlePay}
                        disabled={paying || isBlocked}
                      >
                        {paying
                          ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Sending {invoice.amount} SOL...</>
                          : `Pay ${invoice.amount} SOL now`
                        }
                      </button>
                      <div className="pay-secondary-actions">
                        <button
                          className="btn btn-outline btn-full"
                          onClick={() => setFaucetModalOpen(true)}
                        >
                          Need Devnet SOL? Open faucet
                        </button>
                        <button
                          className="btn btn-ghost btn-full"
                          onClick={() => refreshTransactionStatus(true)}
                          disabled={refreshingStatus}
                        >
                          {refreshingStatus ? 'Refreshing status...' : 'Check status manually'}
                        </button>
                        <p className="pay-faucet-hint">
                          This page auto-refreshes invoice data from Supabase and lets you re-check on-chain confirmation.
                        </p>
                      </div>
                      <p className="pay-note">
                        Your wallet will ask for confirmation. Network: Devnet.
                      </p>
                    </>
                  )}
                </div>
              )}

              {selectedMethod === 'qris' && (
                <div className="method-panel">
                  <div className="demo-payment-head">
                    <div>
                      <h3>QRIS Simulation</h3>
                      <p className="text-secondary">Demo only - not a real QRIS transaction. Seller confirmation required.</p>
                    </div>
                    <span className="badge badge-purple">MVP Demo</span>
                  </div>
                  <div className="qris-demo-grid">
                    <div className="qris-box">
                      <QRCodeSVG value={qrisContent} size={188} includeMargin />
                    </div>
                    <div className="demo-instructions">
                      <div><span>Merchant</span><strong>{merchantName}</strong></div>
                      <div><span>SOL Amount</span><strong>{invoice.amount} SOL</strong></div>
                      <div><span>Estimated IDR</span><strong>{formatIdr(fiatAmount)}</strong></div>
                      <div><span>QRIS Demo Code</span><code>{qrisContent}</code></div>
                    </div>
                  </div>
                  <label className="proof-upload">
                    <span>Optional proof image</span>
                    <input type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
                  </label>
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => submitReviewPayment('qris')}
                    disabled={methodSubmitting}
                  >
                    {methodSubmitting ? 'Submitting...' : 'I Have Paid'}
                  </button>
                </div>
              )}

              {selectedMethod === 'cash_on_pickup' && (
                <div className="method-panel">
                  <h3>Cash on Pickup</h3>
                  <p className="text-secondary">
                    Your order will be reserved. Please pay the seller directly when collecting the item.
                  </p>
                  {!isMarketplacePayment && (
                    <div className="alert alert-warning">
                      <span>Note</span>
                      <span>Cash on Pickup works best for marketplace orders with a seller pickup flow.</span>
                    </div>
                  )}
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={reserveCashPayment}
                    disabled={methodSubmitting}
                  >
                    {methodSubmitting ? 'Reserving...' : 'Reserve Order'}
                  </button>
                </div>
              )}

              {selectedMethod === 'bank_transfer' && (
                <div className="method-panel">
                  <div className="demo-payment-head">
                    <div>
                      <h3>Bank Transfer Simulation</h3>
                      <p className="text-secondary">Use demo bank transfer instructions and confirm manually.</p>
                    </div>
                    <span className="badge badge-cyan">Demo</span>
                  </div>
                  <div className="demo-instructions bank-demo">
                    <div><span>Bank</span><strong>Bank Kampus Demo</strong></div>
                    <div><span>Account Number</span><strong className="font-mono">1234567890</strong></div>
                    <div><span>Account Name</span><strong>KampusPay Demo</strong></div>
                    <div><span>Amount</span><strong>{formatIdr(fiatAmount)}</strong></div>
                  </div>
                  <label className="proof-upload">
                    <span>Optional proof image</span>
                    <input type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
                  </label>
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => submitReviewPayment('bank_transfer')}
                    disabled={methodSubmitting}
                  >
                    {methodSubmitting ? 'Submitting...' : 'I Have Transferred'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pay-footer">
          <span>Powered by</span>
          <strong>KampusPay Lite</strong>
          <span>-</span>
          <span>Solana Devnet and demo local payment methods</span>
        </div>
      </div>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      <FaucetModal isOpen={faucetModalOpen} onClose={() => setFaucetModalOpen(false)} />
    </div>
  )
}
