import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'
import { CARD_POOL, INITIAL_LP } from './constants'
import './App.css'

const TCGCard = ({ card, location, onClick, isSelected, isTargetable }) => {
  if (!card) return <div className={`card-slot empty ${isTargetable ? 'targetable' : ''}`} onClick={onClick} />;
  const row = Math.floor(card.artIndex / 4);
  const col = card.artIndex % 4;

  if (card.fullArtUrl) {
    return (
      <motion.div
        className={`tcg-card full-art ${location} ${isSelected ? 'selected' : ''} ${isTargetable ? 'targetable' : ''}`}
        layoutId={card.instanceId}
        onClick={() => onClick && onClick(card)}
        style={{ 
          backgroundImage: `url('${card.fullArtUrl}')`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          border: 'none', 
          borderRadius: '12px', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}
      >
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`tcg-card ${location} ${card.type} ${isSelected ? 'selected' : ''} ${isTargetable ? 'targetable' : ''}`}
      layoutId={card.instanceId}
      onClick={() => onClick && onClick(card)}
    >
      <div className="card-inner">
        <div className="card-top">
          <span className="card-name">{card.name}</span>
        </div>
        <div className="card-art" style={{ backgroundImage: `url('/mythology_tcg_spritesheet_1777314791141.png')`, backgroundPosition: `${col * 33.333}% ${row * 33.333}%` }} />
        <div className="card-stats"><span>A/{card.atk}</span><span>D/{card.def}</span></div>
      </div>
    </motion.div>
  );
};

export default function Game({ session, match, onGameOver }) {
  const [gameState, setGameState] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [myDeck, setMyDeck] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const isP1 = match.player1 === session.user.id;

  useEffect(() => {
    initGame();

    const channel = supabase.channel(`game_${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
        if (payload.new.game_state) setGameState(payload.new.game_state);
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const initGame = async () => {
    // 1. Eigenes Deck aus der DB laden
    const { data: deckData } = await supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', session.user.id)
      .eq('is_in_deck', true);

    // Karten-Details aus dem Pool zuordnen
    const fullDeck = (deckData || []).map(d => ({
      ...CARD_POOL.find(cp => cp.id === d.card_id),
      instanceId: Math.random().toString(36).substr(2, 9)
    }));

    // Fallback falls Deck leer (nur zum Testen!)
    const finalDeck = fullDeck.length > 0 ? fullDeck : Array(10).fill(CARD_POOL[7]);
    setMyDeck(finalDeck);

    // Starthand ziehen (5 Karten)
    setPlayerHand(finalDeck.slice(0, 5));

    // 2. Initialer Spielzustand (nur von Spieler 1 erstellt)
    if (isP1 && !match.game_state) {
      const initialState = {
        p1LP: INITIAL_LP, p2LP: INITIAL_LP,
        p1Field: Array(5).fill(null), p2Field: Array(5).fill(null),
        turn: match.player1, phase: 'MAIN', log: ["Das Duell beginnt!"],
        hasSummoned: false, winner: null
      };
      updateCloudState(initialState);
    } else if (match.game_state) {
      setGameState(match.game_state);
    }
  };

  const updateCloudState = async (newState) => {
    const { error } = await supabase.from('matches').update({ game_state: newState }).eq('id', match.id);
    if (error) console.error("Sync Error:", error);
  };

  const checkGameOver = async (newState) => {
    if (newState.p1LP <= 0 || newState.p2LP <= 0) {
      const winnerId = newState.p1LP <= 0 ? match.player2 : match.player1;
      newState.winner = winnerId;

      // Belohnung für den Gewinner
      if (winnerId === session.user.id) {
        const { data: profile } = await supabase.from('profiles').select('coins').eq('id', winnerId).single();
        await supabase.from('profiles').update({ coins: (profile?.coins || 0) + 200 }).eq('id', winnerId);
      }
      updateCloudState(newState);
    }
  };

  if (!gameState) return <div className="duel-container" style={{ color: 'white' }}>Lade Deck-Daten...</div>;
  if (gameState.winner) {
    return (
      <div className="duel-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '4rem', color: gameState.winner === session.user.id ? '#10b981' : '#ef4444' }}>
          {gameState.winner === session.user.id ? 'SIEG!' : 'NIEDERLAGE!'}
        </h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '40px' }}>{gameState.winner === session.user.id ? '+ 200 Coins verdient' : 'Vielleicht beim nächsten Mal...'}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '15px 40px', background: '#fbbf24', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>ZURÜCK ZUR LOBBY</button>
      </div>
    );
  }

  const myTurn = gameState.turn === session.user.id;
  const myLP = isP1 ? gameState.p1LP : gameState.p2LP;
  const oppLP = isP1 ? gameState.p2LP : gameState.p1LP;
  const myField = isP1 ? gameState.p1Field : gameState.p2Field;
  const oppField = isP1 ? gameState.p2Field : gameState.p1Field;

  const handleHandClick = (card) => {
    if (!myTurn || gameState.phase !== 'MAIN' || gameState.hasSummoned) return;
    
    const rarity = card.rarity || 'common';
    const level = card.level || 1;
    
    // Define requirements based on Rarity Ladder and Level Scaling
    let requiredRarity = 'any';
    let count = 0;

    if (rarity === 'common') {
      count = level >= 7 ? 2 : level >= 5 ? 1 : 0;
    } else if (rarity === 'rare') {
      requiredRarity = 'common';
      count = level >= 7 ? 2 : 1;
    } else if (rarity === 'epic') {
      requiredRarity = 'rare';
      count = level >= 9 ? 3 : level >= 7 ? 2 : 1;
    } else if (rarity === 'legendary') {
      requiredRarity = 'epic';
      count = level >= 9 ? 4 : level >= 7 ? 3 : 2;
    }

    const eligibleMonsters = myField.filter(m => m && (requiredRarity === 'any' || m.rarity === requiredRarity));

    if (eligibleMonsters.length < count) {
      return alert(`Nicht genug Opfer! Du benötigst ${count} Monster der Seltenheit ${requiredRarity.toUpperCase()} auf dem Feld.`);
    }
    
    setSelectedCard({ ...card, origin: 'hand', tributesNeeded: count, requiredRarity, tributesSelected: [] });
  };

  const handleFieldClick = (index, side) => {
    if (!myTurn) return;
    const newState = { ...gameState };

    if (side === 'player') {
      if (selectedCard?.origin === 'hand') {
        const needsMoreTributes = selectedCard.tributesSelected.length < selectedCard.tributesNeeded;
        
        if (needsMoreTributes) {
          const targetCard = myField[index];
          if (targetCard) {
            // Check if rarity matches requirement
            if (selectedCard.requiredRarity !== 'any' && targetCard.rarity !== selectedCard.requiredRarity) {
              return alert(`Falsche Seltenheit! Du musst ein ${selectedCard.requiredRarity.toUpperCase()} Monster opfern.`);
            }

            if (selectedCard.tributesSelected.includes(index)) {
              setSelectedCard(prev => ({ ...prev, tributesSelected: prev.tributesSelected.filter(i => i !== index) }));
            } else {
              setSelectedCard(prev => ({ ...prev, tributesSelected: [...prev.tributesSelected, index] }));
            }
          }
          return;
        }

        // If enough tributes selected, choose empty slot to summon
        if (!myField[index]) {
          const newField = isP1 ? [...gameState.p1Field] : [...gameState.p2Field];
          
          // Remove Tributes
          selectedCard.tributesSelected.forEach(tIndex => {
            newField[tIndex] = null;
          });

          // Place new monster
          newField[index] = { ...selectedCard, canAttack: false, tributesSelected: undefined, tributesNeeded: undefined, origin: undefined };
          
          if (isP1) newState.p1Field = newField; else newState.p2Field = newField;
          newState.hasSummoned = true;
          newState.log.push(`${isP1 ? 'P1' : 'P2'} beschwört ${selectedCard.name}!`);
          
          setPlayerHand(prev => prev.filter(c => c.instanceId !== selectedCard.instanceId));
          setSelectedCard(null);
          updateCloudState(newState);
        }
      } else if (myField[index]) {
        setSelectedCard({ ...myField[index], origin: 'field', index });
      }
    } else if (side === 'enemy' && selectedCard?.origin === 'field') {
      if (gameState.phase !== 'BATTLE' || !selectedCard.canAttack) return;
      const target = oppField[index];
      if (target) {
        const diff = selectedCard.atk - target.atk;
        if (diff > 0) {
          if (isP1) { newState.p2LP -= diff; newState.p2Field[index] = null; }
          else { newState.p1LP -= diff; newState.p1Field[index] = null; }
        }
      } else if (oppField.every(s => s === null)) {
        if (isP1) newState.p2LP -= selectedCard.atk; else newState.p1LP -= selectedCard.atk;
      }
      if (isP1) newState.p1Field[selectedCard.index].canAttack = false;
      else newState.p2Field[selectedCard.index].canAttack = false;
      setSelectedCard(null);
      checkGameOver(newState); // Prüfen ob jemand gewonnen hat
      updateCloudState(newState);
    }
  };

  const nextPhase = () => {
    const newState = { ...gameState };
    if (gameState.phase === 'MAIN') {
      newState.phase = 'BATTLE';
    } else {
      newState.phase = 'MAIN';
      newState.turn = isP1 ? match.player2 : match.player1;
      newState.hasSummoned = false;
      if (isP1) newState.p2Field = newState.p2Field.map(m => m ? { ...m, canAttack: true } : null);
      else newState.p1Field = newState.p1Field.map(m => m ? { ...m, canAttack: true } : null);
      // Neue Karte ziehen beim Phasenwechsel zum Gegner? (Einfachheitshalber erst mal nicht)
    }
    updateCloudState(newState);
  };

  return (
    <div className={`duel-container ${!myTurn ? 'enemy-active' : ''}`}>
      <AnimatePresence>
        {!myTurn && <motion.div className="turn-banner" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>GEGNER AM ZUG</motion.div>}
        
        {myTurn && selectedCard?.origin === 'hand' && selectedCard.tributesNeeded > 0 && (
          <motion.div 
            className="turn-banner" 
            style={{ background: 'rgba(251, 191, 36, 0.9)', color: '#000', top: '100px' }}
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
          >
            {selectedCard.tributesSelected.length < selectedCard.tributesNeeded 
              ? `OPFER WÄHLEN: NOCH ${selectedCard.tributesNeeded - selectedCard.tributesSelected.length} ${selectedCard.requiredRarity.toUpperCase()}`
              : "FELD FÜR BESCHWÖRUNG WÄHLEN"}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lp-bars">
        <div className="lp-bar enemy"><div className="lp-fill" style={{ width: `${(oppLP / INITIAL_LP) * 100}%` }} /><span>GEGNER: {oppLP} LP</span></div>
        <div className="lp-bar player"><div className="lp-fill" style={{ width: `${(myLP / INITIAL_LP) * 100}%` }} /><span>DU: {myLP} LP</span></div>
      </div>

      <div className="playmat">
        <div className="mat-row monsters">
          {oppField.map((card, i) => (
            <TCGCard 
              key={i} 
              card={card} 
              location="field enemy" 
              onClick={() => handleFieldClick(i, 'enemy')} 
            />
          ))}
        </div>
        <div className="mat-row monsters">
          {myField.map((card, i) => {
            const isTributeSelected = selectedCard?.tributesSelected?.includes(i);
            const isEligibleTribute = selectedCard?.origin === 'hand' && 
                                     selectedCard.tributesSelected.length < selectedCard.tributesNeeded &&
                                     card && 
                                     (selectedCard.requiredRarity === 'any' || card.rarity === selectedCard.requiredRarity);
            
            const isSummonTarget = selectedCard?.origin === 'hand' && 
                                   selectedCard.tributesSelected.length === selectedCard.tributesNeeded && 
                                   !card;

            return (
              <TCGCard 
                key={i} 
                card={card} 
                location="field" 
                onClick={() => handleFieldClick(i, 'player')} 
                isSelected={selectedCard?.index === i || isTributeSelected} 
                isTargetable={isSummonTarget || isEligibleTribute}
              />
            );
          })}
        </div>
      </div>

      <div className="ui-bottom">
        <div className="player-hand">
          {playerHand.map(c => (
            <TCGCard 
              key={c.instanceId} 
              card={c} 
              location="hand" 
              isSelected={selectedCard?.instanceId === c.instanceId} 
              onClick={handleHandClick} 
            />
          ))}
        </div>
        <div className="phase-controls">
          <div className="phase-indicator">{gameState.phase}</div>
          <button className="next-btn" disabled={!myTurn} onClick={nextPhase}>WEITER</button>
        </div>
      </div>
    </div>
  );
}
