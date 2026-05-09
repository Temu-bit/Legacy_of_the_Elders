import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'
import { CARD_POOL, BOOSTER_COST } from './constants'

const BOOSTER_SIZE = 5;

const CardFlip = ({ card, index, onFlip, isFlipped }) => {
  const rarity = card.rarity || 'common'
  const rColor = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#fbbf24'
  }[rarity]

  return (
    <div className="flip-card" onClick={() => !isFlipped && onFlip(index)} style={{ width: '220px', height: '220px', perspective: '1000px', cursor: isFlipped ? 'default' : 'pointer' }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
      >
        {/* Front (Face Down) */}
        <div style={{ 
          position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '12px', border: '3px solid #fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize: '3rem', color: '#fbbf24', fontWeight: 900, opacity: 0.2 }}>L O E</div>
        </div>

        {/* Back (The Card) */}
        <div style={{ 
          position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: '12px', border: `3px solid ${rColor}`,
          backgroundImage: `url('${card.fullArtUrl}')`,
          backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          overflow: 'hidden',
          boxShadow: rarity === 'legendary' ? `0 0 30px ${rColor}` : '0 10px 20px rgba(0,0,0,0.5)'
        }}>
          {/* Redundanter Balken entfernt, da Bild eigene Werte hat */}
        </div>
      </motion.div>
    </div>
  )
}

export default function Shop({ session, setView, coins, onUpdateCoins }) {
  const [loading, setLoading] = useState(false)
  const [newCards, setNewCards] = useState([])
  const [flippedIndices, setFlippedIndices] = useState([])
  const [isOpening, setIsOpening] = useState(false)

  const buyBooster = async () => {
    if (coins < BOOSTER_COST) return alert("Nicht genug Münzen!")
    setLoading(true)
    try {
      // 1. Münzen abziehen
      const { error: coinError } = await supabase.from('profiles')
        .update({ coins: coins - BOOSTER_COST })
        .eq('id', session.user.id)
      if (coinError) throw coinError

      // 2. 5 Zufällige Karten wählen
      const validCards = CARD_POOL.filter(c => c.fullArtUrl)
      const drawnCards = []
      for (let i = 0; i < BOOSTER_SIZE; i++) {
        const rand = Math.random()
        // Simple rarity weight: 1% Legendary, 5% Epic, 20% Rare, rest Common
        let filteredPool = validCards
        if (rand < 0.01) filteredPool = validCards.filter(c => c.rarity === 'legendary')
        else if (rand < 0.06) filteredPool = validCards.filter(c => c.rarity === 'epic')
        else if (rand < 0.26) filteredPool = validCards.filter(c => c.rarity === 'rare')
        else filteredPool = validCards.filter(c => c.rarity === 'common')
        
        // Fallback if rarity pool is empty
        if (filteredPool.length === 0) filteredPool = validCards
        drawnCards.push(filteredPool[Math.floor(Math.random() * filteredPool.length)])
      }

      // 3. Karten zur Sammlung hinzufügen
      const insertData = drawnCards.map(c => ({
        user_id: session.user.id,
        card_id: c.id,
        is_in_deck: false
      }))
      
      const { error: cardError } = await supabase.from('user_cards').insert(insertData)
      if (cardError) throw cardError

      setNewCards(drawnCards)
      setIsOpening(true)
      onUpdateCoins()
    } catch (err) {
      alert("Fehler beim Kauf: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFlip = (index) => {
    if (!flippedIndices.includes(index)) {
      setFlippedIndices([...flippedIndices, index])
    }
  }

  return (
    <div className="duel-container" style={{ padding: '40px', alignItems: 'center' }}>
      <button className="btn-secondary" onClick={() => setView('lobby')} style={{ alignSelf: 'flex-start' }}>ZURÜCK</button>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#fbbf24', margin: 0 }}>KARTEN SHOP</h1>
        
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="glass-panel" 
          style={{ padding: '40px', textAlign: 'center', maxWidth: '350px', cursor: 'pointer' }}
          onClick={buyBooster}
        >
          <img src="/booster_pack.png" alt="Booster Pack" style={{ width: '100%', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>LEGENDÄRES PACK</div>
          <div style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px' }}>{BOOSTER_COST} MÜNZEN</div>
          <button className="btn-primary" disabled={loading} style={{ width: '100%', pointerEvents: 'none' }}>
            {loading ? 'KAUFE...' : 'JETZT KAUFEN'}
          </button>
        </motion.div>

        <div style={{ color: 'var(--text-muted)' }}>Deine Münzen: <span style={{ color: '#10b981', fontWeight: 800 }}>{coins}</span></div>
      </div>

      <AnimatePresence>
        {isOpening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            <h2 style={{ color: '#fbbf24', marginBottom: '40px', fontSize: '2rem' }}>DEINE KARTEN</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {newCards.map((card, i) => (
                <CardFlip 
                  key={i} 
                  card={card} 
                  index={i} 
                  isFlipped={flippedIndices.includes(i)} 
                  onFlip={handleFlip} 
                />
              ))}
            </div>
            
            {flippedIndices.length === BOOSTER_SIZE && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="btn-primary"
                style={{ marginTop: '50px', padding: '15px 40px' }}
                onClick={() => {
                  setIsOpening(false)
                  setFlippedIndices([])
                  setNewCards([])
                }}
              >
                WEITER
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

