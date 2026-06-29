import {
  Component,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface ImageOption {
  id: string;
  label: string;
  url: string;
}

interface PuzzleTile {
  id: number;
  index: number;
  row: number;
  col: number;
}

interface CompletionRecord {
  id: string;
  difficulty: string;
  gridSize: number;
  completedAt: number;
  time: number;
  moves: number;
  accuracy: number;
  stars: number;
}

@Component({
  selector: 'app-image-puzzle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-puzzle.component.html',
  styleUrls: ['./image-puzzle.component.css']
})
export class ImagePuzzleComponent
  implements OnInit, OnDestroy {

  // ==========================
  // IMAGE COLLECTION
  // ==========================

  readonly imageOptions: ImageOption[] = [
    {
      id: 'coast',
      label: 'Coastal Escape',
      url: 'https://picsum.photos/id/1018/900/600'
    },
    {
      id: 'forest',
      label: 'Forest Path',
      url: 'https://picsum.photos/id/1040/900/600'
    },
    {
      id: 'city',
      label: 'Neon City',
      url: 'https://picsum.photos/id/1011/900/600'
    },
    {
      id: 'mountain',
      label: 'Mountain Ridge',
      url: 'https://picsum.photos/id/1002/900/600'
    },
    {
      id: 'sunrise',
      label: 'Sunrise Glow',
      url: 'https://picsum.photos/id/1015/900/600'
    },
    {
      id: 'winter',
      label: 'Winter Pines',
      url: 'https://picsum.photos/id/1031/900/600'
    }
  ];

  // ==========================
  // DIFFICULTIES
  // ==========================

  readonly gridOptions = [
    {
      label: '3×3',
      size: 3
    },
    {
      label: '4×4',
      size: 4
    },
    {
      label: '5×5',
      size: 5
    },
    {
      label: '6×6',
      size: 6
    }
  ];

  // ==========================
  // GAME STATE
  // ==========================

  readonly selectedImageUrl =
    signal('');

  readonly difficulty =
    signal('3×3');

  readonly gridSize =
    signal(3);

  readonly tiles =
    signal<PuzzleTile[]>([]);

  readonly moves =
    signal(0);

  readonly elapsedSeconds =
    signal(0);

  readonly selectedTileId =
    signal<number | null>(null);

  readonly hintTileId =
    signal<number | null>(null);

  readonly revealTileId =
    signal<number | null>(null);

  readonly completion =
    signal(0);

  readonly formattedTime =
    signal('00:00');

  readonly savedGameAvailable =
    signal(false);

  readonly showOriginal =
    signal(true);

  readonly isPaused =
    signal(false);

  readonly soundEnabled =
    signal(true);

  readonly statusMessage =
    signal(
      'Select an image to begin.'
    );

  readonly exitCountdown =
    signal<number | null>(null);

  // ==========================
  // TIMER
  // ==========================

  readonly maxTimeSeconds =
    600;

  readonly timerStarted =
    signal(false);

  private timerId:
    number | null = null;

  // ==========================
  // WIN STATE
  // ==========================

  readonly winVisible =
    signal(false);

  readonly winRecord =
    signal<CompletionRecord | null>(
      null
    );

  // ==========================
  // XP SYSTEM
  // ==========================

  readonly xp =
    signal(0);

  readonly level =
    signal(1);

  readonly streak =
    signal(0);

  readonly dailyChallengeCompleted =
    signal(false);

  // ==========================
  // HISTORY
  // ==========================

  readonly bestScores =
    signal<CompletionRecord[]>([]);

  readonly history =
    signal<CompletionRecord[]>([]);

  readonly achievements =
    signal<string[]>([]);

  // ==========================
  // STORAGE KEYS
  // ==========================

  private readonly storageKey =
    'image-puzzle-save';

  private readonly historyKey =
    'image-puzzle-history';

  private readonly settingsKey =
    'image-puzzle-settings';

  private readonly maxUploadBytes =
    15 * 1024 * 1024;

  constructor(
    private readonly router: Router
  ) {}

  // ==========================
  // LIFECYCLE
  // ==========================

  ngOnInit(): void {

    this.loadSettings();

    this.loadSavedState();

    this.refreshSidebar();

    this.startTimer();
  }

  ngOnDestroy(): void {

    this.clearTimer();
  }

  // ==========================
  // XP METHODS
  // ==========================

  xpProgress(): number {

    return (
      (this.xp() % 1000) / 10
    );
  }

  addXP(amount: number): void {

    const total =
      this.xp() + amount;

    this.xp.set(total);

    this.level.set(
      Math.floor(total / 1000) + 1
    );

    this.saveSettings();
  }

  playerRank(): string {

    const xp = this.xp();

    if (xp >= 15000) {
      return 'Legend';
    }

    if (xp >= 10000) {
      return 'Grand Master';
    }

    if (xp >= 7000) {
      return 'Master';
    }

    if (xp >= 3000) {
      return 'Explorer';
    }

    return 'Beginner';
  }

  earnedStars(): number {

    return (
      this.winRecord()?.stars ?? 0
    );
  }

  increaseStreak(): void {

    this.streak.update(
      value => value + 1
    );

    if (this.streak() === 5) {

      this.unlockAchievement(
        'Puzzle Streak x5'
      );
    }
  }

  unlockAchievement(
    achievement: string
  ): void {

    const list =
      [...this.achievements()];

    if (
      !list.includes(achievement)
    ) {

      list.push(achievement);

      this.achievements.set(list);
    }
  }

  // ==========================
  // NAVIGATION
  // ==========================

  goBack(): void {

    const leave =
      confirm(
        'Exit puzzle game?'
      );

    if (!leave) {
      return;
    }

    this.router.navigate(['/game-hub-phaser'], {
      state: {
        returnFrom: 'image-puzzle',
        playReturnAnimation: true
      }
    });
  }

  chooseImage(option: ImageOption): void {
    this.selectedImageUrl.set(option.url);
    this.statusMessage.set(
      `Selected ${option.label}. Generating puzzle...`
    );
    this.resetGame(false);
    this.preparePuzzle();
  }

  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      this.statusMessage.set(
        'Invalid file type. Use JPG, PNG, or WEBP.'
      );
      input.value = '';
      return;
    }
    if (file.size > this.maxUploadBytes) {
      this.statusMessage.set(
        'Image is too large. Limit is 15 MB.'
      );
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (!url) {
        this.statusMessage.set(
          'Could not read the file. Try again.'
        );
        return;
      }
      this.selectedImageUrl.set(url);
      this.statusMessage.set(
        'Custom image loaded. Generating puzzle...'
      );
      this.resetGame(false);
      this.preparePuzzle();
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  changeDifficulty(option: { label: string; size: number }): void {
    if (this.difficulty() === option.label) {
      return;
    }
    this.difficulty.set(option.label);
    this.gridSize.set(option.size);
    this.statusMessage.set(
      `Difficulty changed to ${option.label}.`
    );
    if (this.selectedImageUrl()) {
      this.resetGame(false);
      this.preparePuzzle();
    }
  }

  restartGame(): void {
    if (!this.selectedImageUrl()) {
      this.statusMessage.set(
        'Choose an image first to restart.'
      );
      return;
    }
    this.statusMessage.set('Restarting puzzle...');
    this.resetGame(false, false);
    this.preparePuzzle();
  }

  shuffleGame(): void {
    if (!this.tiles().length) {
      this.statusMessage.set(
        'Start a puzzle before shuffling.'
      );
      return;
    }
    this.statusMessage.set('Shuffling puzzle pieces...');
    this.moves.set(0);
    this.tiles.set(this.shuffleTiles(this.generateTiles()));
    this.selectedTileId.set(null);
    this.hintTileId.set(null);
    this.revealTileId.set(null);
    this.persistState();
  }

  togglePause(): void {
    if (!this.tiles().length) {
      return;
    }
    const paused = !this.isPaused();
    this.isPaused.set(paused);
    this.statusMessage.set(
      paused ? 'Game paused.' : 'Resumed puzzle challenge.'
    );
  }

  toggleOriginal(): void {
    this.showOriginal.set(!this.showOriginal());
    this.saveSettings();
  }

  toggleSound(): void {
    this.soundEnabled.set(!this.soundEnabled());
    this.saveSettings();
  }

  onTileClick(tileId: number): void {
    if (this.isPaused() || !this.tiles().length) {
      return;
    }
    const current = this.selectedTileId();
    if (current === null) {
      this.selectedTileId.set(tileId);
      return;
    }
    if (current === tileId) {
      this.selectedTileId.set(null);
      return;
    }
    this.swapTiles(current, tileId);
  }

  onDragStart(event: DragEvent, tileId: number): void {
    if (this.isPaused()) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', String(tileId));
  }

  onTileDrop(event: DragEvent, targetId: number): void {
    event.preventDefault();
    if (this.isPaused()) {
      return;
    }
    const source = event.dataTransfer?.getData('text/plain');
    if (!source) {
      return;
    }
    const sourceId = Number(source);
    if (Number.isNaN(sourceId) || sourceId === targetId) {
      return;
    }
    this.swapTiles(sourceId, targetId);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  playAgain(): void {
    this.winVisible.set(false);
    this.resetGame(false);
    this.preparePuzzle();
  }

  newPuzzle(): void {
    this.winVisible.set(false);
    this.selectedImageUrl.set('');
    this.tiles.set([]);
    this.moves.set(0);
    this.selectedTileId.set(null);
    this.hintTileId.set(null);
    this.revealTileId.set(null);
    this.statusMessage.set(
      'Select a new image or upload one to begin.'
    );
    this.clearSavedState();
  }

  private resetGame(
    clearImage = true,
    resetTimer = false
  ): void {
    if (clearImage) {
      this.selectedImageUrl.set('');
    }
    this.tiles.set([]);
    this.moves.set(0);
    if (resetTimer) {
      this.elapsedSeconds.set(0);
    }
    this.selectedTileId.set(null);
    this.hintTileId.set(null);
    this.revealTileId.set(null);
    this.isPaused.set(false);
    this.winVisible.set(false);
  }

  private preparePuzzle(): void {
    if (!this.selectedImageUrl()) {
      return;
    }
    const board = this.generateTiles();
    this.tiles.set(this.shuffleTiles(board));
    this.moves.set(0);
    this.selectedTileId.set(null);
    this.hintTileId.set(null);
    this.revealTileId.set(null);
    this.winVisible.set(false);
    this.syncSummary();
    this.persistState();
  }

  private generateTiles(): PuzzleTile[] {
    const size = this.gridSize();
    const tiles: PuzzleTile[] = [];
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const index = row * size + col;
        tiles.push({ id: index, index, row, col });
      }
    }
    return tiles;
  }

  private shuffleTiles(tiles: PuzzleTile[]): PuzzleTile[] {
    const shuffled = [...tiles];
    let attempt = 0;
    do {
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempt += 1;
    } while (this.isSolved(shuffled) && attempt < 10);
    return shuffled;
  }

  private swapTiles(
    sourceId: number,
    targetId: number
  ): void {
    const current = [...this.tiles()];
    const sourceIndex = current.findIndex(
      (tile) => tile.id === sourceId
    );
    const targetIndex = current.findIndex(
      (tile) => tile.id === targetId
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    [current[sourceIndex], current[targetIndex]] = [
      current[targetIndex],
      current[sourceIndex]
    ];
    this.tiles.set(current);
    this.moves.update((m) => m + 1);
    this.selectedTileId.set(null);
    this.hintTileId.set(null);
    this.revealTileId.set(null);
    this.syncSummary();
    this.persistState();
    if (this.isSolved(current)) {
      this.completePuzzle();
    }
  }

  private isSolved(tiles: PuzzleTile[]): boolean {
    return tiles.every((tile, index) => tile.index === index);
  }

  private completePuzzle(): void {
    this.isPaused.set(true);
    const record: CompletionRecord = {
      id: `win-${Date.now()}`,
      difficulty: this.difficulty(),
      gridSize: this.gridSize(),
      completedAt: Date.now(),
      time: this.elapsedSeconds(),
      moves: this.moves(),
      accuracy: this.completion(),
      stars: this.computeStars(),
    };
    this.winRecord.set(record);
    this.winVisible.set(true);
    this.saveHistory(record);
    this.clearSavedState();
    this.refreshSidebar();
    this.statusMessage.set(
      'Puzzle solved! View your achievement and play again.'
    );
  }

  private computeStars(): number {
    const time = this.elapsedSeconds();
    const moves = this.moves();
    const size = this.gridSize();
    let stars = 3;
    if (time <= size * 35 && moves <= size * size * 2) {
      stars = 5;
    } else if (time <= size * 50 && moves <= size * size * 3) {
      stars = 4;
    }
    return stars;
  }

  private hintCountRemaining(): number {
    return Math.max(1, 4 - (this.gridSize() - 3));
  }

  hintLimit(): number {
    return Math.max(1, 4 - (this.gridSize() - 3));
  }

  private startTimer(): void {
    if (typeof window === 'undefined' || this.timerStarted()) {
      return;
    }
    this.clearTimer();
    this.timerStarted.set(true);
    this.timerId = window.setInterval(() => {
      if (
        !this.winVisible() &&
        !this.isPaused() &&
        this.tiles().length
      ) {
        this.elapsedSeconds.update((seconds) => seconds + 1);

        const remaining =
          this.maxTimeSeconds -
          this.elapsedSeconds();

        if (
          remaining > 0 &&
          remaining <= 5
        ) {
          this.exitCountdown.set(
            remaining
          );
        } else {
          this.exitCountdown.set(
            null
          );
        }

        this.syncSummary();

        if (this.elapsedSeconds() >= this.maxTimeSeconds) {
          this.handleTimeout();
        }
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
      this.timerStarted.set(false);
    }
  }

  private syncSummary(): void {
    const correct = this.tiles().filter(
      (tile, index) => tile.index === index
    ).length;
    const total = this.tiles().length || 1;
    const percentage = Math.round((correct / total) * 100);
    this.completion.set(percentage);
    const elapsed = this.elapsedSeconds();
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    this.formattedTime.set(
      `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
    );
  }

  formatRemainingTime(): string {
    return this.formatTime(
      Math.max(0, this.maxTimeSeconds - this.elapsedSeconds())
    );
  }

  countdownValue(): number {
    return Math.max(0, this.maxTimeSeconds - this.elapsedSeconds());
  }

  showCountdownOverlay(): boolean {

  const remaining =
    this.countdownValue();

  return (
    remaining > 0 &&
    remaining <= 5 &&
    !this.winVisible()
  );
}

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder
      .toString()
      .padStart(2, '0')}`;
  }

  private handleTimeout(): void {
    this.clearTimer();
    this.resetGame(true, true);
    this.clearSavedState();
    this.clearHistory();
    this.statusMessage.set(
      'Time has expired. Redirecting to game hub.'
    );
    this.router.navigate(['/game-hub-phaser'], {
      state: {
        returnFrom: 'image-puzzle',
        playReturnAnimation: true
      }
    });
  }

  private persistState(): void {
    if (
      typeof window === 'undefined' ||
      !this.selectedImageUrl() ||
      this.winVisible()
    ) {
      return;
    }
    const state = {
      imageUrl: this.selectedImageUrl(),
      difficulty: this.difficulty(),
      gridSize: this.gridSize(),
      tiles: this.tiles().map((tile) => tile.id),
      moves: this.moves(),
      elapsedSeconds: this.elapsedSeconds(),
      selectedTileId: this.selectedTileId(),
      showOriginal: this.showOriginal(),
      soundEnabled: this.soundEnabled(),
      statusMessage: this.statusMessage(),
    };
    window.localStorage.setItem(
      this.storageKey,
      JSON.stringify(state)
    );
    this.savedGameAvailable.set(true);
  }

  private loadSavedState(): unknown {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem(
      this.storageKey
    );
    if (!raw) {
      return null;
    }
    try {
      const saved = JSON.parse(raw) as {
        imageUrl: string;
        difficulty: string;
        gridSize: number;
        tiles: number[];
        moves: number;
        elapsedSeconds: number;
        selectedTileId: number | null;
        showOriginal: boolean;
        soundEnabled: boolean;
        statusMessage: string;
      };
      this.selectedImageUrl.set(saved.imageUrl);
      this.difficulty.set(saved.difficulty);
      this.gridSize.set(saved.gridSize);
      this.moves.set(saved.moves);
      this.elapsedSeconds.set(saved.elapsedSeconds);
      this.selectedTileId.set(saved.selectedTileId);
      this.showOriginal.set(saved.showOriginal);
      this.soundEnabled.set(saved.soundEnabled);
      this.statusMessage.set(saved.statusMessage);

      const generated = this.generateTiles();
      const restored = saved.tiles
        .map((id) =>
          generated.find((tile) => tile.id === id)
        )
        .filter(
          (tile): tile is PuzzleTile => !!tile
        );
      this.tiles.set(
        restored.length === generated.length
          ? restored
          : this.shuffleTiles(generated)
      );
      this.savedGameAvailable.set(true);
      return saved;
    } catch {
      return null;
    }
  }

  private saveHistory(record: CompletionRecord): void {
    if (typeof window === 'undefined') {
      return;
    }
    const history = this.history() ?? [];
    const next = [record, ...history].slice(0, 20);
    window.localStorage.setItem(
      this.historyKey,
      JSON.stringify(next)
    );
  }

  private loadHistory(): CompletionRecord[] {
    if (typeof window === 'undefined') {
      return [];
    }
    const raw = window.localStorage.getItem(
      this.historyKey
    );
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as CompletionRecord[];
    } catch {
      return [];
    }
  }

  private clearSavedState(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(this.storageKey);
    this.savedGameAvailable.set(false);
  }

  private clearHistory(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(this.historyKey);
    this.bestScores.set([]);
    this.history.set([]);
    this.achievements.set([]);
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      this.settingsKey,
      JSON.stringify({
        showOriginal: this.showOriginal(),
        soundEnabled: this.soundEnabled(),
      })
    );
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(
      this.settingsKey
    );
    if (!raw) {
      return;
    }
    try {
      const settings = JSON.parse(raw) as {
        showOriginal: boolean;
        soundEnabled: boolean;
      };
      this.showOriginal.set(settings.showOriginal ?? true);
      this.soundEnabled.set(settings.soundEnabled ?? true);
    } catch {
      // ignore
    }
  }

  private refreshSidebar(): void {
    this.bestScores.set(this.computeBestScores());
    this.history.set(this.loadHistory());
    this.achievements.set(this.computeAchievements());
  }

  private computeBestScores(): CompletionRecord[] {
    const history = this.loadHistory();
    return [...history]
      .sort((a, b) => a.time - b.time || a.moves - b.moves)
      .slice(0, 5);
  }

  private computeAchievements(): string[] {
    const history = this.loadHistory();
    const achievements: string[] = [];
    if (history.length >= 1) {
      achievements.push('First win unlocked');
    }
    if (history.length >= 3) {
      achievements.push('Puzzle streak +3');
    }
    if (history.some((record) => record.stars >= 5)) {
      achievements.push('Five-star finisher');
    }
    if (history.some(
      (record) => record.time <= record.gridSize * 40
    )) {
      achievements.push('Speed runner');
    }
    return achievements;
  }
  getTimerProgress(): number {

  const circumference = 327;

  const progress =
    this.countdownValue() /
    this.maxTimeSeconds;

  return circumference * (1 - progress);
}
getTimerColor(): string {

  const percent =
    (this.countdownValue() /
      this.maxTimeSeconds) * 100;

  if (percent > 60) {
    return '#22c55e';
  }

  if (percent > 30) {
    return '#eab308';
  }

  if (percent > 10) {
    return '#f97316';
  }

  return '#ef4444';
}
}

