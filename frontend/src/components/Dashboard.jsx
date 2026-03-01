import { useState, useEffect, useMemo } from 'react'
import { fetchBills, ingestGazette } from '../api'
import BillCard from './BillCard'
import './Dashboard.css'

const SORT_OPTIONS = [
  { value: 'default',   label: 'Default (API order)' },
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc',  label: 'Oldest first' },
]

const STATUS_LABELS = [
  'Royal Assent',
  'Senate',
  'Committee',
  'Second Reading',
  'First Reading',
  'Introduced',
]

const PARLIAMENTS = [
  { number: 45, label: '45th Parliament (2025–present)', sessions: [1] },
  { number: 44, label: '44th Parliament (2021–2025)',    sessions: [1] },
  { number: 43, label: '43rd Parliament (2019–2021)',    sessions: [1, 2] },
  { number: 42, label: '42nd Parliament (2015–2019)',    sessions: [1] },
  { number: 41, label: '41st Parliament (2011–2015)',    sessions: [1, 2] },
  { number: 40, label: '40th Parliament (2008–2011)',    sessions: [1, 2, 3] },
  { number: 39, label: '39th Parliament (2006–2008)',    sessions: [1, 2] },
  { number: 38, label: '38th Parliament (2004–2006)',    sessions: [1] },
  { number: 37, label: '37th Parliament (2001–2004)',    sessions: [1, 2, 3] },
  { number: 36, label: '36th Parliament (1997–2000)',    sessions: [1, 2] },
]

function matchesStatus(billStatus, filterStatus) {
  if (!billStatus) return false
  return billStatus.toLowerCase().includes(filterStatus.toLowerCase())
}

export default function Dashboard({ onSelectBill, onOpenGeneralChat }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [parliament, setParliament] = useState(45)
  const [session, setSession] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [statusFilter, setStatusFilter] = useState('all')
  const [gazetteStatus, setGazetteStatus] = useState(null)

  const selectedParl = PARLIAMENTS.find(p => p.number === parliament) || PARLIAMENTS[0]

  async function loadBills() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBills(parliament, session)
      setBills(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [parliament, session])

  function handleParliamentChange(e) {
    const num = Number(e.target.value)
    setParliament(num)
    const parl = PARLIAMENTS.find(p => p.number === num)
    setSession(parl ? parl.sessions[0] : 1)
  }

  async function handleGazetteChat() {
    setGazetteStatus({ type: 'loading' })
    try {
      const res = await ingestGazette()
      setGazetteStatus({ type: 'success', message: `Loaded ${res.chunks_added} regulation chunks` })
      onOpenGeneralChat()
    } catch (err) {
      setGazetteStatus({ type: 'error', message: err.message })
    }
  }

  const statusOptions = useMemo(() => {
    const counts = {}
    for (const b of bills) {
      for (const label of STATUS_LABELS) {
        if (matchesStatus(b.status, label)) {
          counts[label] = (counts[label] || 0) + 1
          break
        }
      }
    }
    return STATUS_LABELS.filter(l => counts[l]).map(l => ({ label: l, count: counts[l] }))
  }, [bills])

  const filtered = useMemo(() => {
    let list = bills

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        (b.bill_number || '').toLowerCase().includes(q) ||
        (b.title || '').toLowerCase().includes(q) ||
        (b.sponsor || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      list = list.filter(b => matchesStatus(b.status, statusFilter))
    }

    if (sortBy === 'default') return list

    return [...list].sort((a, b) => {
      const da = a.introduced_date || ''
      const db = b.introduced_date || ''
      return sortBy === 'date-desc' ? db.localeCompare(da) : da.localeCompare(db)
    })
  }, [bills, search, statusFilter, sortBy])

  function resetFilters() {
    setSortBy('default')
    setStatusFilter('all')
    setSearch('')
  }

  const hasActiveFilters = sortBy !== 'default' || statusFilter !== 'all' || search !== ''

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Bill Tracker</h2>
          <p className="dashboard-subtitle">
            Browse Canadian parliamentary bills — click any bill to start chatting
          </p>
        </div>
      </div>

      <div className="dashboard-controls">
        <div className="control-group">
          <label>Parliament</label>
          <select
            className="control-select"
            value={parliament}
            onChange={handleParliamentChange}
          >
            {PARLIAMENTS.map(p => (
              <option key={p.number} value={p.number}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label>Session</label>
          <select
            className="control-select"
            value={session}
            onChange={e => setSession(Number(e.target.value))}
          >
            {selectedParl.sessions.map(s => (
              <option key={s} value={s}>Session {s}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-ghost btn-md"
          onClick={loadBills}
          disabled={loading}
          title="Refresh bills"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'spin-icon' : ''}>
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <div className="control-separator" />
        <button className="btn btn-ghost btn-md gazette-btn" onClick={handleGazetteChat} disabled={gazetteStatus?.type === 'loading'}>
          {gazetteStatus?.type === 'loading' ? 'Loading Gazette...' : 'Chat with Gazette Regulations'}
        </button>
        {gazetteStatus && gazetteStatus.type !== 'loading' && (
          <span className={`inline-status ${gazetteStatus.type}`}>
            {gazetteStatus.message}
          </span>
        )}
      </div>

      <div className="search-sort-row">
        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search bills by number, title, or sponsor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {bills.length > 0 && (
            <span className="result-count">{filtered.length} of {bills.length} bills</span>
          )}
        </div>

        <div className="filter-control">
          <label className="filter-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/>
            </svg>
            Sort
          </label>
          <select
            className="filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-control">
          <label className="filter-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Status
          </label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statusOptions.map(o => (
              <option key={o.label} value={o.label}>{o.label} ({o.count})</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button className="btn btn-ghost btn-xs filter-reset" onClick={resetFilters}>
            Reset all
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Fetching bills from LEGISinfo...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bills-grid">
          {filtered.map(bill => (
            <BillCard
              key={bill.bill_number}
              bill={bill}
              onSelectForChat={onSelectBill}
            />
          ))}
        </div>
      ) : bills.length > 0 ? (
        <div className="empty-state">
          <p>No bills match your search.</p>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No bills loaded</h3>
          <p>Click "Fetch Bills" to load bills from the House of Commons.</p>
        </div>
      )}
    </div>
  )
}
