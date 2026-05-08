export default function Admin({ setView }) {
  return (
    <div className="duel-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Admin Panel</h1>
      <p>Hier kannst du Karten verwalten.</p>
      <button onClick={() => setView('lobby')} style={{ padding: '10px 20px', background: '#fbbf24', border: 'none', borderRadius: '5px' }}>ZURÜCK</button>
    </div>
  )
}
