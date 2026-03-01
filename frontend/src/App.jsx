import { useState } from 'react'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ChatInterface from './components/ChatInterface'
import Guide from './components/Guide'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedBill, setSelectedBill] = useState(null)

  function handleSelectBillForChat(bill) {
    setSelectedBill(bill)
    setActiveTab('chat')
  }

  function handleOpenGeneralChat() {
    setSelectedBill(null)
    setActiveTab('chat')
  }

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="app-main">
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard onSelectBill={handleSelectBillForChat} onOpenGeneralChat={handleOpenGeneralChat} />
        </div>
        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
          <ChatInterface selectedBill={selectedBill} onClearBill={() => setSelectedBill(null)} />
        </div>
        <div style={{ display: activeTab === 'guide' ? 'block' : 'none' }}>
          <Guide onNavigate={setActiveTab} />
        </div>
      </main>
    </div>
  )
}
