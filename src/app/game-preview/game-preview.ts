import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

type GameSlug =
  | 'flappy'
  | 'wavelength'
  | 'reaction'
  | 'puzzle'
  | 'howfaroff'
  | 'oops';

interface GameStat {
  label: string;
  value: string;
}

interface GameScreenshot {
  src: string;
  alt: string;
}

interface PreviewGame {
  slug: GameSlug;
  title: string;
  shortTitle: string;
  subtitle: string;
  spriteKey: string;
  players: string;
  genre: string;
  difficulty: string;
  status: string;
  description: string;
  color: string;
  colorSoft: string;
  colorDeep: string;
  route: string;
  screenshots: GameScreenshot[];
}

const ROUTES: Record<GameSlug, string> = {
  flappy: '/flappy-bird',
  wavelength: '/wavelength',
  reaction: '/reaction-time',
  puzzle: '/image-puzzle-info',
  howfaroff: '/guess',
  oops: '/oops',
};

const GAME_ORDER: GameSlug[] = [
  'flappy',
  'wavelength',
  'reaction',
  'puzzle',
  'howfaroff',
  'oops',
];

@Component({
  selector: 'app-game-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-preview.html',
  styleUrls: ['./game-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePreviewComponent implements OnInit, OnDestroy {
  readonly games: PreviewGame[] = [
    {
      slug: 'flappy',
      title: 'Flappy Escape',
      shortTitle: 'Flappy',
      subtitle: 'A tiny winged dash through ruined sky temples.',
      spriteKey:'island-flappy',
      players: 'Solo',
      genre: 'Arcade',
      difficulty: 'Medium',
      status: 'Available',
      color: '#F4C542',
      colorSoft: '#FFE7A3',
      colorDeep: '#9A6A00',
      route: ROUTES.flappy,
      description:
        'Thread through ancient floating gates, chase clean air currents, and survive one more impossible opening in a glowing sky kingdom.',
      screenshots: [
        { src: '/game-previews/f1.png', alt: 'Flappy Escape gameplay screenshot 1' },
        { src: '/game-previews/f2.png', alt: 'Flappy Escape gameplay screenshot 2' },
        { src: '/game-previews/f3.png', alt: 'Flappy Escape gameplay screenshot 3' },
      ],
    },
    {
      slug: 'wavelength',
      title: 'Party Games',
      shortTitle: 'Party',
      subtitle: 'Read the room, ride the signal, find the hidden frequency.',
      spriteKey:'island-wavelength',
      players: '2+',
      genre: 'Social',
      difficulty: 'Easy',
      status: 'Available',
      color: '#8B5CF6',
      colorSoft: '#C4B5FD',
      colorDeep: '#4C1D95',
      route: ROUTES.wavelength,
      description:
        'A calm mind game of intuition and alignment where every answer becomes a shimmering point on an invisible spectrum.',
      screenshots: [
        { src: 'game-previews/w1.png', alt: 'Party Games gameplay screenshot 1' },
        { src: 'game-previews/w2.png', alt: 'Party Games gameplay screenshot 2' },
        { src: 'game-previews/w3.png', alt: 'Party Games gameplay screenshot 3' },
        { src: 'game-previews/w4.png', alt: 'Party Games gameplay screenshot 4' },
        { src: 'game-previews/w5.png', alt: 'Party Games gameplay screenshot 5' },
      ],
    },
    {
      slug: 'reaction',
      title: 'Reaction Time',
      shortTitle: 'React',
      subtitle: 'A lightning trial inside a silent celestial arena.',
      spriteKey:'island-reaction',
      players: 'Solo',
      genre: 'Reflex',
      difficulty: 'Easy',
      status: 'Available',
      color: '#22C55E',
      colorSoft: '#86EFAC',
      colorDeep: '#166534',
      route: ROUTES.reaction,
      description:
        'Wait for the pulse, strike at the exact moment, and watch your reflexes turn into a streak of sparks.',
      screenshots: [
        { src: '/game-previews/r1.png', alt: 'Reaction Time gameplay screenshot 1' },
        { src: '/game-previews/r2.png', alt: 'Reaction Time gameplay screenshot 2' },
        { src: '/game-previews/r3.png', alt: 'Reaction Time gameplay screenshot 3' },
      ],
    },
    {
      slug: 'puzzle',
      title: 'Image Puzzle',
      shortTitle: 'Puzzle',
      subtitle: 'Restore fractured memories from a drifting archive.',
      spriteKey:'island-image-puzzle',
      players: 'Solo',
      genre: 'Puzzle',
      difficulty: 'Medium',
      status: 'Available',
      color: '#3B82F6',
      colorSoft: '#BFDBFE',
      colorDeep: '#1D4ED8',
      route: ROUTES.puzzle,
      description:
        'Slide, study, and rebuild enchanted images piece by piece until the lost picture settles back into place.',
      screenshots: [
        { src: '/game-previews/p1.png', alt: 'Image Puzzle gameplay screenshot 1' },
      ],
    },
    {
      slug: 'howfaroff',
      title: 'Guess Guess?',
      shortTitle: 'Guess',
      subtitle: 'Guess the outcome and learn how close your instinct lands.',
      spriteKey:'island-higher-lower',
      players: '2+',
      genre: 'Guessing',
      difficulty: 'Easy',
      status: 'Available',
      color: '#C0C0C0',
      colorSoft: '#F1F5F9',
      colorDeep: '#64748B',
      route: ROUTES.howfaroff,
      description:
        'Make bold guesses, and discover the strange satisfaction of being almost exactly wrong.',
      screenshots: [
        { src: '/game-previews/g1.png', alt: 'Guess guess gameplay screenshot 1' },
      ],
    },
    {
      slug: 'oops',
      title: 'Oops',
      shortTitle: 'Oops',
      subtitle: 'A playful chaos chamber where mistakes become the point.',
      spriteKey:'island-oops',
      players: '3+',
      genre: 'Mystery',
      difficulty: 'Hard',
      status: 'Available',
      color: '#EF4444',
      colorSoft: '#FCA5A5',
      colorDeep: '#991B1B',
      route: ROUTES.oops,
      description:
        'React to strange surprises, recover from ridiculous moments, and turn every tiny disaster into a better run.',
      screenshots: [
        { src: '/game-previews/o1.png', alt: 'Oops gameplay screenshot 1' },
        { src: '/game-previews/o2.png', alt: 'Oops gameplay screenshot 2' },
        { src: '/game-previews/o3.png', alt: 'Oops gameplay screenshot 3' },
        { src: '/game-previews/o4.png', alt: 'Oops gameplay screenshot 4' },
        { src: '/game-previews/o5.png', alt: 'Oops gameplay screenshot 5' },
        { src: '/game-previews/o6.png', alt: 'Oops gameplay screenshot 6' },
      ],
    },
  ];

  activeGame: PreviewGame = this.games[0];
  activeIndex = 0;
  slideIndex = 0;
  contentPhase = 'is-settled';
  liquidDirection: 'forward' | 'backward' = 'forward';

  private readonly isBrowser: boolean;
  private keyboardUnlisten?: () => void;
  private transitionTimer?: ReturnType<typeof setTimeout>;
  private touchStartX = 0;
  private touchStartY = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostBinding('style.--theme')
  get theme(): string {
    return this.activeGame.color;
  }

  @HostBinding('style.--theme-soft')
  get themeSoft(): string {
    return this.activeGame.colorSoft;
  }

  @HostBinding('style.--theme-deep')
  get themeDeep(): string {
    return this.activeGame.colorDeep;
  }

  @HostBinding('style.--active-index')
  get activeIndexCss(): number {
    return this.activeIndex;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.syncGameFromRoute(params));

    if (this.isBrowser) {
      this.keyboardUnlisten = this.renderer.listen(
        'document',
        'keydown',
        (event: KeyboardEvent) => this.handleKeyboard(event)
      );
    }
  }

  ngOnDestroy(): void {
    this.keyboardUnlisten?.();

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
  }

  get stats(): GameStat[] {
    return [
      { label: 'Players', value: this.activeGame.players },
      { label: 'Genre', value: this.activeGame.genre },
      { label: 'Difficulty', value: this.activeGame.difficulty },
      { label: 'Status', value: this.activeGame.status },
    ];
  }

  get activeScreenshot(): GameScreenshot {
    return this.activeGame.screenshots[this.slideIndex] ?? this.activeGame.screenshots[0];
  }

  trackGame(_: number, game: PreviewGame): GameSlug {
    return game.slug;
  }

  trackScreenshot(index: number): number {
    return index;
  }

  selectGame(game: PreviewGame): void {
    if (game.slug === this.activeGame.slug) {
      return;
    }

    this.router.navigate(['/preview', game.slug], {
      replaceUrl: false,
    });
  }

playGame(): void {
  console.log('Logged in:', this.isLoggedIn());
  console.log('Navigating to:', this.activeGame.route);

  this.router.navigateByUrl(this.activeGame.route).then(result => {
    console.log('Navigation result:', result);
  });
}

  goBack(): void {
    this.router.navigateByUrl('/game-hub-phaser');
  }

  previousSlide(): void {
    this.slideIndex = this.wrapIndex(
      this.slideIndex - 1,
      this.activeGame.screenshots.length
    );
  }

  nextSlide(): void {
    this.slideIndex = this.wrapIndex(
      this.slideIndex + 1,
      this.activeGame.screenshots.length
    );
  }

  setSlide(index: number): void {
    if (index === this.slideIndex) {
      return;
    }

    this.slideIndex = this.wrapIndex(index, this.activeGame.screenshots.length);
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.isBrowser || event.touches.length !== 1) {
      return;
    }

    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isBrowser || event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX > 0) {
      this.previousSlide();
    } else {
      this.nextSlide();
    }
  }

  private syncGameFromRoute(params: ParamMap): void {
    const requestedSlug = params.get('game') ?? params.get('slug');
    const slug = this.normalizeSlug(requestedSlug);
    const nextIndex = this.games.findIndex((game) => game.slug === slug);
    const safeIndex = nextIndex >= 0 ? nextIndex : 0;
    const nextGame = this.games[safeIndex];

    if (!requestedSlug || nextIndex < 0) {
      this.router.navigate(['/preview', nextGame.slug], {
        replaceUrl: true,
      });
      return;
    }

    if (nextGame.slug === this.activeGame.slug) {
      return;
    }

    this.liquidDirection = safeIndex > this.activeIndex ? 'forward' : 'backward';
    this.contentPhase = 'is-changing';

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }

    this.activeGame = nextGame;
    this.activeIndex = safeIndex;
    this.slideIndex = 0;

    this.transitionTimer = setTimeout(() => {
      this.contentPhase = 'is-settled';
    }, 260);
  }

  private normalizeSlug(value: string | null): GameSlug {
    const slug = (value ?? '').toLowerCase() as GameSlug;
    return GAME_ORDER.includes(slug) ? slug : 'flappy';
  }

  private handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();

    if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousSlide();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
    }
  }

  private isLoggedIn(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      return (
        localStorage.getItem('isLoggedIn') === 'true' ||
        localStorage.getItem('user') !== null ||
        localStorage.getItem('authToken') !== null ||
        sessionStorage.getItem('isLoggedIn') === 'true'
      );
    } catch {
      return false;
    }
  }

  private wrapIndex(index: number, length: number): number {
    if (length <= 0) {
      return 0;
    }

    return ((index % length) + length) % length;
  }
}