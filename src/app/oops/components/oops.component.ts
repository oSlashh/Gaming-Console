import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CLOSE_ENOUGH_PAIRS, SUS_WORDS } from '../word-data';
import { HostListener } from '@angular/core';



type Phase =
  | 'modeSelect'
  | 'instructions'
  | 'playerSetup'
  | 'reveal'
  | 'drawing'
  | 'discussion'
  | 'voting'
  | 'suspense'
  | 'results';

type ModeId = 'sus' | 'close' | 'draw';
type ResultType = 'caught' | 'escaped' | 'tie';

interface GameMode {
  id: ModeId;
  icon: string;
  title: string;
  short: string;
  rules: string[];
}

interface Player {
  id: number;
  name: string;
  word: string;
  hint: string;
  isSpecial: boolean;
}

@Component({
  selector: 'app-oops',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oops.component.html',
  styleUrl: './oops.component.css'
})
export class OopsComponent implements OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  phase: Phase = 'modeSelect';

  modes: GameMode[] = [
    {
      id: 'sus',
      icon: '🤫',
      title: 'Oops! Sus',
      short: 'Everyone gets the same word. One player only gets a hint.',
      rules: [
        'One player is secretly Sus.',
        'Normal players get the same secret word.',
        'The Sus player gets only a hint and must blend in.'
      ]
    },
    {
      id: 'close',
      icon: '😏',
      title: 'Close Enough',
      short: 'One player receives a similar but different word.',
      rules: [
        'Most players get the same word.',
        'One player gets a related but different word.',
        'Players must find who sounds slightly off.'
      ]
    },
    {
      id: 'draw',
      icon: '🎨',
      title: 'Fake It Till You Draw It',
      short: 'One player only gets a hint, then everyone draws.',
      rules: [
        'Normal players get the same drawing word.',
        'The Sus player gets only a hint.',
        'Everyone contributes to one shared drawing before voting.'
      ]
    }
  ];

  selectedMode: GameMode | null = null;

  playerCount = 5;
  playerCountOptions = Array.from({ length: 13 }, (_, i) => i + 3);
  players: Player[] = this.createPlayers(5);
  @ViewChild('crewNumbers')
  private crewNumbers?: ElementRef<HTMLElement>;
  activeOops: any[] = [];
  @HostListener('window:keydown', ['$event'])
  handleEasterEggs(event: KeyboardEvent): void {

    if (this.phase === 'modeSelect' && event.key.toLowerCase() === 'o') {
      if (this.oopsRunning) return;
      this.oopsRunning = true;

      this.chaosMode = !this.chaosMode;  // ← instant, no delay

      this.spawnOops();

      setTimeout(() => {
        this.oopsRunning = false;
      }, 2500);
    }

        /*for (let i = 0; i < 100; i++) {

          setTimeout(() => {

            const id = Date.now() + i;

            this.activeOops.push({
              id,
              x: Math.random() * 90 + 5,
              y: Math.random() * 85 + 5,
              size: 1 + Math.random() * 1.5,
              rotation: -25 + Math.random() * 50
            });

            setTimeout(() => {
              this.activeOops =
                this.activeOops.filter(
                  o => o.id !== id
                );
            }, 1800);

          }, i * 60);

        }*/
      
      if (
        this.phase === 'modeSelect' &&
        event.key.toLowerCase() === 'p' &&
        !this.phewwRunning
      ) {

        this.startPheww();

      }

      if (this.phase === 'modeSelect' && event.key.toLowerCase() === 's') {
        this.heheMode = !this.heheMode;
      }
  }
  busDragging = false;
  showDevilEasterEgg = false;
  devilTriggered = false;
  chaosMode = false;
  phewwMode = false;
  isSpinning = false;
  phewwRunning = false;
  heheMode = false;
  oopsRunning = false;
  showCritters = false;
  activeCritters: string[] = [];
  critterTimeout?: number;

  secretWord = '';
  differentWord = '';
  specialPlayer: Player | null = null;

  revealIndex = 0;
  revealed = false;
  hasPeeked = false;

  drawingTurnIndex = 0;
  totalDrawingRounds = 3;
  showDrawingTurnOverlay = true;
  drawingComplete = false;
  isDrawing = false;
  canvasReady = false;
  eyeOffsetL = 'translate(0px, 0px)';
  eyeOffsetR = 'translate(0px, 0px)';
  ctx?: CanvasRenderingContext2D;
  undoStack: string[] = [];

  votingIndex = 0;
  selectedSuspectId: number | null = null;
  pendingVoteTargetId: number | null = null;
  showVotingTurnOverlay = false;
  votes: Record<number, number> = {};

  suspenseText = '';
  suspenseTimers: number[] = [];

  resultType: ResultType = 'caught';
  resultTitle = '';
  resultMessage = '';
  votedOutPlayer: Player | null = null;

  showQuitModal = false;

  timeLeft = 20 * 60;
  timer?: number;
  timeoutText = '';

  private audioContext?: AudioContext;
  private revealSuspenseOsc?: OscillatorNode;
  private revealSuspenseGain?: GainNode;
  private votingMusicOsc?: OscillatorNode;
  private votingMusicGain?: GainNode;
  private lastCountdownSecond = 0;
  private heartbeatPlaying = false;

  constructor(
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get currentPlayer(): Player {
    return this.players[this.revealIndex];
  }

  get currentDrawingPlayer(): Player {
    return this.players[this.drawingTurnIndex % this.players.length];
  }

  get currentDrawingRound(): number {
    return Math.floor(this.drawingTurnIndex / this.players.length) + 1;
  }

  get totalDrawingTurns(): number {
    return this.players.length * this.totalDrawingRounds;
  }

  get currentVotingPlayer(): Player {
    return this.players[this.votingIndex];
  }

  get selectedSuspect(): Player | null {
    return this.players.find(player => player.id === this.pendingVoteTargetId) || null;
  }

  get timerVisible(): boolean {
    return !!this.timer;
  }

  get formattedTime(): string {
    const min = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const sec = (this.timeLeft % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  get timerState(): string {
    if (this.timeLeft <= 20) return 'danger';
    if (this.timeLeft <= 60) return 'warning';
    return '';
  }

  get revealPercent(): number {
    return ((this.revealIndex + 1) / this.players.length) * 100;
  }

  get busPercent(): number {
    return ((this.playerCount - 3) / 12) * 100;
  }

  get passengerDots(): number[] {
    return Array.from({ length: this.playerCount }, (_, index) => index);
  }

  spawnOops() {
    const batch = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 90 + 5,
      y: Math.random() * 85 + 5,
      size: 1 + Math.random() * 1.8,
      rotation: -30 + Math.random() * 60
    }));

    this.activeOops = [...this.activeOops, ...batch];

    setTimeout(() => {
      const ids = new Set(batch.map(o => o.id));
      this.activeOops = this.activeOops.filter(o => !ids.has(o.id));
    }, 2800);
  }

  startPheww() {

    if (this.phewwRunning) return;

    this.phewwRunning = true;


    // change OOPS <-> PHEWW
    this.phewwMode = !this.phewwMode;


    // reset animation first
    this.isSpinning = true;
    setTimeout(() => {
      this.isSpinning = false;
      this.phewwRunning = false;
    }, 1510);

  }

  onTimerHover(): void {
    if (this.showCritters) return;

    const allAnimals = ['dog', 'cat', 'duck', 'ele','chick'];
    const shuffled = allAnimals.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.5 ? 2 : 3;
    this.activeCritters = shuffled.slice(0, count);

    this.showCritters = true;
    clearTimeout(this.critterTimeout);

    // calculate longest animation in current batch
    const durations: Record<string, number> = {
      dog: 8000,
      cat: 10000,
      duck: 1000 + 8000,   // delay + walk
      ele: 800 + 10000,    // delay + walk
      chick: 1500 + 8000
    };

    const longest = Math.max(
      ...this.activeCritters.map(a => durations[a])
    );

    this.critterTimeout = window.setTimeout(() => {
      this.showCritters = false;
      this.cdr.detectChanges();
    }, longest + 500); // +500ms buffer after last animal exits
  }
  onTimerLeave(): void {
  // intentionally empty — just lets next hover retrigger
  }

  selectMode(mode: GameMode): void {
    this.selectedMode = mode;
    this.phase = 'instructions';
  }

  backToModes(): void {
    this.stopTimer();
    this.clearSuspenseTimers();
    this.stopRevealSuspense();
    this.stopVotingMusic();
    this.selectedMode = null;
    this.phase = 'modeSelect';
  }

  setPlayerCount(count: number): void {

  this.playerCount = Math.min(15, Math.max(3, Math.round(count)));
  this.players = this.createPlayers(this.playerCount, this.players);


  setTimeout(() => {
    const container = this.crewNumbers?.nativeElement;
    if (!container) return;

    const selected = container.querySelector(
      '.selected'
    ) as HTMLElement | null;

    selected?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  });
}

  movePlayerCount(amount: number): void {
    this.setPlayerCount(this.playerCount + amount);
  }
  triggerDevilEasterEgg(playerIndex: number): void {
    if (
      this.playerCount === 6 &&
      playerIndex === 5 &&
      !this.devilTriggered
    ) {
      this.devilTriggered = true;
      this.showDevilEasterEgg = true;

      this.cdr.detectChanges();

      setTimeout(() => {
        this.showDevilEasterEgg = false;
        this.devilTriggered = false;

        this.cdr.detectChanges();
      }, 1000);
    }
  }

  startBusDrag(event: PointerEvent): void {
    event.stopPropagation();
    this.busDragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updateBusFromPointer(event);
  }

  dragBus(event: PointerEvent): void {
    if (!this.busDragging) return;
    this.updateBusFromPointer(event);
  }

  stopBusDrag(): void {
    this.busDragging = false;
  }

  updateBusFromTrack(event: PointerEvent): void {
    this.updateBusFromPointer(event);
  }

  startGame(): void {
    if (!this.selectedMode) return;

    this.players = this.players.map((player, index) => ({
      ...player,
      id: index + 1,
      name: player.name.trim() || `Player ${index + 1}`
    }));

    this.assignRoles();
    this.revealIndex = 0;
    this.revealed = false;
    this.hasPeeked = false;
    this.votes = {};
    this.votingIndex = 0;
    this.selectedSuspectId = null;
    this.pendingVoteTargetId = null;
    this.showVotingTurnOverlay = false;
    this.drawingTurnIndex = 0;
    this.showDrawingTurnOverlay = true;
    this.drawingComplete = false;
    this.canvasReady = false;
    this.undoStack = [];
    this.phase = 'reveal';
    this.startTimer();
  }

  showSecret(): void {
    this.revealed = true;
    this.hasPeeked = true;
    this.playFlipSound();
    this.startRevealSuspense();
  }

  hideSecret(): void {
    this.revealed = false;
    this.stopRevealSuspense();
  }

  nextReveal(): void {
    if (this.revealIndex < this.players.length - 1) {
      this.revealIndex++;
      this.revealed = false;
      this.hasPeeked = false;
      return;
    }

    if (this.selectedMode?.id === 'draw') {
      this.phase = 'drawing';
      this.showDrawingTurnOverlay = true;
      setTimeout(() => this.prepareCanvas(), 0);
    } else {
      this.phase = 'discussion';
    }
  }

  readyToDraw(): void {
    this.showDrawingTurnOverlay = false;
    this.undoStack = [];
    setTimeout(() => this.prepareCanvas(), 0);
  }

  nextDrawingTurn(): void {
    this.undoStack = [];

    if (this.drawingTurnIndex < this.totalDrawingTurns - 1) {
      this.drawingTurnIndex++;
      this.showDrawingTurnOverlay = true;
      return;
    }

    this.drawingComplete = true;
    this.showDrawingTurnOverlay = true;

    setTimeout(() => {
      this.drawingComplete = false;
      this.phase = 'voting';
      this.showDrawingTurnOverlay = false;
      this.startVoting();
      this.cdr.detectChanges();
    }, 1400);
  }

  prepareCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;

    if (!this.canvasReady) {
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      this.ctx = canvas.getContext('2d') || undefined;

      if (!this.ctx) return;

      this.ctx.scale(scale, scale);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.usePen();
      this.canvasReady = true;
      return;
    }

    if (!this.ctx) {
      this.ctx = canvas.getContext('2d') || undefined;
      this.usePen();
    }
  }

  startDraw(event: PointerEvent): void {
    if (!this.ctx || this.showDrawingTurnOverlay) return;
    this.saveCanvasForCurrentTurn();
    this.isDrawing = true;
    const point = this.getCanvasPoint(event);
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  draw(event: PointerEvent): void {
    if (!this.isDrawing || !this.ctx || this.showDrawingTurnOverlay) return;

    const point = this.getCanvasPoint(event);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  stopDraw(): void {
    this.isDrawing = false;
    this.eyeOffsetL = 'translate(0px, 0px)';
    this.eyeOffsetR = 'translate(0px, 0px)';
  }

  usePen(): void {
    if (!this.ctx) return;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = '#7c3aed';
    this.ctx.lineWidth = 8;
  }

  useEraser(): void {
    if (!this.ctx) return;
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.lineWidth = 26;
  }

  undo(): void {
    const canvas = this.canvasRef?.nativeElement;
    const last = this.undoStack.pop();

    if (!canvas || !this.ctx || !last) return;

    const image = new Image();
    image.onload = () => {
      this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx?.drawImage(
        image,
        0,
        0,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1)
      );
      this.usePen();
    };
    image.src = last;
  }

  startVoting(): void {
    this.votingIndex = 0;
    this.selectedSuspectId = null;
    this.pendingVoteTargetId = null;
    this.votes = {};
    this.showVotingTurnOverlay = true;
    this.phase = 'voting';
    this.startVotingMusic();
  }

  readyToVote(): void {
    this.showVotingTurnOverlay = false;
    setTimeout(() => this.prepareCanvas(), 0);
  }

  chooseSuspect(playerId: number): void {
    if (this.showVotingTurnOverlay) return;
    this.selectedSuspectId = playerId;
    this.pendingVoteTargetId = playerId;
  }

  cancelVote(): void {
    this.pendingVoteTargetId = null;
    this.selectedSuspectId = null;
  }

  confirmVote(): void {
    if (!this.pendingVoteTargetId) return;

    this.votes[this.currentVotingPlayer.id] = this.pendingVoteTargetId;
    this.pendingVoteTargetId = null;
    this.selectedSuspectId = null;

    if (this.votingIndex < this.players.length - 1) {
      this.votingIndex++;
      this.showVotingTurnOverlay = true;
      return;
    }

    this.stopVotingMusic();
    this.startSuspenseReveal();
  }

  playAgain(): void {
    this.assignRoles();
    this.revealIndex = 0;
    this.revealed = false;
    this.hasPeeked = false;
    this.votes = {};
    this.votingIndex = 0;
    this.selectedSuspectId = null;
    this.pendingVoteTargetId = null;
    this.showVotingTurnOverlay = false;
    this.drawingTurnIndex = 0;
    this.showDrawingTurnOverlay = true;
    this.drawingComplete = false;
    this.canvasReady = false;
    this.undoStack = [];
    this.phase = 'reveal';
  }

  quit(): void {
    this.stopTimer();
    this.clearSuspenseTimers();
    this.stopRevealSuspense();
    this.stopVotingMusic();
    this.router.navigateByUrl('/game-page');
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.clearSuspenseTimers();
    this.stopRevealSuspense();
    this.stopVotingMusic();
    this.audioContext?.close();
  }

  private createPlayers(count: number, existing: Player[] = []): Player[] {
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: existing[index]?.name || `Player ${index + 1}`,
      word: '',
      hint: '',
      isSpecial: false
    }));
  }

  private assignRoles(): void {
    const specialIndex = Math.floor(Math.random() * this.players.length);

    if (this.selectedMode?.id === 'close') {
      const pair = this.getFreshClosePair();
      this.secretWord = pair.word;
      this.differentWord = pair.differentWord;

      this.players = this.players.map((player, index) => ({
        ...player,
        word: index === specialIndex ? pair.differentWord : pair.word,
        hint: '',
        isSpecial: index === specialIndex
      }));
    } else {
      const item = this.getFreshSusWord();
      this.secretWord = item.word;
      this.differentWord = '';

      this.players = this.players.map((player, index) => ({
        ...player,
        word: index === specialIndex ? '' : item.word,
        hint: index === specialIndex ? item.hint : '',
        isSpecial: index === specialIndex
      }));
    }

    this.specialPlayer = this.players.find(player => player.isSpecial) || null;
  }

  private getFreshSusWord() {
    return SUS_WORDS[this.getFreshIndex('oops-used-sus-words', SUS_WORDS.length)];
  }

  private getFreshClosePair() {
    return CLOSE_ENOUGH_PAIRS[this.getFreshIndex('oops-used-close-pairs', CLOSE_ENOUGH_PAIRS.length)];
  }

  private getFreshIndex(key: string, total: number): number {
    let used = JSON.parse(sessionStorage.getItem(key) || '[]') as number[];

    if (used.length >= total) used = [];

    const available = Array.from({ length: total }, (_, index) => index).filter(
      index => !used.includes(index)
    );

    const picked = available[Math.floor(Math.random() * available.length)];
    sessionStorage.setItem(key, JSON.stringify([...used, picked]));
    return picked;
  }

