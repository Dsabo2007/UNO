
export enum CardColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  WILD = 'wild' // Black/Multi
}

export enum CardType {
  NUMBER = 'number',
  SKIP = 'skip',
  REVERSE = 'reverse',
  DRAW_TWO = 'draw_two',
  WILD = 'wild',
  WILD_DRAW_FOUR = 'wild_draw_four'
}

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9
  score: number;
}

export interface Player {
  id: number | string;
  name: string;
  isHuman: boolean;
  hand: Card[];
}

export enum GameStatus {
  LOBBY = 'lobby',
  DEALING = 'dealing', // New status for animation
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

export interface GameRules {
  modeName: string; // 'Normal', 'No Mercy', 'Custom'
  stacking: boolean; // Allow stacking +2/+4
  drawUntilPlay: boolean; // Keep drawing until you find a playable card
  sevenZero: boolean; // 7 swaps hands, 0 rotates hands
  jumpIn: boolean; // Play out of turn if you have exact match (not fully impl yet, but config ready)
  unoPenaltyCount: number; // Cards to draw if missed UNO
  forcePlay: boolean; // Must play if able
}

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  status: GameStatus;
  winner: Player | null;
  activeColor: CardColor; // Used when a wild card is top of discard
  drawStack: number; // For stacking draw cards (optional rule, but good for tracking pending draw)
  lastActionMessage: string;
  rules: GameRules;
}