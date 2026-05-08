import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) alert(error.message)
    else if (!isLogin) alert('Bitte bestätige deine Email!')
    setLoading(false)
  }

  return (
    <div className="duel-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel" 
        style={{ padding: '48px', width: '100%', maxWidth: '420px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              background: 'linear-gradient(to bottom, #fff, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}
          >
            LEGACY <span style={{ fontWeight: 300 }}>OF THE</span> ELDERS
          </motion.div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Tritt ein in die Welt der Legenden' : 'Erstelle deinen Helden-Account'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>EMAIL</label>
            <input 
              type="email" 
              className="input-field"
              placeholder="name@beispiel.de"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>PASSWORT</label>
            <input 
              type="password" 
              className="input-field"
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', height: '56px' }}>
            {loading ? 'VERARBEITE...' : (isLogin ? 'SPIEL STARTEN' : 'JETZT REGISTRIEREN')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
            >
              {isLogin ? 'Noch keinen Account? Hier erstellen' : 'Bereits Mitglied? Hier einloggen'}
            </button>
          </div>
        </form>
      </motion.div>
      
      <div style={{ position: 'fixed', bottom: '24px', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.5 }}>
        © 2026 LEGACY OF THE ELDERS • VERSION 0.1.0
      </div>
    </div>
  )
}
