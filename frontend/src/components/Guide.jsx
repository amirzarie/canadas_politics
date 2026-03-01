import './Guide.css'

const STEPS = [
  {
    number: '1',
    title: 'Select a Parliament & Session',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    description: 'On the Dashboard, use the Parliament dropdown to choose a Parliament (e.g. 45th Parliament) and the Session dropdown to pick a session. Bills load automatically whenever you change either selection — no button click required.',
    tip: 'The app defaults to the latest Parliament and Session so you see the most current bills right away.',
  },
  {
    number: '2',
    title: 'Browse, Search, Sort & Filter',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    description: 'Use the search bar to find bills by number (e.g. "C-10"), title, or sponsor. Color-coded status badges show each bill\'s progress at a glance.',
    bullets: [
      { label: 'Sort', text: 'Order bills by Default, Newest first, or Oldest first using the Sort dropdown.' },
      { label: 'Status Filter', text: 'Show only bills at a specific stage (e.g. Committee, Royal Assent) using the Status dropdown. Counts show how many bills match each status.' },
      { label: 'Reset All', text: 'Appears whenever any filter or sort is active — click it to clear everything back to defaults.' },
    ],
    tip: null,
  },
  {
    number: '3',
    title: 'Click a Bill to Start Chatting',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    description: 'Click anywhere on a bill card or press "Chat About This Bill." You\'ll enter the Chat in Bill Mode with the bill number and session pre-filled. When you send your first question, the system automatically fetches and indexes:',
    bullets: [
      { label: 'Bill Text', text: 'The actual legislative XML from parl.ca, parsed by sections and clauses.' },
      { label: 'Debate Transcripts', text: 'Hansard speeches from OpenParliament.ca, split by individual MP and linked to the bill.' },
    ],
    tip: 'You never need to manually ingest data. Just click a bill and ask your question — the system handles the rest. The "chunks" counter in the header shows your knowledge base size growing as you explore bills.',
  },
  {
    number: '4',
    title: 'Two Chat Modes',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    description: 'The chat has two modes, shown by a badge in the sidebar:',
    bullets: [
      { label: 'Bill Mode (red badge)', text: 'Active when a bill is selected. Searches only that bill\'s text and debates for precise, focused answers. Suggested questions are bill-specific.' },
      { label: 'General Mode (blue badge)', text: 'Active when no bill is selected. Searches everything in the knowledge base — gazette regulations, plus any bills and debates you\'ve previously loaded. To enter General Mode, click the Chat tab directly, clear the bill filter in the sidebar, or click "Chat with Gazette Regulations" on the Dashboard.' },
    ],
    tip: 'Each message runs a fresh search against the knowledge base, so different questions about the same bill can surface different relevant sections.',
  },
  {
    number: '5',
    title: 'Chat with Gazette Regulations',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      </svg>
    ),
    description: 'Click "Chat with Gazette Regulations" on the Dashboard to load the latest proposed regulations from the Canada Gazette RSS feed and immediately open chat in General Mode. From there you can ask about regulatory proposals, cost-benefit analyses, and impact statements.',
    tip: 'Gazette data is not tied to any specific bill. It only appears in General Mode. Bill Mode strictly searches the selected bill\'s own text and debates.',
  },
  {
    number: '6',
    title: 'Read Citations & Verify Sources',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    description: 'Every AI response includes a Sources panel beneath it. Each citation shows:',
    bullets: [
      { label: 'Source Type', text: 'Color-coded as Bill Text (blue), Debate (amber), or Regulation (purple).' },
      { label: 'Speaker & Date', text: 'For debate excerpts, see exactly which MP said what and when.' },
      { label: 'View Source', text: 'Links back to the original page on parl.ca or openparliament.ca when available.' },
    ],
    tip: 'The AI uses [Source N] notation in its answers — these map directly to the numbered citations below.',
  },
]

const DATA_PILLARS = [
  {
    name: 'OurCommons / LEGISinfo',
    color: 'blue',
    what: 'Official bill text, status, sponsors, and reading progress',
    source: 'parl.ca/legisinfo',
    format: 'JSON + XML',
  },
  {
    name: 'OpenParliament.ca',
    color: 'amber',
    what: 'Hansard debate transcripts, MP speeches, and arguments',
    source: 'api.openparliament.ca',
    format: 'JSON (paginated)',
  },
  {
    name: 'Canada Gazette',
    color: 'purple',
    what: 'Proposed regulations, RIAS cost-benefit analyses, and impact statements',
    source: 'gazette.gc.ca/rss',
    format: 'RSS + HTML',
  },
]

