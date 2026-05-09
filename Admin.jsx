import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Admin({ setView }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('username')
    if (!error) setProfiles(data)
    setLoading(false)
  }

  const updateProfile = async (id, field, value) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    if (!error) fetchProfiles()
    else alert("Fehler beim Aktualisieren")
  }

  return (
    <div className="duel-container" style={{ padding: '40px' }}>
      <button className="btn-secondary" onClick={() => setView('lobby')}>ZURÜCK</button>
      
      <h1 style={{ textAlign: 'center', color: '#fbbf24' }}>SPIELER VERWALTUNG</h1>

      {loading ? (
        <div style={{ textAlign: 'center' }}>Lädt Profile...</div>
      ) : (
        <div className="glass-panel" style={{ marginTop: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '15px' }}>NAME</th>
                <th style={{ padding: '15px' }}>ROLLE</th>
                <th style={{ padding: '15px' }}>MÜNZEN</th>
                <th style={{ padding: '15px' }}>AKTIONEN</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '15px' }}>{p.username || 'Unbekannt'}</td>
                  <td style={{ padding: '15px' }}>
                    <select 
                      value={p.role} 
                      onChange={(e) => updateProfile(p.id, 'role', e.target.value)}
                      style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '5px', borderRadius: '4px' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <input 
                      type="number" 
                      value={p.coins} 
                      onChange={(e) => updateProfile(p.id, 'coins', parseInt(e.target.value))}
                      style={{ width: '80px', background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '5px', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '15px' }}>
                    <button 
                      onClick={() => {
                        const newCoins = (p.coins || 0) + 1000
                        updateProfile(p.id, 'coins', newCoins)
                      }}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      +1000 MÜNZEN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

