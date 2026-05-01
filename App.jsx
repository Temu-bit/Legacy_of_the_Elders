import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Lobby from './Lobby'
import Admin from './Admin'
import Game from './Game'
import Collection from './Collection'
import Shop from './Shop'

function SetUsername({ userId, onUsernameSet }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({ username: name.trim() }).eq('id', userId)
      if (error) throw error
      onUsernameSet(name.trim())
    } catch (err) {
      alert("Fehler: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="duel-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(30, 41, 59, 0.95)', padding: '40px', borderRadius: '15px', border: '2px solid #fbbf24', textAlign: 'center', width: '350px', zIndex: 10 }}>
        <h1 style={{ color: '#fbbf24', marginBottom: '20px' }}>DEIN NAME</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Wie sollen dich deine Gegner nennen?</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input type="text" placeholder="Benutzername..." value={name} onChange={(e) => setName(e.target.value)} required maxLength={15} style={{ padding: '12px', borderRadius: '5px', border: 'none', background: '#0f172a', color: 'white', textAlign: 'center', fontSize: '1.2rem' }} />
          <button type="submit" disabled={loading} style={{ padding: '15px', background: '#fbbf24', color: '#000', border: 'none', fontWeight: '900', borderRadius: '5px', cursor: 'pointer' }}>
            {loading ? 'SPEICHERT...' : 'FERTIG'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('lobby')
  const [match, setMatch] = useState(null)
  const [role, setRole] = useState('user')
  const [username, setUsername] = useState(null)
  const [coins, setCoins] = useState(0)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoadingProfile(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        setView('lobby')
        setMatch(null)
      } else {
        setLoadingProfile(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role, username, coins').eq('id', userId).single()
      if (!error && data) {
        setRole(data.role)
        setUsername(data.username)
        setCoins(data.coins || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProfile(false)
    }
  }

  if (loadingProfile) return <div className="duel-container" style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Lade Profil...</div>
  if (!session) return <Auth />
  if (!username) return <SetUsername userId={session.user.id} onUsernameSet={(name) => { setUsername(name); fetchProfile(session.user.id); }} />
  
  if (view === 'admin' && role === 'admin') return <Admin setView={setView} />
  if (view === 'collection') return <Collection session={session} setView={setView} />
  if (view === 'shop') return <Shop session={session} setView={setView} coins={coins} onUpdateCoins={() => fetchProfile(session.user.id)} />
  if (match && view === 'game') return <Game session={session} match={match} onGameOver={() => fetchProfile(session.user.id)} />
  
  return (
    <Lobby 
      session={session} 
      onMatchFound={(matchData) => { setMatch(matchData); setView('game'); }} 
      setView={setView} 
      role={role} 
      username={username} 
      coins={coins} 
      onUpdateCoins={() => fetchProfile(session.user.id)} 
    />
  )
}
