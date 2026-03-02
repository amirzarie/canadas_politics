import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { chat } from '../api'
import './ChatInterface.css'

export default function ChatInterface({ selectedBill, onClearBill }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [billFilter, setBillFilter] = useState(selectedBill?.bill_number || '')
  const [parlSession, setParlSession] = useState(selectedBill?.parliament_session || '')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (selectedBill) {
      const changed = selectedBill.bill_number !== billFilter
      setBillFilter(selectedBill.bill_number)
      setParlSession(selectedBill.parliament_session || '')
      if (changed) setMessages([])
    }
  }, [selectedBill])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await chat(
        trimmed,
        billFilter || undefined,
        parlSession || undefined,
      )
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          citations: response.citations || [],
          billContext: response.bill_context,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: `Failed to get response: ${err.message}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleClearChat() {
    setMessages([])
  }

  function handleClearBill() {
    setBillFilter('')
    setParlSession('')
    onClearBill()
  }

  const billSuggestions = [
    'What is this bill about and what are its key provisions?',
    'What are the main criticisms raised during debate?',
    'Who are the key sponsors and supporters?',
    'What is the current status and next steps?',
  ]

  const generalSuggestions = [
    'What new regulations are being proposed in the Canada Gazette?',
    'Are there any proposed environmental regulations?',
    'What cost-benefit analyses have been published for recent regulations?',
    'Summarise the latest regulatory impact analysis statements.',
  ]

  const suggestions = billFilter ? billSuggestions : generalSuggestions

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="sidebar-section">
          <div className="chat-mode-indicator">
            <span className={`mode-badge ${billFilter ? 'bill' : 'general'}`}>
              {billFilter ? 'Bill Mode' : 'General Mode'}
            </span>
          </div>
          {billFilter ? (
            <>
              <h3>Bill Context</h3>
              <div className="bill-filter-input">
                <input
                  type="text"
                  placeholder="e.g. C-10"
                  value={billFilter}
                  onChange={e => setBillFilter(e.target.value)}
                />
                <button
                  className="clear-filter"
                  onClick={handleClearBill}
                  title="Switch to general mode"
                >
                  &times;
                </button>
              </div>
              <div className="bill-filter-input" style={{ marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Session e.g. 44-1"
                  value={parlSession}
                  onChange={e => setParlSession(e.target.value)}
                />
              </div>
              {selectedBill && (
                <div className="selected-bill-info">
                  <span className="selected-bill-number">{selectedBill.bill_number}</span>
                  <span className="selected-bill-title">{selectedBill.title?.slice(0, 80)}</span>
                  {selectedBill.introduced_date && (
                    <span className="selected-bill-date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Introduced {selectedBill.introduced_date}
                    </span>
                  )}
                  {selectedBill.parliament_session && (
                    <span className="selected-bill-session">Parliament {selectedBill.parliament_session}</span>
                  )}
                  {selectedBill.url && (
                    <a
                      href={selectedBill.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="selected-bill-link"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      View on Parliament
                    </a>
                  )}
                </div>
              )}
              {billFilter && parlSession && (
                <p className="sidebar-hint" style={{ marginTop: 8, color: 'var(--success)' }}>
                  Data will be auto-ingested on first question
                </p>
              )}
            </>
          ) : (
            <>
              <h3>General Chat</h3>
              <p className="sidebar-hint">
                Searches all loaded data — gazette regulations, any previously ingested bills and debates.
              </p>
              <p className="sidebar-hint" style={{ marginTop: 6 }}>
                To focus on a specific bill, go to the Dashboard and click a bill card.
              </p>
            </>
          )}
        </div>

        <div className="sidebar-section">
          <h3>{billFilter ? 'Suggested Questions' : 'Try Asking'}</h3>
          <div className="suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-btn"
                onClick={() => setInput(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-secondary btn-md clear-chat-btn" onClick={handleClearChat}>
          Clear Conversation
        </button>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-icon">
                <svg viewBox="0 0 32 32" fill="currentColor" width="48" height="48">
                  <path d="M16 2l-2.5 6.5L8 7l2 5.5L4 14l6 1-2 5 4-2 4 12 4-12 4 2-2-5 6-1-6-1.5L24 7l-5.5 1.5z"/>
                </svg>
              </div>
              <h2>{billFilter ? `Ask about Bill ${billFilter}` : 'Ask about Canadian Legislation'}</h2>
              <p>
                {billFilter && parlSession
                  ? `Ready to chat about Bill ${billFilter}. The system will automatically fetch and index the bill text and debates when you send your first question.`
                  : billFilter
                    ? `Focused on Bill ${billFilter}. Add a session code (e.g. 44-1) for auto-ingestion, or ask if data is already loaded.`
                    : 'You\'re in general mode — ask about gazette regulations, or any bills and debates you\'ve previously loaded. Load gazette data from the Dashboard to get started.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-bubble">
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="citations">
                  <h4>Sources ({msg.citations.length})</h4>
                  <div className="citations-list">
                    {msg.citations.map((c, j) => (
                      <div key={j} className="citation-item">
                        <div className="citation-header">
                          <span className={`citation-type ${c.chunk_type}`}>
                            {c.chunk_type === 'bill_text' ? 'Bill Text'
                              : c.chunk_type === 'debate' ? 'Debate'
                              : 'Regulation'}
                          </span>
                          {c.speaker && <span className="citation-speaker">{c.speaker}</span>}
                          {c.date && <span className="citation-date">{c.date}</span>}
                        </div>
                        <p className="citation-text">{c.text}</p>
                        {c.source && c.source.startsWith('http') && (
                          <a href={c.source} target="_blank" rel="noopener noreferrer" className="citation-link">
                            View Source
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-bubble loading-bubble">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
                <span className="typing-text">
                  {billFilter && parlSession
                    ? 'Auto-ingesting bill data & generating response...'
                    : 'Searching legislation & generating response...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={
              billFilter
                ? `Ask about Bill ${billFilter}...`
                : 'Ask about Canadian legislation...'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} className="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
