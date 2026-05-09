import { useState } from 'react'

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A9.3 9.3 0 0 1 12 5c5 0 8.5 4.1 9.6 5.6a2.3 2.3 0 0 1 0 2.8 18.3 18.3 0 0 1-2.3 2.5" />
        <path d="M6.5 6.9a18.6 18.6 0 0 0-4.1 3.7 2.3 2.3 0 0 0 0 2.8C3.5 14.9 7 19 12 19a9.2 9.2 0 0 0 4.2-1" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.4 10.6C3.5 9.1 7 5 12 5s8.5 4.1 9.6 5.6a2.3 2.3 0 0 1 0 2.8C20.5 14.9 17 19 12 19s-8.5-4.1-9.6-5.6a2.3 2.3 0 0 1 0-2.8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function PasswordInput({ label, showLabel, hideLabel, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const buttonLabel = visible ? hideLabel : showLabel

  return (
    <div className="password-input-wrap">
      <input
        {...inputProps}
        className={`form-input password-input ${inputProps.className || ''}`.trim()}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <EyeIcon hidden={!visible} />
      </button>
    </div>
  )
}
