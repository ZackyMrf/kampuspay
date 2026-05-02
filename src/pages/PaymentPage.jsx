import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { getInvoiceById, replaceInvoice } from '../utils/invoiceStorage'
import { sendSOL, getExplorerUrl, getTransactionLifecycle } from '../utils/solana'
import { getCategoryLabel } from '../utils/categories'
import {
  formatDeadline,
  formatInvoiceStatusLabel,
  getInvoiceLifecycleStatus,
  getInvoiceStatusTone,
  isInvoiceExpired,
} from '../utils/invoiceStatus'
import { shortenAddress } from '../hooks/useWallet'
import { useToast } from '../components/toastContext'
import FaucetModal from '../components/FaucetModal'
import WalletModal from '../components/WalletModal'
import './PaymentPage.css'

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
  const [invoice, setInvoice] = useState(() => getInvoiceById(invoiceId))
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  const lifecycleStatus = useMemo(() => getInvoiceLifecycleStatus(invoice), [invoice])

  useEffect(() => {
    if (!invoiceId) return undefined

    const intervalId = window.setInterval(() => {
      const latestInvoice = getInvoiceById(invoiceId)
      if (latestInvoice) setInvoice(latestInvoice)
    }, 6000)

    return () => window.clearInterval(intervalId)
  }, [invoiceId])

  const refreshTransactionStatus = async (showToast = false) => {
    const latestInvoice = getInvoiceById(invoiceId)
    if (!latestInvoice?.txSignature) {
      if (showToast) toast.info('No transaction found yet for this invoice.')
      setInvoice(latestInvoice)
      return
    }

    try {
      setRefreshingStatus(true)
      const result = await getTransactionLifecycle(latestInvoice.txSignature, connection)
      const nextStatus =
        result.status === 'confirmed'
          ? 'confirmed'
          : result.status === 'failed'
            ? 'failed'
            : latestInvoice.status === 'confirmed'
              ? 'confirmed'
              : 'pending'

      const updatedInvoice = replaceInvoice(invoiceId, {
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
      const pendingInvoice = replaceInvoice(invoiceId, {
        ...invoice,
        status: 'pending',
        paidBy: walletAddress,
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

      const confirmedInvoice = replaceInvoice(invoiceId, {
        ...pendingInvoice,
        status: 'confirmed',
        txSignature: signature,
        paidAt: new Date().toISOString(),
        paidBy: walletAddress,
      })

      setInvoice(confirmedInvoice)
      toast.success('Payment confirmed on Solana Devnet.')
    } catch (error) {
      setTxError(error.message || 'Transaction failed. Please try again.')
      toast.error(error.message || 'Transaction failed.')
      const latestInvoice = getInvoiceById(invoiceId)
      if (latestInvoice?.status === 'pending' && !latestInvoice.txSignature) {
        const resetInvoice = replaceInvoice(invoiceId, {
          ...latestInvoice,
          status: isInvoiceExpired(latestInvoice) ? 'expired' : 'unpaid',
        })
        setInvoice(resetInvoice)
      }
    } finally {
      setPaying(false)
    }
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

  const isConfirmed = lifecycleStatus === 'confirmed'
  const isBlocked = lifecycleStatus === 'expired' || lifecycleStatus === 'failed'

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="pay-header">
          <Link to="/" className="back-link">Back to KampusPay Lite</Link>
          <div className="pay-network-badge">
            <span className="badge-dot" style={{ background: '#9945ff' }} />
            Solana Devnet
          </div>
        </div>

        <div className="card pay-card">
          <div className={`status-banner ${lifecycleStatus === 'confirmed' ? 'paid' : 'unpaid'}`}>
            <span>{formatInvoiceStatusLabel(lifecycleStatus)}</span>
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
            <div className="pay-amount-hint">Amount is locked to this invoice.</div>
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
                <span>{invoice.payerName}{invoice.payerId ? ` · ${invoice.payerId}` : ''}</span>
              </div>
            )}
            {isConfirmed && invoice.paidAt && (
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

          <div className="divider" />

          {!isConfirmed && (
            <div className="pay-actions">
              {isBlocked && (
                <div className="alert alert-warning">
                  <span>Status</span>
                  <span>
                    {lifecycleStatus === 'expired'
                      ? 'This invoice has passed its deadline and payment is locked.'
                      : 'This invoice needs manual review before it can be paid again.'}
                  </span>
                </div>
              )}

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
                    {wallet?.adapter?.name} · <code className="font-mono">{shortenAddress(walletAddress)}</code>
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
                      This page auto-refreshes invoice data from local storage and lets you re-check on-chain confirmation.
                    </p>
                  </div>
                  <p className="pay-note">
                    Your wallet will ask for confirmation. Network: Devnet.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="pay-footer">
          <span>Powered by</span>
          <strong>KampusPay Lite</strong>
          <span>·</span>
          <span>Solana Devnet</span>
        </div>
      </div>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      <FaucetModal isOpen={faucetModalOpen} onClose={() => setFaucetModalOpen(false)} />
    </div>
  )
}
