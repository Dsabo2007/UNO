import { Card, CardColor, CardType } from '../types';

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];
  let idCounter = 0;

  colors.forEach(color => {
    // 0 card (one per color)
    deck.push({ id: `card-${idCounter++}`, color, type: CardType.NUMBER, value: 0, score: 0 });

    // 1-9 cards (two per color)
    for (let i = 1; i <= 9; i++) {
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.NUMBER, value: i, score: i });
      deck.push({ id: `card-${idCounter++}`, color, type: CardType.NUMBER, value: i, score: i });
    }

    // Action cards (two per color)
    [CardType.SKIP, CardType.REVERSE, CardType.DRAW_TWO].forEach(type => {
      deck.push({ id: `card-${idCounter++}`, color, type, score: 20 });
      deck.push({ id: `card-${idCounter++}`, color, type, score: 20 });
    });
  });

  // Wild cards (four of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: CardColor.WILD, type: CardType.WILD, score: 50 });
    deck.push({ id: `card-${idCounter++}`, color: CardColor.WILD, type: CardType.WILD_DRAW_FOUR, score: 50 });
  }

  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const isValidPlay = (card: Card, topCard: Card, activeColor: CardColor): boolean => {
  if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) {
    return true;
  }
  
  // If top card is wild, we must match the declared active color
  if (topCard.color === CardColor.WILD) {
    return card.color === activeColor;
  }

  // Match color, value (for numbers), or type (for actions)
  return (
    card.color === activeColor ||
    (card.value !== undefined && card.value === topCard.value) ||
    card.type === topCard.type
  );
};

export const getBestColor = (hand: Card[], isHardMode: boolean = true): CardColor => {
  const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];
  
  // Easy Mode: Pick a random color
  if (!isHardMode) {
      return colors[Math.floor(Math.random() * colors.length)];
  }

  // Hard Mode: Pick color with most cards
  let bestColor = colors[0];
  let maxCount = -1;

  colors.forEach(color => {
    const count = hand.filter(c => c.color === color).length;
    if (count > maxCount) {
      maxCount = count;
      bestColor = color;
    } else if (count === maxCount && Math.random() > 0.5) {
      // Randomly pick between tied colors
      bestColor = color;
    }
  });

  return bestColor;
};

export const getAIPlay = (hand: Card[], topCard: Card, activeColor: CardColor, isHardMode: boolean = true): Card | null => {
  const playableCards = hand.filter(card => isValidPlay(card, topCard, activeColor));
  
  if (playableCards.length === 0) return null;

  // Easy Mode: Random valid play
  if (!isHardMode) {
    const randomIndex = Math.floor(Math.random() * playableCards.length);
    return playableCards[randomIndex];
  }

  // Hard Mode Strategy (Aggressive)
  // 1. Prioritize attacks that force opponent to draw (Draw Two, Wild Draw 4)
  // We prefer non-wild Draw Two first if possible, but will use Wild Draw 4 aggressively if needed.
  const drawTwo = playableCards.find(c => c.type === CardType.DRAW_TWO);
  if (drawTwo) return drawTwo;

  const drawFour = playableCards.find(c => c.type === CardType.WILD_DRAW_FOUR);
  if (drawFour) return drawFour;

  // 2. Play actions to disrupt (Skip, Reverse)
  const action = playableCards.find(c => c.type === CardType.SKIP || c.type === CardType.REVERSE);
  if (action) return action;

  // 3. Play matching numbers (prioritize high score to dump points)
  const numbers = playableCards.filter(c => c.type === CardType.NUMBER);
  if (numbers.length > 0) {
    // Return highest value card
    return numbers.sort((a, b) => b.score - a.score)[0];
  }

  // 4. Play standard Wild last (unless it was Draw 4 which is handled in step 1)
  const wild = playableCards.find(c => c.type === CardType.WILD);
  if (wild) return wild;

  // Fallback
  return playableCards[0];
};

export const getNextPlayerIndex = (currentIndex: number, direction: 1 | -1, totalPlayers: number): number => {
  let next = currentIndex + direction;
  if (next < 0) next = totalPlayers - 1;
  if (next >= totalPlayers) next = 0;
  return next;
};