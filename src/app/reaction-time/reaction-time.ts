import {
  Component,
  signal,
  computed,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';
export type GamePhase = 'home' | 'waiting' | 'ready' | 'result' | 'tooearly' | 'wrongcolor';

export interface Section {
  id: number;
  isGreen: boolean;
}

export interface BestScores {
  easy: number | null;
  medium: number | null;
  hard: number | null;
  impossible: number | null;
}

export interface GameResult {
  reactionTime: number;
  difficulty: Difficulty;
  activeSection: number | null;
}

export type ImpossibleColor = 'red' | 'blue' | 'purple' | 'orange' | 'yellow' | 'pink' | 'green';

export interface ImpossibleSection {
  id: number;
  color: ImpossibleColor;
  isTarget: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_COUNT: Record<Exclude<Difficulty, 'impossible'>, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
};

const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

/** Distraction colors — green is intentionally excluded */
const IMP_DISTRACTION_COLORS: ImpossibleColor[] = ['blue', 'purple', 'orange', 'yellow', 'pink'];

/** Wait on red between distraction flashes (ms) */
const IMP_RED_MIN  = 400;
const IMP_RED_MAX  = 1600;

/** How long distraction flashes stay visible (ms) */
const IMP_DIST_MIN = 500;
const IMP_DIST_MAX = 1000;

/** Probability any given event fires the green signal (geometric distribution) */
const IMP_GREEN_CHANCE = 0.22;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-reaction-time-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reaction-time.html',
  styleUrls: ['./reaction-time.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactionTimeGameComponent implements OnDestroy {
  private readonly _router = inject(Router);
  // ── State signals ──────────────────────────────────────────────────────────
  readonly phase = signal<GamePhase>('home');
  readonly difficulty = signal<Difficulty>('easy');
  readonly sections = signal<Section[]>([]);
  readonly activeSectionId = signal<number | null>(null);
  readonly reactionTime = signal<number | null>(null);
  readonly bestScores = signal<BestScores>({ easy: null, medium: null, hard: null, impossible: null });
  readonly tooEarlySection = signal<number | null>(null);
  readonly impossibleSections = signal<ImpossibleSection[]>([]);
  /** The section id secretly chosen as the target for this round */
  private _targetSectionId: number = 0;

  // ── Derived ────────────────────────────────────────────────────────────────
  readonly currentBest = computed(() => this.bestScores()[this.difficulty()]);

  readonly resultMessage = computed(() => {
    const t = this.reactionTime();
    if (t === null) return '';
    if (this.difficulty() === 'impossible') {
      if (t < 250) return 'Truly Impossible!';
      if (t < 400) return 'Unbelievable!';
      if (t < 600) return 'Lightning sharp!';
      return 'You survived!';
    }
    if (t < 200) return 'Superhuman reflexes!';
    if (t < 300) return 'Lightning fast!';
    if (t < 450) return 'Great reaction!';
    if (t < 600) return 'Not bad!';
    return 'Keep practising!';
  });

  readonly gridClass = computed(() => {
    const d = this.difficulty();
    if (d === 'easy' || d === 'impossible') return 'grid-1';
    return d === 'medium' ? 'grid-2' : 'grid-4';
  });

  // ── Private fields ─────────────────────────────────────────────────────────
  private _delayTimer: ReturnType<typeof setTimeout> | null = null;
  private _impossibleFlashTimer: ReturnType<typeof setTimeout> | null = null;
  private _startTimestamp: number | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    this._clearTimer();
    this._clearImpossibleTimer();
  }

  // ── Public actions ─────────────────────────────────────────────────────────

  selectDifficulty(d: Difficulty): void {
    this.difficulty.set(d);
  }

  startGame(): void {
    this._clearTimer();
    this._clearImpossibleTimer();
    this.reactionTime.set(null);
    this.tooEarlySection.set(null);

    if (this.difficulty() === 'impossible') {
      this._startImpossibleMode();
      return;
    }

    const count = SECTION_COUNT[this.difficulty() as Exclude<Difficulty, 'impossible'>];
    this.sections.set(Array.from({ length: count }, (_, i) => ({ id: i, isGreen: false })));
    this.activeSectionId.set(null);
    this.phase.set('waiting');
    this._scheduleGreen();
  }

  handleSectionClick(sectionId: number): void {
    const p = this.phase();

    if (p === 'waiting') {
      this._clearTimer();
      this.tooEarlySection.set(sectionId);
      this.phase.set('tooearly');
      return;
    }

    if (p === 'ready') {
      const active = this.activeSectionId();
      if (active !== sectionId) {
        this.tooEarlySection.set(sectionId);
        this.phase.set('tooearly');
        return;
      }
      const elapsed = performance.now() - (this._startTimestamp ?? performance.now());
      const ms = Math.round(elapsed);
      this.reactionTime.set(ms);
      this._updateBest(ms);
      this.phase.set('result');
    }
  }

  /** Called when the user clicks a section in Impossible mode */
  handleImpossibleSectionClick(sectionId: number): void {
    const p = this.phase();
    if (p !== 'waiting' && p !== 'ready') return;

    const sec = this.impossibleSections().find(s => s.id === sectionId);
    if (!sec) return;

    // Any click while waiting (red or distraction) = fail
    if (p === 'waiting') {
      this._clearImpossibleTimer();
      this.phase.set('tooearly');
      return;
    }

    // phase === 'ready': green is showing on target — check correct section
    if (sec.isTarget && sec.color === 'green') {
      this._clearImpossibleTimer();
      const elapsed = performance.now() - (this._startTimestamp ?? performance.now());
      const ms = Math.round(elapsed);
      this.reactionTime.set(ms);
      this._updateBest(ms);
      this.phase.set('result');
    } else {
      // Clicked wrong section or a distraction-colored cell
      this._clearImpossibleTimer();
      this.phase.set('wrongcolor');
    }
  }

  playAgain(): void {
    this.startGame();
  }

  goHome(): void {
    this._clearTimer();
    this._clearImpossibleTimer();
    this.phase.set('home');
  }

  /** Tear down all active timers and navigate back to the Game Page. */
  quitGame(): void {
    this._clearTimer();
    this._clearImpossibleTimer();
    this._startTimestamp = null;
    this.phase.set('home');
    this._router.navigate(['/game-page']);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _scheduleGreen(): void {
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    this._delayTimer = setTimeout(() => this._activateGreen(), delay);
  }

  private _activateGreen(): void {
    const count = SECTION_COUNT[this.difficulty() as Exclude<Difficulty, 'impossible'>];
    const target = Math.floor(Math.random() * count);
    this.activeSectionId.set(target);
    this.sections.update(secs =>
      secs.map(s => ({ ...s, isGreen: s.id === target }))
    );
    this._startTimestamp = performance.now();
    this.phase.set('ready');
  }

  /**
   * Impossible mode — 4-section state machine
   * ──────────────────────────────────────────
   * One section is secretly chosen as the target. All start red.
   *
   * Loop:
   *   RED (all sections) → wait → EVENT
   *     75%: pick any section, flash a distraction color → back to red → repeat
   *     25%: flash green on the TARGET section → start timer → await click
   *
   * A click on any non-green cell, or any click while waiting, is a failure.
   */
  private _startImpossibleMode(): void {
    this._targetSectionId = Math.floor(Math.random() * 4);
    this.impossibleSections.set(
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        color: 'red' as ImpossibleColor,
        isTarget: i === this._targetSectionId,
      }))
    );
    this.phase.set('waiting');
    this._scheduleImpossibleEvent();
  }

  private _scheduleImpossibleEvent(): void {
    const delay = IMP_RED_MIN + Math.random() * (IMP_RED_MAX - IMP_RED_MIN);
    this._impossibleFlashTimer = setTimeout(() => this._fireImpossibleEvent(), delay);
  }

  private _fireImpossibleEvent(): void {
    if (Math.random() < IMP_GREEN_CHANCE) {
      this._showImpossibleGreen();
    } else {
      this._showImpossibleDistraction();
    }
  }

  /** Flash green on the target section; start the reaction clock. */
  private _showImpossibleGreen(): void {
    const targetId = this._targetSectionId;
    this.impossibleSections.update(secs =>
      secs.map(s => ({ ...s, color: s.id === targetId ? ('green' as ImpossibleColor) : s.color }))
    );
    this._startTimestamp = performance.now();
    this.phase.set('ready');
    // No auto-expire for grid mode — player must click the correct green cell.
  }

  /** Flash 1–4 random sections simultaneously, each with an independent distraction color. */
  private _showImpossibleDistraction(): void {
    // Shuffle section ids [0,1,2,3] and take a random slice of 1–4
    const shuffled = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const count = 1 + Math.floor(Math.random() * 4); // 1, 2, 3, or 4
    const targetIds = new Set(shuffled.slice(0, count));

    this.impossibleSections.update(secs =>
      secs.map(s => {
        if (!targetIds.has(s.id)) return s;
        const color = IMP_DISTRACTION_COLORS[
          Math.floor(Math.random() * IMP_DISTRACTION_COLORS.length)
        ] as ImpossibleColor;
        return { ...s, color };
      })
    );

    const hold = IMP_DIST_MIN + Math.random() * (IMP_DIST_MAX - IMP_DIST_MIN);
    this._impossibleFlashTimer = setTimeout(() => {
      // Reset only the sections that were lit up
      this.impossibleSections.update(secs =>
        secs.map(s => targetIds.has(s.id) ? { ...s, color: 'red' as ImpossibleColor } : s)
      );
      this._scheduleImpossibleEvent();
    }, hold);
  }

  private _updateBest(ms: number): void {
    const d = this.difficulty();
    this.bestScores.update(scores => {
      const prev = scores[d];
      return { ...scores, [d]: prev === null || ms < prev ? ms : prev };
    });
  }

  private _clearTimer(): void {
    if (this._delayTimer !== null) {
      clearTimeout(this._delayTimer);
      this._delayTimer = null;
    }
  }

  private _clearImpossibleTimer(): void {
    if (this._impossibleFlashTimer !== null) {
      clearTimeout(this._impossibleFlashTimer);
      this._impossibleFlashTimer = null;
    }
  }
}