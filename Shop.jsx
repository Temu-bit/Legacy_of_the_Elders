import { useState } from 'react'
import { supabase } from './supabaseClient'
import { CARD_POOL, BOOSTER_COST } from './constants'

export default function Shop({ session, setView, coins, onUpdateCoins }) {
  const [loading, setLoading] = useState(false)

  const buyBooster = async () => {
    if (coins < BOOSTER_COST) return alert("Nicht genug Münzen!")
    setLoading(true)
    try {
      // 1. Münzen abziehen
      const { error: coinError } = await supabase.from('profiles')
        .update({ coins: coins - BOOSTER_COST })
        .eq('id', session.user.id)
      if (coinError) throw coinError

      // 2. Zufällige Karte wählen (nur solche mit Bild)
      const validCards = CARD_POOL.filter(c => c.fullArtUrl)
      const randomCard = validCards[Math.floor(Math.random() * validCards.length)]

      // 3. Karte zur Sammlung hinzufügen
      const { error: cardError } = await supabase.from('user_cards').insert({
        user_id: session.user.id,
        card_id: randomCard.id,
        is_in_deck: false
      })
      if (cardError) throw cardError

      alert(`Erfolg! Du hast ${randomCard.name} erhalten!`)
      onUpdateCoins()
    } catch (err) {
      alert("Fehler beim Kauf: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="duel-container" style={{ padding: '40px', alignItems: 'center' }}>
      <button className="btn-secondary" onClick={() => setView('lobby')} style={{ alignSelf: 'flex-start' }}>ZURÜCK</button>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#fbbf24', margin: 0 }}>KARTEN SHOP</h1>
        
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '350px' }}>
          <img src="/booster_pack.png" alt="Booster Pack" style={{ width: '100%', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>LEGENDÄRES PACK</div>
          <div style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px' }}>{BOOSTER_COST} MÜNZEN</div>
          <button className="btn-primary" onClick={buyBooster} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'KAUFE...' : 'JETZT KAUFEN'}
          </button>
        </div>

        <div style={{ color: 'var(--text-muted)' }}>Deine Münzen: <span style={{ color: '#10b981', fontWeight: 800 }}>{coins}</span></div>
      </div>
    </div>
  )
}

