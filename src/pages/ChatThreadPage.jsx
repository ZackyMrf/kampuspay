import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import { getChatMessages, getChatThread, sendChatMessage } from '../utils/chatStorage'
import './ChatPage.css'

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ChatThreadPage() {
  const { threadId } = useParams()
  const { user, role } = useAuth()
  const toast = useToast()
  const messagesRef = useRef(null)
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let ignore = false
    Promise.all([getChatThread(threadId), getChatMessages(threadId)])
      .then(([nextThread, nextMessages]) => {
        if (!ignore) {
          setThread(nextThread)
          setMessages(nextMessages)
        }
      })
      .catch((error) => toast.error(error.message || 'Failed to load chat.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [threadId, toast])

  useEffect(() => {
    const node = messagesRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages.length])

  const peerName = useMemo(() => {
    if (!thread) return 'Chat'
    if (role === 'seller') return thread.student?.fullName || thread.student?.email || 'Student'
    return thread.seller?.storeName || 'Campus seller'
  }, [role, thread])

  const submitMessage = async (event) => {
    event.preventDefault()
    if (!draft.trim()) return

    try {
      setSending(true)
      const nextMessage = await sendChatMessage({
        threadId,
        senderId: user.id,
        senderRole: role,
        message: draft,
      })
      setMessages((current) => [...current, nextMessage])
      setDraft('')
    } catch (error) {
      toast.error(error.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page flex-center"><span className="spinner" /></div>

  if (!thread) {
    return (
      <div className="page flex-center flex-col gap-4">
        <h2>Chat tidak ditemukan</h2>
        <Link to={role === 'seller' ? '/seller/chats' : '/student/chats'} className="btn btn-primary">Kembali ke inbox</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <Link to={role === 'seller' ? '/seller/chats' : '/student/chats'} className="back-link">Kembali ke inbox</Link>
        <div className="chat-layout">
          <aside className="card chat-summary">
            <div className="chat-product">
              <div className="chat-product-img">
                {thread.product?.imageUrl ? <img src={thread.product.imageUrl} alt={thread.product.name} /> : 'KP'}
              </div>
              <div>
                <span className="detail-label">Produk</span>
                <h2 className="chat-title">{thread.product?.name || 'Marketplace chat'}</h2>
                {thread.product?.priceSol ? <p className="text-muted text-sm">{thread.product.priceSol.toFixed(3)} SOL</p> : null}
              </div>
            </div>
            <div className="divider" />
            <div className="invoice-details">
              <div className="detail-row"><span className="detail-label">Dengan</span><strong>{peerName}</strong></div>
              {thread.orderId && <div className="detail-row"><span className="detail-label">Order</span><span className="font-mono">{thread.orderId.slice(0, 8)}...</span></div>}
              {thread.order?.pickupCode && <div className="detail-row"><span className="detail-label">Pickup</span><span className="font-mono">{thread.order.pickupCode}</span></div>}
            </div>
            {thread.productId && <Link to={`/product/${thread.productId}`} className="btn btn-outline btn-full">Buka produk</Link>}
            {thread.order?.invoiceId && <Link to={`/pay/${thread.order.invoiceId}`} className="btn btn-primary btn-full">Buka payment</Link>}
          </aside>

          <section className="card chat-panel">
            <header className="chat-head">
              <span className="detail-label">Chat</span>
              <h1 className="chat-title">{peerName}</h1>
            </header>
            <div className="chat-messages" ref={messagesRef}>
              {messages.length === 0 ? (
                <div className="empty-state">
                  <h3>Belum ada pesan</h3>
                  <p className="text-secondary">Kirim pesan pertama untuk mulai koordinasi.</p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === user.id
                  return (
                    <div className={`chat-bubble-row ${mine ? 'mine' : ''}`} key={message.id}>
                      <div className="chat-bubble">
                        <p>{message.message}</p>
                        <span className="chat-meta">{mine ? 'Kamu' : peerName} · {formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <form className="chat-composer" onSubmit={submitMessage}>
              <textarea
                className="form-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tulis pesan..."
              />
              <button className="btn btn-primary" disabled={sending || !draft.trim()}>
                {sending ? 'Mengirim...' : 'Kirim'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
