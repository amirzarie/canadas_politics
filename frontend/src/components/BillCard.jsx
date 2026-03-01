import './BillCard.css'

const STATUS_MAP = {
  'Royal Assent': { label: 'Royal Assent', color: 'green' },
  'Senate': { label: 'Senate', color: 'blue' },
  'Committee': { label: 'Committee', color: 'amber' },
  'Second Reading': { label: '2nd Reading', color: 'amber' },
  'First Reading': { label: '1st Reading', color: 'gray' },
  'Introduced': { label: 'Introduced', color: 'gray' },
}

function getStatusStyle(status) {
  if (!status) return { label: 'Unknown', color: 'gray' }
  for (const [key, val] of Object.entries(STATUS_MAP)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val
  }
  return { label: status.length > 20 ? status.slice(0, 20) + '...' : status, color: 'gray' }
}

export default function BillCard({ bill, onSelectForChat }) {
  const statusStyle = getStatusStyle(bill.status)

  return (
    <div className="bill-card" onClick={() => onSelectForChat(bill)} role="button" tabIndex={0}>
      <div className="bill-card-header">
        <span className="bill-number">{bill.bill_number}</span>
        <span className={`bill-status ${statusStyle.color}`}>{statusStyle.label}</span>
      </div>

      <h3 className="bill-title">{bill.title || bill.short_title || 'Untitled Bill'}</h3>

      <div className="bill-meta">
        {bill.sponsor && (
          <span className="bill-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {bill.sponsor}
          </span>
        )}
        {bill.introduced_date && (
          <span className="bill-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {bill.introduced_date}
          </span>
        )}
        {bill.parliament_session && (
          <span className="bill-meta-item">Parliament {bill.parliament_session}</span>
        )}
      </div>

      <div className="bill-card-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={(e) => { e.stopPropagation(); onSelectForChat(bill); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat About This Bill
        </button>
        {bill.url && (
          <a
            href={bill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost"
            onClick={(e) => e.stopPropagation()}
          >
            View on Parliament
          </a>
        )}
      </div>
    </div>
  )
}
