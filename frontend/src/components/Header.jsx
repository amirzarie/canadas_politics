import { useState, useEffect } from 'react'
import { getStats, healthCheck } from '../api'
import './Header.css'

export default function Header({ activeTab, onTabChange }) {
  const [stats, setStats] = useState(null)
  const [backendUp, setBackendUp] = useState(null)

  useEffect(() => {
    healthCheck()
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false))
    getStats()
      .then(setStats)
      .catch(() => {})
  }, [activeTab])

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">
            <svg viewBox="0 0 32 32" fill="currentColor" width="28" height="28">
              <path d="M16 2l-2.5 6.5L8 7l2 5.5L4 14l6 1-2 5 4-2 4 12 4-12 4 2-2-5 6-1-6-1.5L24 7l-5.5 1.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="header-title">Canadian Politics RAG</h1>
            <p className="header-subtitle">Legislative Intelligence System</p>
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onTabChange('chat')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
          <button
            className={`nav-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => onTabChange('guide')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Guide
          </button>
        </nav>

        <div className="header-status">
          <span className={`status-dot ${backendUp === true ? 'online' : backendUp === false ? 'offline' : 'loading'}`} />
          <span className="status-text">
            {backendUp === true ? 'API Online' : backendUp === false ? 'API Offline' : 'Checking...'}
          </span>
          {stats && (
            <span className="status-chunks">{stats.total_chunks} chunks</span>
          )}
        </div>
      </div>
    </header>
  )
}
