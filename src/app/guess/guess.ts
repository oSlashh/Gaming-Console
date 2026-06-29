import { Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Player {
  id: number;
  name: string;
  score: number;
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
  color: 'red' | 'black';
}

type GamePhase =
  | 'instructions'
  | 'setup'
  | 'playing'
  | 'end';

type TurnStage = 1 | 2 | 3 | 4;

type TurnMode = 'unlimited' | 5 | 10 | 15 | 20;

interface TurnResult {
  stage: TurnStage;
  correct: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-guess-guess',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guess.html',
  styleUrls: ['./guess.css']
})
export class GuessGuessComponent implements OnInit, OnDestroy {

  // Phase control
  phase: GamePhase = 'instructions';

  // Setup
  playerCount = 2;
  players: Player[] = [];
  turnMode: TurnMode = 'unlimited';
  turnOptions: TurnMode[] = ['unlimited', 5, 10, 15, 20];

  // Gameplay state
  deck: Card[] = [];
  drawnCards: Card[] = [];          // up to 4 cards per turn
  currentStage: TurnStage = 1;
  currentPlayerIndex = 0;
  totalTurnsPlayed = 0;
  currentRound = 1;
  currentTurnScore = 0;
  revealedCard: Card | null = null;
  isCardFlipping = false;
  isWrongGuess = false;
  isCorrectGuess = false;
  turnFeedbackMessage = '';
  showTurnBanner = false;
  turnBannerText = '';

  // Timer
  sessionSeconds = 600;
  timerDisplay = '10:00';
  timerWarning = false;
  timerCritical = false;
  timerInterval: ReturnType<typeof setInterval> | null = null;
  showCountdown = false;
  countdownValue: number | string = 3;
  countdownInterval: ReturnType<typeof setInterval> | null = null;

  // End game modal
  showEndModal = false;
  endReason: 'timer' | 'turns' | 'quit' = 'quit';

