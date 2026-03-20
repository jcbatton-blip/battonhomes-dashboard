import React, { useState } from 'react'
import './MessageBox.css'

export default function MessageBox() {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!message.trim()) return
    const subject = encodeURIComponent('BattonHomes HQ \u2014 Action Required')
    const body = encodeURIComponent(message)
    window.location.href = `mailto:jcbatton@gmail.com?subject=${subject}&body=${body}`
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Send Message to Jeffrey</span>
      </div>
      <div className="message-body">
        <textarea
          className="message-textarea"
          rows={4}
          placeholder="Type your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button className="message-btn" onClick={handleSend}>
          Send to jcbatton@gmail.com
        </button>
      </div>
    </div>
  )
}