private startTimer(): void {
  this.stopTimer();
  this.timeLeft = 20 * 60;
  this.timeoutText = '';
  this.lastCountdownSecond = 0;

  this.timer = window.setInterval(() => {
    this.timeLeft--;
    console.log('tick', this.timeLeft, new Date().toLocaleTimeString());

    if (this.timeLeft <= 20 && this.timeLeft > 4) {
      this.playHeartbeat();
    }

    if (this.timeLeft <= 4 && this.timeLeft > 0 && this.lastCountdownSecond !== this.timeLeft) {
      this.lastCountdownSecond = this.timeLeft;
      this.playDrumHit();
    }

    if (this.timeLeft <= 4 && this.timeLeft > 0) {
      this.timeoutText = this.timeLeft === 1 ? "TIME'S UP!" : String(this.timeLeft - 1);
    }

    if (this.timeLeft <= 0) {
      this.playTimeUpImpact();
      this.timeoutText = "TIME'S UP!";
      this.stopTimer();

      setTimeout(() => {
        this.router.navigateByUrl('/game-page');
      }, 900);
    }

    requestAnimationFrame(() => {
      this.cdr.detectChanges();
      });
  }, 1000);
}
  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private updateBusFromPointer(event: PointerEvent): void {
    const track = document.querySelector('.bus-track') as HTMLElement | null;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.setPlayerCount(3 + percent * 12);
  }
   private getCanvasPoint(event: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef?.nativeElement;
    const rect = canvas?.getBoundingClientRect();

    return {
      x: event.clientX - (rect?.left || 0),
      y: event.clientY - (rect?.top || 0)
    };
  }

  private saveCanvasForCurrentTurn(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.undoStack = [...this.undoStack.slice(-8), canvas.toDataURL()];
  }

  private startSuspenseReveal(): void {
    this.phase = 'suspense';
    this.suspenseText = 'Analyzing Votes...';
    this.clearSuspenseTimers();

    this.suspenseTimers.push(
      window.setTimeout(() => {
        this.suspenseText = 'Finding Sus...';
        this.cdr.detectChanges();
      }, 1000)
    );

    this.suspenseTimers.push(
      window.setTimeout(() => {
        this.suspenseText = 'Final Verdict...';
        this.cdr.detectChanges();
      }, 2000)
    );

    this.suspenseTimers.push(
      window.setTimeout(() => {
        this.calculateResult();
        this.phase = 'results';
        this.cdr.detectChanges();
      }, 5000)
    );
  }

  private calculateResult(): void {
    const totals = new Map<number, number>();

    for (const player of this.players) {
      totals.set(player.id, 0);
    }

    for (const votedId of Object.values(this.votes)) {
      totals.set(votedId, (totals.get(votedId) || 0) + 1);
    }

    const highestVote = Math.max(...Array.from(totals.values()));
    const winners = Array.from(totals.entries())
      .filter(([, count]) => count === highestVote)
      .map(([playerId]) => playerId);

    if (winners.length > 1) {
      this.resultType = 'tie';
      this.votedOutPlayer = null;
      this.resultTitle = '🤔 NO CONSENSUS!';
      this.resultMessage = "The group couldn't agree. The Sus escaped!";
      this.playEscapedSound();
      return;
    }

    const votedOutId = winners[0];
    this.votedOutPlayer = this.players.find(player => player.id === votedOutId) || null;

    if (this.specialPlayer && votedOutId === this.specialPlayer.id) {
      this.resultType = 'caught';
      this.resultTitle = '🎉 SUS CAUGHT!';
      this.resultMessage = 'The group figured it out!';
      this.playCaughtSound();
    } else {
      this.resultType = 'escaped';
      this.resultTitle = '😈 SUS OUTSMARTED EVERYONE!';
      this.resultMessage = 'The wrong player was voted out.';
      this.playEscapedSound();
    }
  }

  private clearSuspenseTimers(): void {
    for (const timer of this.suspenseTimers) {
      clearTimeout(timer);
    }

    this.suspenseTimers = [];
  }

  private getAudioContext(): AudioContext | undefined {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return undefined;

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  private playTone(
    frequency: number,
    duration = 0.12,
    type: OscillatorType = 'sine',
    volume = 0.08
  ): void {
    const context = this.getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);
  }

  private playFlipSound(): void {
    this.playTone(420, 0.06, 'triangle', 0.07);
    setTimeout(() => this.playTone(680, 0.08, 'triangle', 0.06), 45);
  }

  private startRevealSuspense(): void {
    const context = this.getAudioContext();
    if (!context || this.revealSuspenseOsc) return;

    this.revealSuspenseOsc = context.createOscillator();
    this.revealSuspenseGain = context.createGain();

    this.revealSuspenseOsc.type = 'sine';
    this.revealSuspenseOsc.frequency.value = 120;
    this.revealSuspenseGain.gain.value = 0.025;

    this.revealSuspenseOsc.connect(this.revealSuspenseGain);
    this.revealSuspenseGain.connect(context.destination);
    this.revealSuspenseOsc.start();
  }

  private stopRevealSuspense(): void {
    this.revealSuspenseOsc?.stop();
    this.revealSuspenseOsc?.disconnect();
    this.revealSuspenseGain?.disconnect();

    this.revealSuspenseOsc = undefined;
    this.revealSuspenseGain = undefined;
  }

  private startVotingMusic(): void {
    const context = this.getAudioContext();
    if (!context || this.votingMusicOsc) return;

    this.votingMusicOsc = context.createOscillator();
    this.votingMusicGain = context.createGain();

    this.votingMusicOsc.type = 'triangle';
    this.votingMusicOsc.frequency.value = 95;
    this.votingMusicGain.gain.value = 0.018;

    this.votingMusicOsc.connect(this.votingMusicGain);
    this.votingMusicGain.connect(context.destination);
    this.votingMusicOsc.start();
  }

  private stopVotingMusic(): void {
    this.votingMusicOsc?.stop();
    this.votingMusicOsc?.disconnect();
    this.votingMusicGain?.disconnect();

    this.votingMusicOsc = undefined;
    this.votingMusicGain = undefined;
  }

  private playCaughtSound(): void {
    this.playTone(523, 0.12, 'triangle', 0.08);
    setTimeout(() => this.playTone(659, 0.12, 'triangle', 0.08), 120);
    setTimeout(() => this.playTone(784, 0.18, 'triangle', 0.09), 240);
  }

  private playEscapedSound(): void {
    this.playTone(260, 0.15, 'sawtooth', 0.055);
    setTimeout(() => this.playTone(185, 0.22, 'sawtooth', 0.05), 160);
  }

  private playHeartbeat(): void {
    if (this.heartbeatPlaying) return;

    this.heartbeatPlaying = true;
    this.playTone(80, 0.08, 'sine', 0.08);

    setTimeout(() => {
      this.playTone(70, 0.08, 'sine', 0.065);
      this.heartbeatPlaying = false;
    }, 180);
  }

  private playDrumHit(): void {
    this.playTone(90, 0.12, 'sawtooth', 0.09);
  }

  private playTimeUpImpact(): void {
    this.playTone(55, 0.35, 'sawtooth', 0.12);
  }
}