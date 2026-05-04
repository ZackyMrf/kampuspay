export default function ChatBubble({ tone = 'assistant', children }) {
  return (
    <div className={`ai-message ai-message-${tone}`}>
      {children}
    </div>
  )
}