const BILL_STAGES = [
  {
    stage: 'First Reading',
    chamber: 'Originating Chamber',
    description: 'The bill is introduced and printed. No debate or vote occurs — this is a formality that places the bill on the parliamentary calendar.',
    color: 'gray',
  },
  {
    stage: 'Second Reading',
    chamber: 'Originating Chamber',
    description: 'MPs or Senators debate the general principles and purpose of the bill. A vote is held. If passed, the bill moves to committee.',
    color: 'amber',
  },
  {
    stage: 'Committee Stage',
    chamber: 'Originating Chamber',
    description: 'A parliamentary committee examines the bill clause by clause, hears expert witnesses, and may propose amendments.',
    color: 'amber',
  },
  {
    stage: 'Report Stage',
    chamber: 'Originating Chamber',
    description: 'The full chamber considers the committee\'s report and any proposed amendments. Members who were not on the committee can propose changes.',
    color: 'amber',
  },
  {
    stage: 'Third Reading',
    chamber: 'Originating Chamber',
    description: 'Final debate and vote in the originating chamber. If passed, the bill is sent to the other chamber.',
    color: 'amber',
  },
  {
    stage: 'Other Chamber',
    chamber: 'Senate or House',
    description: 'The bill goes through the same five stages (First Reading through Third Reading) in the other chamber. Amendments may be proposed.',
    color: 'blue',
  },
  {
    stage: 'Royal Assent',
    chamber: 'Governor General',
    description: 'Once both chambers agree on the same text, the Governor General (or their representative) signs the bill into law.',
    color: 'green',
  },
]

