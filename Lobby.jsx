import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from './supabaseClient'

export default function Lobby({ session, onMatchFound, setView, role, username, coins, onUpdateCoins }) {
  const [matchCode, setMatchCode] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const createMatch = async () => {
    setLoading(true)
    const newCode = generateCode()
    console.log("Erstelle Match mit Code:", newCode)
    
    try {
      const { data, error } = await supabase.from('matches').insert({ 
        player1: session.user.id, 
        lobby_code: newCode,
        game_state: null
      }).select().single()

      if (error) {
        console.error("Supabase Error:", error)
        alert("Fehler beim Erstellen: " + error.message)
        return
      }

      if (data && data.id) {
        console.log("Match erstellt, ID:", data.id)
        setMatchCode(newCode)
        
        const channel = supabase.channel(`match_${data.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${data.id}` }, (payload) => {
            console.log("Match Update empfangen:", payload.new)
            if (payload.new.player2) {
              onMatchFound(payload.new)
              supabase.removeChannel(channel)
            }
          }).subscribe()
      }
    } catch (err) {
      console.error("Unexpected Error:", err)
      alert("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  const joinMatch = async () => {
    if (!joinCode || joinCode.length < 6) return
    setLoading(true)
    const cleanCode = joinCode.trim().toUpperCase()
    console.log("Versuche Spiel beizutreten mit Code:", cleanCode)
    
    try {
      // Suche Match nach dem lobby_code
      const { data: match, error: findError } = await supabase.from('matches')
        .select('*')
        .is('player2', null)
        .eq('lobby_code', cleanCode)
        .maybeSingle()

      if (findError) throw findError

      if (match) {
        console.log("Match gefunden:", match.id)
        const { data: updatedMatch, error: updateError } = await supabase.from('matches')
          .update({ player2: session.user.id })
          .eq('id', match.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        onMatchFound(updatedMatch)
      } else {
        alert("Match nicht gefunden oder bereits voll")
      }
    } catch (err) {
      console.error("Join Error:", err)
      alert("Fehler beim Beitreten: " + (err.message || "Unbekannter Fehler"))
    } finally {
      setLoading(false)
    }
  }
  
  const [deckSize, setDeckSize] = useState(0)

  useEffect(() => {
    fetchDeckSize()
  }, [])

  const fetchDeckSize = async () => {
    const { count } = await supabase
      .from('user_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_in_deck', true)
    setDeckSize(count || 0)
  }

  return (
    <div className="duel-container">
      {/* Header */}
      <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
        <div>
          <h2 style={{ margin: 0 }}>{username}</h2>
          <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 800 }}>MÜNZEN: {coins}</div>
            <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 800 }}>DECK: {deckSize} / 40</div>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '20px' }}>
        
        {!matchCode ? (
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px' }}>
            <button className="btn-primary" onClick={createMatch} disabled={loading}>
              {loading ? 'LADE...' : 'SPIEL ERSTELLEN'}
            </button>
            
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="FREUNDES-CODE..." 
                className="input-field" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <button className="btn-secondary" onClick={joinMatch} disabled={loading}>
                BEITRETEN
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ color: '#fbbf24' }}>DEIN MATCH-CODE</h2>
            <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '5px', margin: '20px 0' }}>{matchCode}</div>
            <p>Warte auf Gegner...</p>
            <button className="btn-secondary" onClick={() => setMatchCode(null)}>ABBRECHEN</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px' }}>
          <button className="btn-secondary" style={{ width: '150px' }} onClick={() => setView('collection')}>SAMMLUNG</button>
          <button className="btn-secondary" style={{ width: '150px' }} onClick={() => setView('shop')}>SHOP</button>
          {role === 'admin' && <button className="btn-secondary" onClick={() => setView('admin')}>ADMIN</button>}
        </div>
      </div>
    </div>
  )
}

