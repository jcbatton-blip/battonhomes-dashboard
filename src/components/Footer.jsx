import React from 'react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <span>BattonHomes Command Center — The Batton Group, LLC</span>
      <span>Built by Nigel · {new Date().getFullYear()}</span>
    </footer>
  )
}