export default function Guide({ onNavigate }) {
  return (
    <div className="guide">
      <div className="guide-hero">
        <div className="guide-hero-icon">
          <svg viewBox="0 0 32 32" fill="currentColor" width="40" height="40">
            <path d="M16 2l-2.5 6.5L8 7l2 5.5L4 14l6 1-2 5 4-2 4 12 4-12 4 2-2-5 6-1-6-1.5L24 7l-5.5 1.5z"/>
          </svg>
        </div>
        <h1>How to Use Canadian Politics RAG</h1>
        <p className="guide-hero-sub">
          This application collects Canadian proposed laws, parliamentary debates, and government regulations
          into a searchable knowledge base — then lets you ask questions and get AI-powered, cited answers.
        </p>
        <div className="guide-hero-actions">
          <button className="btn btn-primary btn-md" onClick={() => onNavigate('dashboard')}>
            Go to Dashboard
          </button>
          <button className="btn btn-secondary btn-md" onClick={() => onNavigate('chat')}>
            Go to Chat
          </button>
        </div>
      </div>

      {/* ── Canadian Parliament Primer ─────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">Canadian Parliament 101</h2>
        <p className="guide-section-sub">
          New to Canadian politics? Here's a quick primer on how Parliament works and how laws get made.
        </p>

        <div className="primer-grid">
          <div className="primer-card">
            <div className="primer-card-icon house">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h3>House of Commons</h3>
            <p>
              The elected lower chamber with <strong>338 Members of Parliament (MPs)</strong>, each representing
              a riding (constituency). The party with the most seats usually forms government. This is where most
              bills are introduced and where the sharpest debates happen. The Prime Minister and Cabinet must maintain
              the confidence (support) of the House to govern.
            </p>
          </div>

          <div className="primer-card">
            <div className="primer-card-icon senate">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>
            </div>
            <h3>Senate</h3>
            <p>
              The appointed upper chamber with <strong>105 Senators</strong> who serve until age 75. The Senate provides
              "sober second thought" — reviewing and sometimes amending bills passed by the House. While it can reject
              bills, convention means it rarely blocks legislation that has clear democratic support. Senate bills
              are prefixed with <strong>S-</strong> (e.g., S-2).
            </p>
          </div>

          <div className="primer-card">
            <div className="primer-card-icon crown">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 20h20"/><path d="M4 20V8l4 4 4-8 4 8 4-4v12"/></svg>
            </div>
            <h3>The Crown</h3>
            <p>
              Canada is a constitutional monarchy. The <strong>Governor General</strong> represents the monarch and
              performs ceremonial duties including granting <strong>Royal Assent</strong> — the formal signature
              that turns a passed bill into law. The Governor General also opens and dissolves Parliament
              on the Prime Minister's advice.
            </p>
          </div>

          <div className="primer-card">
            <div className="primer-card-icon bills">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3>Types of Bills</h3>
            <p>
              <strong>Government Bills (C-)</strong> are introduced by Cabinet ministers and reflect the government's
              agenda. <strong>Private Members' Bills (C-200+)</strong> are introduced by individual MPs.
              <strong> Senate Public Bills (S-)</strong> originate in the Senate. <strong>Private Bills</strong> affect
              specific individuals or organizations rather than the general public.
            </p>
          </div>

          <div className="primer-card">
            <div className="primer-card-icon parliament">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <h3>Parliaments & Sessions</h3>
            <p>
              A <strong>Parliament</strong> spans from one general election to the next (e.g., the 45th Parliament
              began in May 2025). Within a Parliament, there can be multiple <strong>Sessions</strong>, each opened
              by a Speech from the Throne and ended by prorogation or dissolution. All bills that haven't passed
              die when a session or Parliament ends.
            </p>
          </div>

          <div className="primer-card">
            <div className="primer-card-icon gazette">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
            </div>
            <h3>Regulations & the Gazette</h3>
            <p>
              Not all rules come from bills. The <strong>Canada Gazette</strong> publishes proposed and final
              <strong> regulations</strong> — detailed rules created by the executive branch under authority granted
              by existing laws. Each proposed regulation includes a <strong>Regulatory Impact Analysis Statement
              (RIAS)</strong> with cost-benefit analysis and public consultation details.
            </p>
          </div>
        </div>
      </section>

      {/* ── How a Bill Becomes Law ────────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">How a Bill Becomes Law</h2>
        <p className="guide-section-sub">
          A bill must pass through both the House of Commons and the Senate in identical form, then receive Royal Assent.
        </p>
        <div className="stages-timeline">
          {BILL_STAGES.map((s, i) => (
            <div key={i} className="stage-item">
              <div className="stage-connector">
                <span className={`stage-dot ${s.color}`} />
                {i < BILL_STAGES.length - 1 && <span className="stage-line" />}
              </div>
              <div className="stage-content">
                <div className="stage-header">
                  <h4>{s.stage}</h4>
                  <span className="stage-chamber">{s.chamber}</span>
                </div>
                <p>{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Getting Started ───────────────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">Getting Started — Step by Step</h2>
        <div className="steps-list">
          {STEPS.map(step => (
            <div key={step.number} className="step-card">
              <div className="step-header">
                <span className="step-number">{step.number}</span>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
              </div>
              <p className="step-desc">{step.description}</p>
              {step.bullets && (
                <ul className="step-bullets">
                  {step.bullets.map((b, i) => (
                    <li key={i}><strong>{b.label}:</strong> {b.text}</li>
                  ))}
                </ul>
              )}
              {step.tip && (
                <div className="step-tip">
                  <strong>Tip:</strong> {step.tip}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Pillars ──────────────────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">The Three Data Pillars</h2>
        <p className="guide-section-sub">
          The RAG system combines three distinct Canadian government data sources for comprehensive coverage.
        </p>
        <div className="pillars-grid">
          {DATA_PILLARS.map(p => (
            <div key={p.name} className={`pillar-card ${p.color}`}>
              <h3>{p.name}</h3>
              <p>{p.what}</p>
              <div className="pillar-meta">
                <span className="pillar-tag">Source: {p.source}</span>
                <span className="pillar-tag">Format: {p.format}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interface Guide ───────────────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">Understanding the Interface</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h4>Header Status Bar</h4>
            <p>
              The green/red dot shows whether the backend API is reachable.
              The "chunks" badge shows how many text segments are currently in your vector database.
            </p>
          </div>
          <div className="feature-card">
            <h4>Parliament & Session Dropdowns</h4>
            <p>
              Select a Parliament and Session from the dropdowns on the Dashboard.
              Bills load automatically when you change either selection. The session
              dropdown updates to show only the sessions available for the selected Parliament.
            </p>
          </div>
          <div className="feature-card">
            <h4>Sort & Status Filter</h4>
            <p>
              <strong>Sort</strong> orders bills chronologically (Newest / Oldest first) or by default API order.
              <strong> Status</strong> filters to show only bills at a specific stage, with counts for each.
              Click "Reset all" to clear both controls and the search bar at once.
            </p>
          </div>
          <div className="feature-card">
            <h4>Bill Status Badges</h4>
            <p>
              Each bill card shows a color-coded status:
              <strong> green</strong> for Royal Assent,
              <strong> blue</strong> for Senate stage,
              <strong> amber</strong> for Committee or Second Reading, and
              <strong> gray</strong> for First Reading or Introduced.
            </p>
          </div>
          <div className="feature-card">
            <h4>Chat Mode Badges</h4>
            <p>
              The chat sidebar shows a <strong style={{color:'#b91c1c'}}>Bill Mode</strong> (red) badge when
              focused on a specific bill, or a <strong style={{color:'#1D4ED8'}}>General Mode</strong> (blue)
              badge when searching across all loaded data. Each mode has its own set of suggested questions.
            </p>
          </div>
          <div className="feature-card">
            <h4>Auto-Ingestion</h4>
            <p>
              When you click a bill and send your first question, the system automatically
              fetches the bill text and debates, embeds them, and stores them before generating
              an answer. No manual setup needed.
            </p>
          </div>
          <div className="feature-card">
            <h4>Citation Types</h4>
            <p>
              Responses cite three source types:
              <strong> Bill Text</strong> (the actual law),
              <strong> Debate</strong> (what MPs said), and
              <strong> Regulation</strong> (executive rules and RIAS analyses).
            </p>
          </div>
        </div>
      </section>

      {/* ── Example Questions ─────────────────────────────── */}

      <section className="guide-section">
        <h2 className="guide-section-title">Example Questions to Try</h2>
        <div className="examples-grid">
          <div className="example-card">
            <span className="example-type bill">Bill Mode</span>
            <p>"What are the key provisions of this bill?"</p>
          </div>
          <div className="example-card">
            <span className="example-type bill">Bill Mode</span>
            <p>"What criticisms were raised during debate?"</p>
          </div>
          <div className="example-card">
            <span className="example-type bill">Bill Mode</span>
            <p>"Who are the key sponsors and what is the current status?"</p>
          </div>
          <div className="example-card">
            <span className="example-type general">General Mode</span>
            <p>"What new regulations are being proposed in the Canada Gazette?"</p>
          </div>
          <div className="example-card">
            <span className="example-type general">General Mode</span>
            <p>"What regulations have been proposed about carbon pricing?"</p>
          </div>
          <div className="example-card">
            <span className="example-type general">General Mode</span>
            <p>"Summarize the latest regulatory impact analysis statements."</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}

      <section className="guide-section guide-faq">
        <h2 className="guide-section-title">FAQ</h2>
        <details className="faq-item">
          <summary>Do I need to manually ingest data before chatting?</summary>
          <p>
            No. When you click a bill and send your first question, the system automatically fetches
            the bill text from parl.ca and debate transcripts from OpenParliament.ca, chunks them,
            embeds them with Gemini, and stores them in the vector database — all before generating
            your answer. Subsequent questions about the same bill are instant since the data is already loaded.
          </p>
        </details>
        <details className="faq-item">
          <summary>What does "Chat with Gazette Regulations" do?</summary>
          <p>
            This button on the Dashboard loads proposed regulations from the Canada Gazette RSS feed into
            the knowledge base, then opens the Chat in General Mode so you can ask questions about them.
            Gazette data covers government-wide regulatory proposals and RIAS analyses — it isn't tied to
            any specific bill, so it only appears in General Mode searches.
          </p>
        </details>
        <details className="faq-item">
          <summary>What's the difference between Bill Mode and General Mode?</summary>
          <p>
            <strong>Bill Mode</strong> (red badge) is active when you select a specific bill. Questions
            search only that bill's text and debate transcripts. <strong>General Mode</strong> (blue badge)
            is active when no bill is selected. It searches across everything in the knowledge base —
            gazette regulations and any bills or debates you've previously loaded. Switch between them
            using the sidebar filter or by clicking a bill card on the Dashboard.
          </p>
        </details>
        <details className="faq-item">
          <summary>Why do some bills show 0 chunks after auto-ingestion?</summary>
          <p>
            Some bills (especially pro forma bills like S-1) don't have published text on parl.ca.
            Others may be too new to have debate transcripts on OpenParliament.ca. When no data is
            found, the AI will answer from its general knowledge with a clear disclaimer instead
            of leaving you with an error.
          </p>
        </details>
        <details className="faq-item">
          <summary>What's the difference between a Parliament and a Session?</summary>
          <p>
            A <strong>Parliament</strong> spans from one federal election to the next (e.g., the 45th
            Parliament began in May 2025 after a general election). Each Parliament can have multiple
            <strong> Sessions</strong> — a Session begins with a Speech from the Throne and ends by
            prorogation or dissolution. Bills that haven't passed die at the end of each Session
            unless reinstated.
          </p>
        </details>
        <details className="faq-item">
          <summary>What do the bill prefixes mean (C-, S-, etc.)?</summary>
          <p>
            <strong>C-</strong> bills originate in the House of Commons. Low numbers (C-2 through ~C-100)
            are typically Government Bills introduced by ministers. Higher numbers (C-200+) are
            Private Members' Bills. <strong>S-</strong> bills originate in the Senate.
          </p>
        </details>
        <details className="faq-item">
          <summary>How accurate are the AI responses?</summary>
          <p>
            Responses are grounded in the retrieved source chunks and include citations so you can verify claims.
            The system uses a low temperature (0.3) to minimize creative hallucination. Always check the cited
            sources for critical decisions — the AI is a research assistant, not a legal authority.
          </p>
        </details>
        <details className="faq-item">
          <summary>Can I use this offline?</summary>
          <p>
            The vector database (ChromaDB) runs locally, but you need internet access to fetch data from Parliament
            APIs and to call the Gemini API for embeddings and generation. Once data is ingested, the vector
            database persists on disk between sessions.
          </p>
        </details>
      </section>
    </div>
  )
}
