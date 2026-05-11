import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  exportInvoicesAsCsv,
  exportInvoicesAsJson,
  getAllInvoices,
} from '../utils/invoiceStorage'
import { getCategoryLabel, CATEGORIES } from '../utils/categories'
import {
  formatInvoiceStatusLabel,
  getInvoiceLifecycleStatus,
  getInvoiceStatusTone,
} from '../utils/invoiceStatus'
import { shortenAddress } from '../hooks/useWallet'
import { getExplorerUrl } from '../utils/solana'
import { useToast } from '../components/toastContext'
import { useI18n } from '../i18n/LanguageProvider'
import './DashboardPage.css'

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [copiedId, setCopiedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadInvoices() {
      try {
        const data = await getAllInvoices()
        if (!ignore) {
          setInvoices(data.map((invoice) => ({
            ...invoice,
            lifecycleStatus: getInvoiceLifecycleStatus(invoice),
          })))
        }
      } catch (error) {
        if (!ignore) toast.error(error.message || 'Failed to load invoices from Supabase.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadInvoices()

    return () => {
      ignore = true
    }
  }, [toast])

  const stats = useMemo(() => {
    const total = invoices.length
    const confirmed = invoices.filter((invoice) => invoice.lifecycleStatus === 'confirmed').length
    const pending = invoices.filter((invoice) => invoice.lifecycleStatus === 'pending').length
    const expired = invoices.filter((invoice) => invoice.lifecycleStatus === 'expired').length
    const totalSOL = invoices
      .filter((invoice) => invoice.lifecycleStatus === 'confirmed')
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0)

    return { total, confirmed, pending, expired, totalSOL }
  }, [invoices])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    const nextInvoices = invoices.filter((invoice) => {
      const matchesStatus = statusFilter === 'all' || invoice.lifecycleStatus === statusFilter
      const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter
      const matchesQuery =
        !query ||
        invoice.title.toLowerCase().includes(query) ||
        invoice.id.toLowerCase().includes(query) ||
        invoice.receiver.toLowerCase().includes(query) ||
        invoice.payerName?.toLowerCase().includes(query) ||
        invoice.payerId?.toLowerCase().includes(query)

      return matchesStatus && matchesCategory && matchesQuery
    })

    nextInvoices.sort((a, b) => {
      if (sortBy === 'amount-high') return Number(b.amount) - Number(a.amount)
      if (sortBy === 'amount-low') return Number(a.amount) - Number(b.amount)
      if (sortBy === 'deadline') {
        return (new Date(a.expiresAt || 8640000000000000)).getTime() -
          (new Date(b.expiresAt || 8640000000000000)).getTime()
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return nextInvoices
  }, [categoryFilter, invoices, search, sortBy, statusFilter])

  const copyLink = (id) => {
    const url = `${window.location.origin}/pay/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Payment link copied.')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const exportJson = async () => {
    try {
      downloadTextFile('kampuspay-invoices.json', await exportInvoicesAsJson(), 'application/json')
      toast.success('JSON export downloaded.')
    } catch (error) {
      toast.error(error.message || 'Failed to export JSON.')
    }
  }

  const exportCsv = async () => {
    try {
      downloadTextFile('kampuspay-invoices.csv', await exportInvoicesAsCsv(), 'text/csv;charset=utf-8')
      toast.success('CSV export downloaded.')
    } catch (error) {
      toast.error(error.message || 'Failed to export CSV.')
    }
  }

  const statCards = [
    { label: 'Total invoices', value: stats.total, color: 'var(--text-primary)' },
    { label: 'Confirmed', value: stats.confirmed, color: 'var(--success)' },
    { label: 'Pending', value: stats.pending, color: 'var(--accent-light)' },
    { label: 'Expired', value: stats.expired, color: 'var(--text-muted)' },
    { label: 'SOL collected', value: `${stats.totalSOL.toFixed(3)} SOL`, color: 'var(--purple)' },
  ]

  return (
    <div className="page">
      <div className="container">
        <div className="dash-toolbar mb-6">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-sub">{t('adminDashboard.sub')}</p>
          </div>
          <div className="dash-toolbar-actions">
            <button className="btn btn-outline" onClick={exportCsv}>Export CSV</button>
            <button className="btn btn-ghost" onClick={exportJson}>Export JSON</button>
            <Link to="/create" className="btn btn-primary">New Invoice</Link>
          </div>
        </div>

        <div className="stats-grid mb-6">
          {statCards.map((card) => (
            <div className="card stat-card card-sm" key={card.label}>
              <div className="stat-number" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="card dash-controls mb-6">
          <div className="dash-control-grid">
            <input
              className="form-input"
              placeholder="Search by title, invoice ID, wallet, or payer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="payment_review">Payment Review</option>
              <option value="cash_pending">Cash Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="amount-high">Amount high to low</option>
              <option value="amount-low">Amount low to high</option>
              <option value="deadline">Nearest deadline</option>
            </select>
          </div>
          <div className="dash-results text-muted text-sm">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} matched
          </div>
        </div>

        {loading ? (
          <div className="empty-state card">
            <div className="empty-icon">...</div>
            <h3>Loading invoices</h3>
            <p className="text-secondary">Fetching payment records from Supabase.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">0</div>
            <h3>{invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}</h3>
            <p className="text-secondary">
              {invoices.length === 0
                ? 'Create your first invoice to start collecting payments.'
                : 'Try changing your search, filters, or sorting.'}
            </p>
            {invoices.length === 0 && (
              <Link to="/create" className="btn btn-primary" style={{ marginTop: 16 }}>
                Create invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Transaction</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="inv-title">{invoice.title}</div>
                      <div className="inv-id font-mono text-muted">{invoice.id}</div>
                      <div className="inv-date text-muted">
                        {new Date(invoice.createdAt).toLocaleDateString('id-ID')}
                      </div>
                      {invoice.payerName && (
                        <div className="inv-meta text-muted text-sm">
                          {invoice.payerName}{invoice.payerId ? ` - ${invoice.payerId}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="inv-amount">{invoice.amount} SOL</span>
                    </td>
                    <td>
                      <span className="text-sm">{getCategoryLabel(invoice.category)}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${getInvoiceStatusTone(invoice.lifecycleStatus)}`}>
                        {formatInvoiceStatusLabel(invoice.lifecycleStatus)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-secondary">
                        {invoice.expiresAt
                          ? new Date(invoice.expiresAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                          : 'No deadline'}
                      </span>
                    </td>
                    <td>
                      {invoice.txSignature ? (
                        <a
                          href={getExplorerUrl(invoice.txSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-hash font-mono"
                          title={invoice.txSignature}
                        >
                          {shortenAddress(invoice.txSignature)}
                        </a>
                      ) : (
                        <span className="text-muted text-sm">Not sent</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyLink(invoice.id)}
                          title="Copy payment link"
                        >
                          {copiedId === invoice.id ? 'Copied' : 'Copy'}
                        </button>
                        <Link
                          to={`/pay/${invoice.id}`}
                          className="btn btn-outline btn-sm"
                          title="View payment page"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