  // Suit display map
  suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
  this.playerCount = 2;
  this.syncPlayers();
}

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearCountdown();
  }

  // ─── Setup helpers ──────────────────────────────────────────────────────────

  get minPlayers() { return 2; }
  get maxPlayers() { return 10; }

  decrementPlayers(): void {
  if (this.playerCount > 2) {
    this.playerCount--;
    this.syncPlayers();
  }
}

  incrementPlayers(): void {
  if (this.playerCount < 10) {
    this.playerCount++;
    this.syncPlayers();
  }
}

  syncPlayers(): void {
    const current = this.players.length;
    if (this.playerCount > current) {
      for (let i = current + 1; i <= this.playerCount; i++) {
        this.players.push({ id: i, name: `Player ${i}`, score: 0 });
      }
    } else {
      this.players = this.players.slice(0, this.playerCount);
    }
  }

  setTurnMode(mode: TurnMode): void {
    this.turnMode = mode;
  }

  isTurnModeSelected(mode: TurnMode): boolean {
    return this.turnMode === mode;
  }

  turnModeLabel(mode: TurnMode): string {
    return mode === 'unlimited' ? 'Unlimited' : `${mode} Turns`;
  }
  proceedFromInstructions(): void {
  this.playerCount = 2;
  this.syncPlayers();

  this.phase = 'setup';

  this.cdr.detectChanges();
}

  // ─── Deck ───────────────────────────────────────────────────────────────────

  generateDeck(): Card[] {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const numericMap: Record<string, number> = {
      A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13
    };
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          numericValue: numericMap[value],
          color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
        });
      }
    }
    return deck;
  }

  shuffleDeck(deck: Card[]): Card[] {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  drawCard(): Card {
    if (this.deck.length === 0) {
      this.deck = this.shuffleDeck(this.generateDeck());
    }
    return this.deck.pop()!;
  }

  // ─── Game flow ──────────────────────────────────────────────────────────────

  startGame(): void {
    this.players.forEach(p => p.score = 0);
    this.currentPlayerIndex = 0;
    this.totalTurnsPlayed = 0;
    this.phase = 'playing';
    this.startSessionTimer();
    this.startTurn();
  }

  startTurn(): void {
    this.deck = this.shuffleDeck(this.generateDeck());
    this.drawnCards = [];
    this.currentStage = 1;
    this.currentTurnScore = 0;
    this.revealedCard = null;
    this.isWrongGuess = false;
    this.isCorrectGuess = false;
    this.turnFeedbackMessage = '';
    this.cdr.detectChanges();
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  get sortedLeaderboard(): Player[] {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  // ─── Stage processing ────────────────────────────────────────────────────────

  processRedBlack(guess: 'red' | 'black'): void {
    if (this.isCardFlipping) return;
    this.isCardFlipping = true;
    const card = this.drawCard();
    this.drawnCards[0] = card;

    setTimeout(() => {
      this.revealedCard = card;
      this.isCardFlipping = false;
      if (card.color === guess) {
        this.currentTurnScore = 1;
        this.isCorrectGuess = true;
        this.turnFeedbackMessage = '✓ Correct! Stage 1 cleared.';
        setTimeout(() => {
          this.isCorrectGuess = false;
          this.currentStage = 2;
          this.revealedCard = null;
        }, 1000);
      } else {
        this.isWrongGuess = true;
        this.turnFeedbackMessage = `✗ Wrong! It was ${card.color}.`;
        setTimeout(() => this.endTurn(false), 1500);
      }
    }, 700);
  }

  processHigherLower(guess: 'higher' | 'lower'): void {
    if (this.isCardFlipping) return;
    this.isCardFlipping = true;
    const card = this.drawCard();
    this.drawnCards[1] = card;
    const prevCard = this.drawnCards[0];

    setTimeout(() => {
      this.revealedCard = card;
      this.isCardFlipping = false;
      const isHigher = card.numericValue > prevCard.numericValue;
      const isLower = card.numericValue < prevCard.numericValue;
      const correct = (guess === 'higher' && isHigher) || (guess === 'lower' && isLower);
      if (correct) {
        this.currentTurnScore = 2;
        this.isCorrectGuess = true;
        this.turnFeedbackMessage = '✓ Correct! Stage 2 cleared.';
        setTimeout(() => {
          this.isCorrectGuess = false;
          this.currentStage = 3;
          this.revealedCard = null;
        }, 1000);
      } else {
        this.isWrongGuess = true;
        this.turnFeedbackMessage = `✗ Wrong! Card was ${card.value} (${card.numericValue}).`;
        setTimeout(() => this.endTurn(false), 1500);
      }
    }, 700);
  }

  processInsideOutside(guess: 'inside' | 'outside'): void {
    if (this.isCardFlipping) return;
    this.isCardFlipping = true;
    const card = this.drawCard();
    this.drawnCards[2] = card;
    const v1 = this.drawnCards[0].numericValue;
    const v2 = this.drawnCards[1].numericValue;
    const lo = Math.min(v1, v2);
    const hi = Math.max(v1, v2);
    const v = card.numericValue;

    setTimeout(() => {
      this.revealedCard = card;
      this.isCardFlipping = false;
      const inside = v > lo && v < hi;
      const outside = v < lo || v > hi || v === lo || v === hi;
      const correct = (guess === 'inside' && inside) || (guess === 'outside' && outside);
      if (correct) {
        this.currentTurnScore = 3;
        this.isCorrectGuess = true;
        this.turnFeedbackMessage = '✓ Correct! Stage 3 cleared.';
        setTimeout(() => {
          this.isCorrectGuess = false;
          this.currentStage = 4;
          this.revealedCard = null;
        }, 1000);
      } else {
        this.isWrongGuess = true;
        this.turnFeedbackMessage = `✗ Wrong! Card was ${card.value} (${v}).`;
        setTimeout(() => this.endTurn(false), 1500);
      }
    }, 700);
  }

  processSuitGuess(suit: Card['suit']): void {
    if (this.isCardFlipping) return;
    this.isCardFlipping = true;
    const card = this.drawCard();
    this.drawnCards[3] = card;

    setTimeout(() => {
      this.revealedCard = card;
      this.isCardFlipping = false;
      if (card.suit === suit) {
        this.currentTurnScore = 4;
        this.isCorrectGuess = true;
        this.turnFeedbackMessage = '✓ Perfect! All 4 stages cleared!';
        setTimeout(() => this.endTurn(true), 1500);
      } else {
        this.isWrongGuess = true;
        this.turnFeedbackMessage = `✗ Wrong! It was ${this.suitSymbols[card.suit]} ${card.suit}.`;
        setTimeout(() => this.endTurn(false), 1500);
      }
    }, 700);
  }

  endTurn(allCorrect: boolean): void {
    this.currentPlayer.score += this.currentTurnScore;
    this.totalTurnsPlayed++;
    this.isWrongGuess = false;
    this.isCorrectGuess = false;

    // Check fixed turn limit
    if (this.turnMode !== 'unlimited') {
      const limit = this.turnMode as number;
      const turnsPerCycle = this.players.length;
      if (this.currentRound > limit) {
        this.triggerEndGame('turns');
        return;
      }
    }

    this.nextPlayer();
  }

  nextPlayer(): void {

    const previousPlayer = this.currentPlayerIndex;

    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
    
      if (
        previousPlayer === this.players.length - 1 &&
        this.currentPlayerIndex === 0
      ) {
  this.currentRound++;
}

    this.turnBannerText =
      `${this.currentPlayer.name}'s Turn`;

    this.showTurnBanner = true;

    setTimeout(() => {

      this.showTurnBanner = false;

      this.startTurn();

    }, 2000);

  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  startSessionTimer(): void {
    this.clearTimer();
    this.sessionSeconds = 600;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.sessionSeconds--;
      console.log(
        'Timer:',
        this.sessionSeconds
      );
      this.updateTimerDisplay();
      this.cdr.detectChanges();
      this.timerWarning = this.sessionSeconds <= 15;
      this.timerCritical = this.sessionSeconds <= 4;
      if (this.sessionSeconds <= 4 && this.sessionSeconds > 0) {
        this.startFinalCountdown();
      }
      if (this.sessionSeconds <= 0) {
        this.clearTimer();
        this.triggerEndGame('timer');
      }
    }, 1000);
  }

  updateTimerDisplay(): void {
    const m = Math.floor(this.sessionSeconds / 60);
    const s = this.sessionSeconds % 60;
    this.timerDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  startFinalCountdown(): void {
    if (this.showCountdown) return;
    this.showCountdown = true;
    this.countdownValue = 3;
    let count = 3;
    this.countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownValue = count;
      } else {
        this.countdownValue = "TIME'S UP!";
        this.clearCountdown();
        setTimeout(() => {

          this.showTurnBanner = false;

          this.cdr.detectChanges();

          this.startTurn();

        }, 2000);
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ─── End game ───────────────────────────────────────────────────────────────

  triggerEndGame(reason: 'timer' | 'turns' | 'quit'): void {
    this.endReason = reason;
    this.clearTimer();
    this.clearCountdown();
    this.showEndModal = true;
    this.showCountdown = false;
  }

  quitGame(): void {
    this.triggerEndGame('quit');
  }

  get winner(): Player {
    return [...this.players].sort((a, b) => b.score - a.score)[0];
  }

  playAgain(): void {
  this.showEndModal = false;

  this.playerCount = 2;

  this.syncPlayers();

  this.phase = 'setup';
}
  returnToGamePage(): void {
    this.router.navigate(['/game-hub-phaser'], {
      state: {
        returnFrom: 'higher-or-lower',
        playReturnAnimation: true
      }
    });
  }

  backToInstructions(): void {
    this.phase = 'instructions';
  }

  // ─── Stage display helpers ──────────────────────────────────────────────────

  get stageLabel(): string {
    const labels: Record<TurnStage, string> = {
      1: 'Red or Black?',
      2: 'Higher or Lower?',
      3: 'Inside or Outside?',
      4: 'Guess the Suit!'
    };
    return labels[this.currentStage];
  }

  get stagePoints(): string {
    const pts: Record<TurnStage, string> = {
      1: '+1 point',
      2: '+2 points',
      3: '+3 points',
      4: '+4 points'
    };
    return pts[this.currentStage];
  }

  getCardDisplayValue(card: Card): string {
    const sym = this.suitSymbols[card.suit];
    return `${card.value}${sym}`;
  }

  trackByPlayer(_: number, p: Player): number { return p.id; }

  get insideOutsideRange(): string {
    if (this.drawnCards.length < 2) return '';
    const v1 = this.drawnCards[0].numericValue;
    const v2 = this.drawnCards[1].numericValue;
    const lo = Math.min(v1, v2);
    const hi = Math.max(v1, v2);
    return `Range: ${lo} – ${hi}`;
  }
}
