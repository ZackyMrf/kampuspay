import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/authContext'
import { useToast } from '../components/toastContext'
import {
  getSellerChatThreads,
  getStudentChatThreads,
  getLocalChatReadAt,
  subscribeToChatMessageChanges,
  subscribeToChatThreadList,
} from '../utils/chatStorage'
import { useI18n } from '../i18n/LanguageProvider'
import './ChatPage.css'

function formatTime(value, locale) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function threadTitle(thread, role) {
  if (role === 'seller') return thread.student?.fullName || thread.student?.email || 'Student'
  return thread.seller?.storeName || 'Campus seller'
}

function hasUnread(thread, userId) {
  const localReadAt = getLocalChatReadAt(thread.id, userId)
  if (localReadAt && thread.latestMessage?.createdAt && new Date(thread.latestMessage.createdAt) <= new Date(localReadAt)) {
    return false
  }

  return thread.latestMessage
    && thread.latestMessage.senderId !== userId
    && !thread.latestMessage.readAt
}

export default function ChatInboxPage({ role }) {
  const { locale, t } = useI18n()
  const { user, seller } = useAuth()
  const toast = useToast()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    if ((role === 'seller' && !seller?.id) || (role === 'student' && !user?.id)) {
      Promise.resolve().then(() => {
        if (!ignore) setLoading(false)
      })
      return () => {
        ignore = true
      }
    }

    const loader = role === 'seller'
      ? getSellerChatThreads(seller?.id)
      : getStudentChatThreads(user?.id)

    loader
      .then((data) => {
        if (!ignore) setThreads(data)
      })
      .catch((error) => toast.error(error.message || 'Failed to load chats.'))
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [role, seller?.id, toast, user?.id])

  useEffect(() => {
    if ((role === 'seller' && !seller?.id) || (role === 'student' && !user?.id)) return undefined

    const reloadThreads = () => {
      const loader = role === 'seller'
        ? getSellerChatThreads(seller?.id)
        : getStudentChatThreads(user?.id)

      loader
        .then((data) => setThreads(data))
        .catch((error) => toast.error(error.message || 'Failed to refresh chats.'))
    }

    const unsubscribeThreads = subscribeToChatThreadList({
      role,
      userId: user?.id,
      sellerId: seller?.id,
    }, reloadThreads)

    const unsubscribeMessages = subscribeToChatMessageChanges(reloadThreads)
    const handleLocalRead = () => reloadThreads()
    window.addEventListener('kampuspay-chat-read', handleLocalRead)

    return () => {
      unsubscribeThreads()
      unsubscribeMessages()
      window.removeEventListener('kampuspay-chat-read', handleLocalRead)
    }
  }, [role, seller?.id, toast, user?.id])

  return (
    <div className="page">
      <div className="container">
        <header className="role-header">
          <div>
            <span className="section-tag">Messages</span>
            <h1>{role === 'seller' ? t('chat.inboxSellerTitle') : t('chat.inboxStudentTitle')}</h1>
            <p className="text-secondary">{t('chat.inboxSub')}</p>
          </div>
          <div className="role-actions">
            <Link to={role === 'seller' ? '/seller/orders' : '/marketplace'} className="btn btn-outline">
              {role === 'seller' ? 'Seller Orders' : 'Marketplace'}
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="card empty-state"><span className="spinner" /></div>
        ) : threads.length === 0 ? (
          <div className="card empty-state">
            <h3>{t('chat.emptyTitle')}</h3>
            <p className="text-secondary">
              {role === 'seller'
                ? t('chat.emptySellerSub')
                : t('chat.emptyStudentSub')}
            </p>
          </div>
        ) : (
          <div className="chat-thread-list">
            {threads.map((thread) => (
              <Link to={`/chats/${thread.id}`} className={`card card-sm chat-thread-card ${hasUnread(thread, user?.id) ? 'unread' : ''}`} key={thread.id}>
                <div className="chat-thread-thumb">
                  {thread.product?.imageUrl ? <img src={thread.product.imageUrl} alt={thread.product.name} /> : 'KP'}
                </div>
                <div>
                  <strong>
                    {threadTitle(thread, role)}
                    {hasUnread(thread, user?.id) && <span className="chat-unread-dot" aria-label={t('chat.unreadAria')} />}
                  </strong>
                  <div className="text-muted text-sm">{thread.product?.name || 'Marketplace chat'}</div>
                  <div className="chat-preview text-secondary text-sm">
                    {thread.latestMessage?.message || t('chat.noMessages')}
                  </div>
                </div>
                <span className="text-muted text-sm">{formatTime(thread.latestMessage?.createdAt || thread.updatedAt, locale)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
