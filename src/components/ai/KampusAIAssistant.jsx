import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../authContext'
import { handleAssistantMessage } from '../../utils/aiAssistant'
import ChatBubble from './ChatBubble'
import ChatProductCard from './ChatProductCard'
import ChatOrderCard from './ChatOrderCard'
import './KampusAIAssistant.css'

const QUICK_SUGGESTIONS = [
  'Recommend food',
  'Find cheap products',
  'Trusted sellers',
  'My orders',
  'Pickup code',
  'Popular now',
  'Payment help',
]

function createMessage(tone, text, extras = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tone,
    text,
    products: extras.products || [],
    orders: extras.orders || [],
  }
}

export default function KampusAIAssistant() {
  const { user, profile, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState(() => [
    createMessage('assistant', 'Halo, aku Kampus AI Assistant. Aku bisa bantu cari produk, seller terpercaya, order, pickup code, dan bantuan pembayaran.'),
  ])
  const messagesRef = useRef(null)

  useEffect(() => {
    if (open && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, open, thinking])

  const sendMessage = async (nextText = input) => {
    const text = nextText.trim()
    if (!text || thinking || loading) return

    setInput('')
    setThinking(true)
    setMessages((current) => [...current, createMessage('user', text)])

    try {
      const response = await handleAssistantMessage({ message: text, user, profile })
      setMessages((current) => [...current, createMessage('assistant', response.text, response)])
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage('assistant', error.message || 'Kampus AI sedang gagal membaca data. Coba lagi sebentar.'),
      ])
    } finally {
      setThinking(false)
    }
  }

  const canBuy = profile?.role === 'student'

  return (
    <div className={`ai-assistant ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="ai-panel" aria-label="Kampus AI Assistant">
          <header className="ai-header">
            <div>
              <strong>Kampus AI Assistant</strong>
              <span>Ask for recommendations, orders, pickup codes, and payment help</span>
            </div>
            <button className="ai-icon-button" onClick={() => setOpen(false)} aria-label="Close assistant">x</button>
          </header>

          <div className="ai-suggestions">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} onClick={() => sendMessage(suggestion)} disabled={thinking || loading}>
                {suggestion}
              </button>
            ))}
          </div>

          <div className="ai-messages" ref={messagesRef}>
            {messages.map((message) => (
              <ChatBubble key={message.id} tone={message.tone}>
                <p>{message.text}</p>
                {message.products.length > 0 && (
                  <div className="ai-card-list">
                    {message.products.map((product) => (
                      <ChatProductCard key={product.id} product={product} canBuy={canBuy} />
                    ))}
                  </div>
                )}
                {message.orders.length > 0 && (
                  <div className="ai-card-list">
                    {message.orders.map((order) => (
                      <ChatOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </ChatBubble>
            ))}
            {thinking && (
              <ChatBubble tone="assistant">
                <p>Kampus AI is thinking...</p>
              </ChatBubble>
            )}
          </div>

          <form
            className="ai-input-row"
            onSubmit={(event) => {
              event.preventDefault()
              sendMessage()
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Kampus AI..."
              disabled={thinking || loading}
            />
            <button type="submit" disabled={thinking || loading || !input.trim()}>Send</button>
          </form>
        </section>
      )}

      <button className="ai-launcher" onClick={() => setOpen((current) => !current)} aria-label="Open Kampus AI Assistant">
        <span>AI</span>
        <strong>Ask Kampus AI</strong>
      </button>
    </div>
  )
}
