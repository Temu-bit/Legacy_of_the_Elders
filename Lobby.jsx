import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from './supabaseClient'

export default function Lobby({ session, onMatchFound, setView, role, username, coins, onUpdateCoins }) {
  const [looking, setLooking] = useState(false)

  const findMatch = async () => {
    setLooking(true)
    const { data: matches } = await supabase.from('matches').select('*').is('player2', null).neq('player1', session.user.id).limit(1)
    
    if (matches && matches.length > 0) {
      const { data: updatedMatch, error } = await supabase.from('matches').update({ player2: session.user.id }).eq('id', matches[0].id).select().single()
      if (!error) onMatchFound(updatedMatch)
    } else {
      const { data: newMatch, error } = await supabase.from('matches').insert({ player1: session.user.id }).select().single()
      if (!error) {
          const channel = supabase.channel(`match_${newMatch.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${newMatch.id}` }, (payload) => {
            if (payload.new.player2) {
              onMatchFound(payload.new)
              supabase.removeChannel(channel)
            }
          }).subscribe()
      }
    }
  }

  return (
    <div className="duel-container">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid var(--glass-border)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>
            {username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{username}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
              <span>ROLE: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{role.toUpperCase()}</span></span>
              <span>COINS: <span style={{ color: '#10b981', fontWeight: 600 }}>{coins}</span></span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '60px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
          
          {/* Left Column: Game Modes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="glass-panel" 
              style={{ padding: '40px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(251, 191, 36, 0.05))', border: '2px solid rgba(251, 191, 36, 0.3)' }}
              onClick={findMatch}
            >
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '12px' }}>RANKED DUEL</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '32px' }}>Kämpfe gegen andere Spieler um Ruhm und Ehre. Gewinne Münzen und steige in der Rangliste auf.</p>
              <button disabled={looking} className="btn-primary" style={{ padding: '16px 48px', fontSize: '1.2rem' }}>
                {looking ? 'SUCHE GEGNER...' : 'JETZT SPIELEN'}
              </button>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
               <motion.div whileHover={{ y: -5 }} className="glass-panel" style={{ padding: '32px', cursor: 'pointer' }} onClick={() => setView('collection')}>
                  <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>SAMMLUNG</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verwalte dein Deck und entdecke neue Karten.</p>
               </motion.div>
               <motion.div whileHover={{ y: -5 }} className="glass-panel" style={{ padding: '32px', cursor: 'pointer' }} onClick={() => setView('shop')}>
                  <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>MARKTPLATZ</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Kaufe Booster-Packs und seltene Einzelkarten.</p>
               </motion.div>
            </div>
          </div>

          {/* Right Column: Stats / Events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <div className="glass-panel" style={{ padding: '32px', flex: 1 }}>
                <h3 style={{ margin: '0 0 24px 0', color: 'white', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>AKTIVITÄT</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {[1,2,3].map(i => (
                     <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', opacity: 0.7 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                        <div style={{ fontSize: '0.9rem' }}>
                           <div style={{ fontWeight: 600 }}>Tägliche Belohnung</div>
                           <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Vor 2 Stunden • +50 Coins</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             {role === 'admin' && (
               <button className="btn-secondary" style={{ padding: '20px', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setView('admin')}>
                  ADMIN DASHBOARD ÖFFNEN
               </button>
             )}
          </div>

        </div>
      </div>
    </div>
  )
}
