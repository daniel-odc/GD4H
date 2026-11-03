import React from 'react'

export default function Message({ messages }) {
  return (
    <div>
        {messages.map((message, index) => (
            <p key={index}>{message}</p>
        ))}
    </div>
  )
}
