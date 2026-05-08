export default function Shop({ session, setView, coins, onUpdateCoins }) {
  return (
    <div className="duel-container" style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Karten Shop</h1>
      <p>Münzen: {coins}</p>
      <button onClick={() => setView('lobby')} style={{ padding: '10px 20px', background: '#fbbf24', border: 'none', borderRadius: '5px' }}>ZURÜCK</button>
    </div>
  )
}
