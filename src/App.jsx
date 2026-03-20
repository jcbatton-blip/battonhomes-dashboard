import React from 'react'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import UrgentItems from './components/UrgentItems'
import AgendaTopics from './components/AgendaTopics'
import OpenLoops from './components/OpenLoops'
import CompletedToday from './components/CompletedToday'
import RentRoll from './components/RentRoll'
import MessageBox from './components/MessageBox'
import Footer from './components/Footer'
import properties from './data/properties.json'
import './App.css'

export default function App() {
  const totalOwed = properties.reduce((sum, p) => sum + p.amountOwed, 0)
  const totalProperties = properties.length
  const delinquentCount = properties.filter(
    p => p.status === 'delinquent' || p.status === 'eviction'
  ).length

  return (
    <div className="app">
      <Header />
      <main className="main">
        <StatsBar
          totalOwed={totalOwed}
          totalProperties={totalProperties}
          delinquentCount={delinquentCount}
        />
        <UrgentItems />
        <AgendaTopics />
        <OpenLoops />
        <CompletedToday />
        <RentRoll properties={properties} />
        <MessageBox />
      </main>
      <Footer />
    </div>
  )
}
