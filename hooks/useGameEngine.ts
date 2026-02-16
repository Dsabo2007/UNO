import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Player, Card, CardColor, CardType, GameRules } from '../types';
import { generateDeck, shuffleDeck, isValidPlay, getAIPlay, getNextPlayerIndex, getBestColor } from '../utils/gameUtils';
import { playSound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { socket } from '../services/socketService';

const INITIAL_HAND_SIZE = 7;

export interface GameSettings {
  sound: boolean;
  music: boolean;
  hardMode: boolean;
}

const DEFAULT_RULES: GameRules = {
  modeName: 'Normal',
  stacking: false,
  drawUntilPlay: false,
  sevenZero: false,
  jumpIn: false,
  unoPenaltyCount: 2,
  forcePlay: false
};

export const useGameEngine = (settings: GameSettings = { sound: true, music: true, hardMode: false }) => {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    discardPile: [],
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    status: GameStatus.LOBBY,
    winner: null,
    activeColor: CardColor.RED,
    drawStack: 0,
    lastActionMessage: '',
    rules: DEFAULT_RULES
  });

  const isProcessingAI = useRef(false);
  const [wildPickerOpen, setWildPickerOpen] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [isUnoCalled, setIsUnoCalled] = useState(false);

  // Helper to respect sound settings
  const playSoundEffect = (type: 'deal' | 'play' | 'draw' | 'uno' | 'win' | 'special' | 'wild') => {
    if (settings.sound) {
      playSound(type);
    }
  };

  const callUno = () => {
    if (!isUnoCalled) {
      setIsUnoCalled(true);
      playSoundEffect('uno');
    }
  };

  const startGame = (playerCount: number, rules: GameRules = DEFAULT_RULES) => {
    let deck = generateDeck();

    // No Mercy Mode: Add more Wild cards or Action cards if we were fully implementing custom deck generation
    // For now, we use standard deck but apply aggressive rules logic

    const players: Player[] = [];

    players.push({ id: 0, name: 'You', isHuman: true, hand: [] });
    for (let i = 1; i < playerCount; i++) {
      players.push({ id: i, name: `CPU ${i}`, isHuman: false, hand: [] });
    }

    // "No Mercy" or Custom might have different starting hand size, keeping 7 for now
    players.forEach(player => {
      for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
        player.hand.push(deck.pop()!);
      }
    });

    let firstCard = deck.pop()!;
    while (firstCard.type === CardType.WILD_DRAW_FOUR) {
      deck.push(firstCard);
      deck = shuffleDeck(deck);
      firstCard = deck.pop()!;
    }

    isProcessingAI.current = false;
    setIsUnoCalled(false);

    // Start in DEALING status to trigger animations
    setGameState({
      deck,
      discardPile: [firstCard],
      players,
      currentPlayerIndex: 0,
      direction: 1,
      status: GameStatus.DEALING,
      winner: null,
      activeColor: firstCard.color === CardColor.WILD ? CardColor.RED : firstCard.color,
      drawStack: 0,
      lastActionMessage: `Starting ${rules.modeName} Game...`,
      rules: rules
    });
  };

  // Effect to handle transition from DEALING to PLAYING
  useEffect(() => {
    if (gameState.status === GameStatus.DEALING) {
      // Animation Duration: 
      // Shuffle (0.8s) + Dealing 7 cards * 0.1s + buffer ~= 2.5s
      const dealTime = 2500;

      // Play deal sound rapidly
      const dealSoundInterval = setInterval(() => {
        playSoundEffect('deal');
      }, 200);

      setTimeout(() => clearInterval(dealSoundInterval), 1500);

      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          status: GameStatus.PLAYING,
          lastActionMessage: "Game Started!"
        }));
      }, dealTime);

      return () => {
        clearTimeout(timer);
        clearInterval(dealSoundInterval);
      };
    }
  }, [gameState.status]);

  // --- MULTIPLAYER SOCKET HANDLERS ---
  useEffect(() => {
    const onGameStateUpdated = (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      if (settings.sound) playSound('play');
    };

    const onGameStarted = (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    };

    socket.on('game_state_updated', onGameStateUpdated);
    socket.on('game_started', onGameStarted);
    socket.on('player_joined', (data: { players: Player[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    });

    return () => {
      socket.off('game_state_updated', onGameStateUpdated);
      socket.off('game_started', onGameStarted);
      socket.off('player_joined');
    };
  }, [settings.sound]);

  const drawCards = useCallback((playerIndex: number, count: number, state: GameState): GameState => {
    let { deck, discardPile, players } = state;
    const player = { ...players[playerIndex] };
    const drawnCards: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        if (discardPile.length <= 1) break;
        const top = discardPile[discardPile.length - 1];
        const rest = discardPile.slice(0, discardPile.length - 1);
        deck = shuffleDeck(rest);
        discardPile = [top];
      }
      const card = deck.pop()!;
      player.hand.push(card);
      drawnCards.push(card);
    }

    playSoundEffect('draw');
    const newPlayers = [...players];
    newPlayers[playerIndex] = player;

    return {
      ...state,
      deck,
      discardPile,
      players: newPlayers,
      lastActionMessage: `${player.name} drew ${drawnCards.length} card${drawnCards.length > 1 ? 's' : ''}`
    };
  }, [settings.sound]); // Re-create if sound setting changes (though effect handles playSoundEffect)

  const triggerWinCelebration = (winner: Player) => {
    playSoundEffect('win');

    // Multiple bursts of confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    // Final game over screen delay
    setTimeout(() => {
      setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER, winner }));
    }, 1500);
  };

  const executePlay = useCallback((card: Card, colorChoice: CardColor | null = null) => {
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      const newHand = currentPlayer.hand.filter(c => c.id !== card.id);

      // -- UNO CHECK LOGIC --
      let penaltyCards: Card[] = [];
      let penaltyMessage = '';

      // If player has 1 card left after playing (means they hit UNO state)
      if (newHand.length === 1 && currentPlayer.isHuman) {
        if (!isUnoCalled) {
          // PENALTY: Draw based on rules (Default 2, No Mercy might be more)
          const penaltyCount = prev.rules.unoPenaltyCount || 2;
          let tempDeck = [...prev.deck];
          let tempDiscard = [...prev.discardPile];

          for (let i = 0; i < penaltyCount; i++) {
            if (tempDeck.length === 0) {
              if (tempDiscard.length > 1) {
                // Reshuffle approx
              }
            }
            if (tempDeck.length > 0) {
              penaltyCards.push(tempDeck.pop()!);
            }
          }
          newHand.push(...penaltyCards);
          penaltyMessage = ` (Forgot UNO! +${penaltyCount})`;
          playSoundEffect('special');
        } else {
          playSoundEffect('uno'); // Success sound
        }
      } else if (newHand.length === 1 && !currentPlayer.isHuman) {
        // AI always calls UNO
        playSoundEffect('uno');
      }

      const newPlayers = [...prev.players];
      newPlayers[prev.currentPlayerIndex] = { ...currentPlayer, hand: newHand };

      let nextIndex = prev.currentPlayerIndex;
      let nextDirection = prev.direction;
      let nextActiveColor = card.color === CardColor.WILD ? (colorChoice || CardColor.RED) : card.color;
      let shouldSkip = false;
      let drawCount = 0;

      if (card.type === CardType.REVERSE) {
        if (prev.players.length === 2) shouldSkip = true;
        else nextDirection = prev.direction === 1 ? -1 : 1;
        playSoundEffect('special');
      } else if (card.type === CardType.SKIP) {
        shouldSkip = true;
        playSoundEffect('special');
      } else if (card.type === CardType.DRAW_TWO) {
        drawCount = 2;
        playSoundEffect('special');
      } else if (card.type === CardType.WILD_DRAW_FOUR) {
        drawCount = 4;
        playSoundEffect('wild');
      } else if (card.type === CardType.WILD) {
        playSoundEffect('wild');
      } else {
        playSoundEffect('play');
      }

      // Winner Logic
      if (newHand.length === 0) {
        triggerWinCelebration(currentPlayer);
        return {
          ...prev,
          discardPile: [...prev.discardPile, card],
          players: newPlayers,
          activeColor: nextActiveColor,
          direction: nextDirection,
          lastActionMessage: `${currentPlayer.name} plays their last card and WINS!`
        };
      }

      if (shouldSkip) {
        nextIndex = getNextPlayerIndex(nextIndex, nextDirection, prev.players.length);
      }
      nextIndex = getNextPlayerIndex(nextIndex, nextDirection, prev.players.length);

      // Reset UNO call for next turn
      if (currentPlayer.isHuman) {
        setIsUnoCalled(false);
      }

      let tempState = {
        ...prev,
        deck: penaltyCards.length > 0 ? prev.deck.slice(0, prev.deck.length - penaltyCards.length) : prev.deck,
        discardPile: [...prev.discardPile, card],
        players: newPlayers,
        currentPlayerIndex: nextIndex,
        direction: nextDirection,
        activeColor: nextActiveColor,
        lastActionMessage: `${currentPlayer.name} played ${card.type.replace('_', ' ')}${penaltyMessage}`
      };

      if (drawCount > 0) {
        // Here we could implement stacking logic if rules.stacking is true
        // For now, simpler implementation:
        tempState = drawCards(nextIndex, drawCount, tempState);
        tempState.currentPlayerIndex = getNextPlayerIndex(tempState.currentPlayerIndex, tempState.direction, tempState.players.length);
      }

      // EMIT TO SERVER IF MULTIPLAYER
      const roomId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('uno_room_id') : null;
      if (roomId && socket.connected) {
        socket.emit('update_game_state', { roomId, gameState: tempState });
      }

      return tempState;
    });

    setIsUnoCalled(false);

  }, [drawCards, settings.sound, isUnoCalled]);

  const humanPlayCard = (card: Card) => {
    if (gameState.status !== GameStatus.PLAYING || gameState.winner) return;
    if (gameState.players[gameState.currentPlayerIndex].isHuman === false) return;

    if (isValidPlay(card, gameState.discardPile[gameState.discardPile.length - 1], gameState.activeColor)) {
      if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
        setPendingWildCard(card);
        setWildPickerOpen(true);
      } else {
        executePlay(card);
      }
    }
  };

  const humanSelectWildColor = (color: CardColor) => {
    if (pendingWildCard) {
      executePlay(pendingWildCard, color);
      setWildPickerOpen(false);
      setPendingWildCard(null);
    }
  };

  const humanDrawCard = () => {
    if (gameState.status !== GameStatus.PLAYING || gameState.winner) return;
    if (!gameState.players[gameState.currentPlayerIndex].isHuman) return;

    setGameState(prev => {
      const currentPlayerObj = prev.players[prev.currentPlayerIndex];
      const count = 1; // Or rules.drawUntilPlay logic
      const newState = drawCards(prev.currentPlayerIndex, count, prev);
      newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.direction, newState.players.length);
      newState.lastActionMessage = `${currentPlayerObj.name} drew and passed`;

      const roomId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('uno_room_id') : null;
      if (roomId && socket.connected) {
        socket.emit('update_game_state', { roomId, gameState: newState });
      }

      return newState;
    });

    setIsUnoCalled(false);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING || gameState.winner) return;

    // If multiplayer, disable local AI logic usually.
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('uno_room_id')) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isHuman) return;

    if (isProcessingAI.current) return;
    isProcessingAI.current = true;

    const timer = setTimeout(() => {
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      const cardToPlay = getAIPlay(currentPlayer.hand, topCard, gameState.activeColor, settings.hardMode);

      if (cardToPlay) {
        let wildColor = null;
        if (cardToPlay.type === CardType.WILD || cardToPlay.type === CardType.WILD_DRAW_FOUR) {
          wildColor = getBestColor(currentPlayer.hand, settings.hardMode);
        }
        executePlay(cardToPlay, wildColor);
      } else {
        setGameState(prev => {
          const newState = drawCards(prev.currentPlayerIndex, 1, prev);
          newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.direction, newState.players.length);
          newState.lastActionMessage = `${currentPlayer.name} drew and passed`;
          return newState;
        });
      }
      isProcessingAI.current = false;
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [
    gameState.currentPlayerIndex,
    gameState.status,
    gameState.activeColor,
    gameState.discardPile,
    drawCards,
    executePlay,
    gameState.players,
    gameState.winner,
    settings.hardMode
  ]);

  return {
    gameState,
    startGame,
    humanPlayCard,
    humanDrawCard,
    humanSelectWildColor,
    wildPickerOpen,
    isUnoCalled,
    callUno,
    restartGame: () => setGameState(prev => ({ ...prev, status: GameStatus.LOBBY, winner: null }))
  };
};