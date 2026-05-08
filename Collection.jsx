export default function Collection({ session, setView }) {
  return (
    <div className="duel-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Meine Sammlung</h1>
      <p>Hier siehst du deine Karten.</p>
      <button onClick={() => setView('lobby')} style={{ padding: '10px 20px', background: '#fbbf24', border: 'none', borderRadius: '5px' }}>ZURÜCK</button>
    </div>
  )
}
