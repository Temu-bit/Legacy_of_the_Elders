import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { CARD_POOL } from './constants'

export default function Collection({ session, setView }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const DECK_LIMITS = {
    common: 40,
    rare: 15,
    epic: 8,
    legendary: 3
  }

  useEffect(() => {
    fetchCards()
  }, []) // Load all once, filter in render or separately

  const fetchCards = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', session.user.id)
    
    if (!error && data) {
      const grouped = data.reduce((acc, curr) => {
        const details = CARD_POOL.find(cp => cp.id === curr.card_id)
        if (!details?.fullArtUrl) return acc
        
        if (!acc[curr.card_id]) {
          acc[curr.card_id] = {
            ...curr,
            instances: [],
            count: 0,
            details: details
          }
        }
        acc[curr.card_id].instances.push(curr)
        acc[curr.card_id].count++
        return acc
      }, {})

      setCards(Object.values(grouped))
    }
    setLoading(false)
  }

  const addToDeck = async (card) => {
    const rarity = card.details?.rarity || 'common'
    // Count across ALL cards, not just filtered ones
    const currentRarityCount = cards.reduce((sum, c) => 
      sum + (c.details.rarity === rarity ? c.instances.filter(i => i.is_in_deck).length : 0), 0)
    
    if (currentRarityCount >= DECK_LIMITS[rarity]) {
      return alert(`Limit erreicht! Du darfst nur ${DECK_LIMITS[rarity]} Karten der Seltenheit ${rarity.toUpperCase()} im Deck haben.`)
    }

    const nextInstance = card.instances.find(i => !i.is_in_deck)
    if (!nextInstance) return 
    
    setCards(prev => prev.map(c => {
      if (c.id === card.id) {
        const updatedInstances = c.instances.map(i => i.id === nextInstance.id ? { ...i, is_in_deck: true } : i)
        return { ...c, instances: updatedInstances }
      }
      return c
    }))

    await supabase.from('user_cards').update({ is_in_deck: true }).eq('id', nextInstance.id)
  }

  const removeFromDeck = async (card) => {
    const nextInstance = card.instances.find(i => i.is_in_deck)
    if (!nextInstance) return 
    
    // Optimistic Update for immediate feedback
    setCards(prev => prev.map(c => {
      if (c.id === card.id) {
        const updatedInstances = c.instances.map(i => i.id === nextInstance.id ? { ...i, is_in_deck: false } : i)
        return { ...c, instances: updatedInstances }
      }
      return c
    }))

    await supabase.from('user_cards').update({ is_in_deck: false }).eq('id', nextInstance.id)
  }

  const totalInDeck = cards.reduce((sum, card) => sum + card.instances.filter(i => i.is_in_deck).length, 0)

  const getRarityCount = (rarity) => cards.reduce((sum, c) => 
    sum + (c.details.rarity === rarity ? c.instances.filter(i => i.is_in_deck).length : 0), 0)

  const rarities = [
    { id: 'all', label: 'ALLE', color: '#fff' },
    { id: 'deck', label: 'MEIN DECK', color: '#10b981' },
    { id: 'common', label: 'COMMON', color: '#94a3b8' },
    { id: 'rare', label: 'RARE', color: '#3b82f6' },
    { id: 'epic', label: 'EPIC', color: '#a855f7' },
    { id: 'legendary', label: 'LEGENDARY', color: '#fbbf24' }
  ]

  const filteredCards = cards.filter(c => {
    if (filter === 'deck') return c.instances.some(i => i.is_in_deck)
    return filter === 'all' || c.details.rarity === filter
  })

  return (
    <div className="duel-container" style={{ padding: '40px' }}>
      <button className="btn-secondary" onClick={() => setView('lobby')}>ZURÜCK</button>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#fbbf24', margin: '20px 0 10px 0' }}>MEINE SAMMLUNG</h1>
        
        {/* Rarity Slots Status */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', fontSize: '0.8rem', fontWeight: 800, flexWrap: 'wrap' }}>
          <div style={{ color: '#94a3b8' }}>COMMON: {getRarityCount('common')}/{DECK_LIMITS.common}</div>
          <div style={{ color: '#3b82f6' }}>RARE: {getRarityCount('rare')}/{DECK_LIMITS.rare}</div>
          <div style={{ color: '#a855f7' }}>EPIC: {getRarityCount('epic')}/{DECK_LIMITS.epic}</div>
          <div style={{ color: '#fbbf24' }}>LEGENDARY: {getRarityCount('legendary')}/{DECK_LIMITS.legendary}</div>
        </div>

        {/* Rarity Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {rarities.map(r => (
            <button
              key={r.id}
              onClick={() => setFilter(r.id)}
              className="btn-secondary"
              style={{ 
                borderColor: filter === r.id ? r.color : 'rgba(255,255,255,0.1)',
                color: filter === r.id ? r.color : '#fff',
                background: filter === r.id ? `${r.color}22` : 'rgba(255,255,255,0.05)',
                fontSize: '0.7rem',
                padding: '8px 16px',
                minWidth: '100px'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
          Deck-Größe: <span style={{ color: '#fbbf24' }}>{totalInDeck} / 40 Karten</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', fontSize: '1.5rem' }}>Lade Sammlung...</div>
      ) : (
        <div className="card-preview-grid">
          {filteredCards.map(card => {
            const rarity = card.details?.rarity || 'common'
            const rColor = {
              common: '#94a3b8',
              rare: '#3b82f6',
              epic: '#a855f7',
              legendary: '#fbbf24'
            }[rarity]
                       const inDeckCount = card.instances.filter(i => i.is_in_deck).length
            return <CardItem key={card.id} card={card} inDeckCount={inDeckCount} rColor={rColor} rarity={rarity} removeFromDeck={removeFromDeck} addToDeck={addToDeck} />
          })}
        </div>
      )}
    </div>
  )
}

function CardItem({ card, inDeckCount, rColor, rarity, removeFromDeck, addToDeck }) {
  const [imgStatus, setImgStatus] = useState('loading') // loading, loaded, error

  return (
    <div 
      className="tcg-card"
      style={{ 
        cursor: 'default', 
        position: 'relative',
        borderColor: inDeckCount > 0 ? '#10b981' : rColor,
        overflow: 'visible',
        boxShadow: inDeckCount > 0 
          ? `0 0 20px rgba(16, 185, 129, 0.4)`
          : rarity === 'legendary' 
          ? `0 0 25px rgba(251, 191, 36, 0.5)`
          : rarity === 'epic'
          ? `0 0 15px rgba(168, 85, 247, 0.4)`
          : `0 10px 20px rgba(0,0,0,0.3)`
      }}
    >
      {/* In Deck Badge */}
      {inDeckCount > 0 && (
        <div style={{ 
          position: 'absolute', top: '-10px', right: '-10px', background: '#10b981', color: '#000', 
          padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, zIndex: 25,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          IM DECK
        </div>
      )}

      {/* Ownership Count Badge */}
      {card.count > 1 && (
        <div style={{ 
          position: 'absolute', top: '-12px', left: '-12px', 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          color: '#fff', border: `2px solid ${rColor}`, width: '38px', height: '38px',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', fontWeight: 900, zIndex: 20,
          boxShadow: `0 4px 12px rgba(0,0,0,0.6), 0 0 10px ${rColor}44`,
        }}>
          {card.count}
        </div>
      )}

      <div style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden', position: 'relative', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {card.details?.fullArtUrl ? (
          <>
            {imgStatus !== 'loaded' && (
              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: '10px', textAlign: 'center'
              }}>
                <div style={{ fontWeight: 900, fontSize: '0.8rem', color: '#fbbf24', marginBottom: '5px' }}>{card.details.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{imgStatus === 'loading' ? 'LÄDT...' : 'BILD FEHLT'}</div>
                <div style={{ fontSize: '0.5rem', marginTop: '5px' }}>ATK {card.details.atk} / DEF {card.details.def}</div>
              </div>
            )}

            <img 
              src={card.details.fullArtUrl} 
              alt={card.details.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: imgStatus === 'loaded' ? 'block' : 'none' }}
              onLoad={() => setImgStatus('loaded')}
              onError={() => setImgStatus('error')}
            />
            
            {/* Deck Controls Overlay */}
            <div className="card-controls" style={{ 
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 10,
              background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
              <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                 {inDeckCount} / {card.count}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                 <button onClick={(e) => { e.stopPropagation(); removeFromDeck(card); }} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 900 }}>-</button>
                 <button onClick={(e) => { e.stopPropagation(); addToDeck(card); }} style={{ background: '#10b981', border: 'none', color: 'white', borderRadius: '4px', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 900 }}>+</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontWeight: 900, color: '#fbbf24' }}>{card.details?.name}</div>
            <div style={{ fontSize: '0.7rem' }}>KEIN BILD</div>
          </div>
        )}
      </div>
    </div>
  )
}
>
      )}
    </div>
  )
}

