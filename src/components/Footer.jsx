import React from 'react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <span>BattonHomes HQ Command Center &mdash; The Batton Group, LLC</span>
      <span>Built by Nigel &middot; {new Date().getFullYear()}</span>
    </footer>
  )
}
