import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-flappy-bird',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flappy-bird.html',
  styleUrls: ['./flappy-bird.css'],
})
export class FlappyBird implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D | null;
  private rafId: number | null = null;
  private pipes: { x: number; gapY: number }[] = [];
  private pipeTimer = 0;
  private lastTime = 0;
  private countdownInterval: any = null;
  private tenMinTimer: any = null;
  private timerStart = 0;
  private evolutionNotificationTimer: any = null;

  screen: 'instructions' | 'start' | 'countdown' | 'playing' | 'gameOver' = 'instructions';

  width = 0;
  height = 0;

  bird = { x: 0, y: 0, vy: 0, radius: 14 };
  birdImages: { egg: HTMLImageElement | null; bird: HTMLImageElement | null; bigBird: HTMLImageElement | null } = {
    egg: typeof Image !== 'undefined' ? new Image() : null,
    bird: typeof Image !== 'undefined' ? new Image() : null,
    bigBird: typeof Image !== 'undefined' ? new Image() : null,
  };
  evolutionNotification: string | null = null;
  showEvolutionNotification = false;
  private lastEvolutionStage = 0;

  evolutionMode = false;

  gravity = 0.42;
  flapImpulse = -8;

  score = 0;
  gameOverScore = 0;
  bestScore = 0;
  lives = 3;
  invincibilityTime = 0;
  running = false;

  totalSeconds = 10*60;
  remaining = this.totalSeconds;
  countdownValue = 3;
  timeWarningCountdown = 0;
  isTimeWarningActive = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = canvas.getContext('2d');
    this.loadBirdImages();

    this.initGame();
  }

  loadBirdImages() {
    if (this.birdImages.egg) {
      this.birdImages.egg.src = '/Egg.png';
    }
    if (this.birdImages.bird) {
      this.birdImages.bird.src = '/bird.png';
    }
    if (this.birdImages.bigBird) {
      this.birdImages.bigBird.src = '/bigbird.png';
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  cleanup() {
    this.stopLoop();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.tenMinTimer) clearInterval(this.tenMinTimer);
    if (this.evolutionNotificationTimer) clearTimeout(this.evolutionNotificationTimer);
    this.isTimeWarningActive = false;
  }

  initGame() {
    this.bird = { x: this.width * 0.2, y: this.height / 2, vy: 0, radius: 14 };
    this.pipes = [];
    this.pipeTimer = 0;
    this.score = 0;
    this.resetEvolutionState();
    this.screen = 'instructions';
    this.draw();
    this.startTenMinTimer();
  }

  resetEvolutionState() {
    this.lastEvolutionStage = 0;
    this.evolutionNotification = null;
    this.showEvolutionNotification = false;
    if (this.evolutionNotificationTimer) {
      clearTimeout(this.evolutionNotificationTimer);
      this.evolutionNotificationTimer = null;
    }
  }

  startTenMinTimer() {
    if (this.tenMinTimer) clearInterval(this.tenMinTimer);
    this.timerStart = Date.now();
    this.remaining = this.totalSeconds;
    this.tenMinTimer = setInterval(() => {
      this.zone.run(() => {
        const elapsed = Math.floor((Date.now() - this.timerStart) / 1000);
        this.remaining = Math.max(0, this.totalSeconds - elapsed);
        if (this.remaining <= 3 && !this.isTimeWarningActive) {
          this.isTimeWarningActive = true;
          this.timeWarningCountdown = 3;
          this.startTimeWarningCountdown();
        }
        if (this.remaining <= 0) {
          this.cleanup();
          this.router.navigate(['/game-page']);
        }
      });
    }, 1000);
  }

  startTimeWarningCountdown() {
    const warningInterval = setInterval(() => {
      this.zone.run(() => {
        this.timeWarningCountdown -= 1;
        if (this.timeWarningCountdown < 0) {
          clearInterval(warningInterval);
          this.cleanup();
          this.router.navigate(['/game-page']);
        }
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  onInstructionsOK() {
    this.screen = 'start';
    this.draw(); 
  }

  selectNormalMode() {
    this.evolutionMode = false;
  }

  selectEvolutionMode() {
    this.evolutionMode = true;
  }

  onStartGame() {
    this.screen = 'countdown';
    this.countdownValue = 3;
    this.resetGameState();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.startCountdown();
  }

  startCountdown() {
    this.countdownValue = 3;
    this.draw();
    this.countdownInterval = setInterval(() => {
      this.zone.run(() => {
        this.countdownValue -= 1;
        if (this.countdownValue < 0) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
          this.screen = 'playing';
          this.resetGameState();
          this.startLoop();
        }
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  resetGameState() {
    this.bird = { x: this.width * 0.2, y: this.height / 2, vy: 0, radius: 14 };
    this.pipes = [];
    this.pipeTimer = 0;
    this.score = 0;
    this.lives = 3;
    this.invincibilityTime = 0;
    this.resetEvolutionState();
  }

  startLoop() {
    this.running = true;
    this.lastTime = performance.now();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  stopLoop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  loop(now: number) {
    const dt = Math.min(40, now - this.lastTime);
    this.lastTime = now;
    this.update(dt / 16);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  update(dtScale: number) {
    if (this.screen !== 'playing') return;

    this.bird.vy += this.gravity * dtScale;
    this.bird.y += this.bird.vy * dtScale;
    this.invincibilityTime -= dtScale;

    this.pipeTimer += 0.8 * dtScale;
    if (this.pipeTimer > 110) {
      this.pipeTimer = 0;
      const gapSize = 190;
      const minGapY = gapSize + 80;
      const maxGapY = this.height - 120 - gapSize;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);
      this.pipes.push({ x: this.width + 40, gapY });
    }

    for (const p of this.pipes) p.x -= 3.2 * dtScale;
    if (this.pipes.length && this.pipes[0].x < -80) {
      this.pipes.shift();
      this.score += 1;
      this.updateBirdEvolution();
    }

    if (this.bird.y + this.bird.radius > this.height - 100) {
      if (this.invincibilityTime <= 0) {
        this.loseLife();
      }
      return;
    }
    if (this.bird.y - this.bird.radius < 0) {
      if (this.invincibilityTime <= 0) {
        this.loseLife();
      }
      return;
    }

    for (const p of this.pipes) {
      const bx = this.bird.x;
      const by = this.bird.y;
      const r = this.bird.radius;
      const pipeW = 70;
      const gapSize = 160;
      if (
        bx + r > p.x && bx - r < p.x + pipeW &&
        (by - r < p.gapY - gapSize / 2 || by + r > p.gapY + gapSize / 2)
      ) {
        if (this.invincibilityTime <= 0) {
          this.loseLife();
        }
        return;
      }
    }
  }

  updateBirdEvolution() {
    if (!this.evolutionMode) {
      return;
    }
    const stage = this.getBirdEvolutionStage(this.score);
    if (stage === this.lastEvolutionStage) {
      return;
    }

    this.lastEvolutionStage = stage;

    if (stage === 1) {
      this.showEvolutionMessage('Egg hatched!');
    } else if (stage === 2) {
      this.showEvolutionMessage('Bird evolved!');
    }
  }

  getBirdEvolutionStage(score: number) {
    
    if (score >= 10) {
      return 2;
    }

    if (score >= 5) {
      return 1;
    }

    return 0;
    
  }

  showEvolutionMessage(message: string) {
    this.evolutionNotification = message;
    this.showEvolutionNotification = true;

    if (this.evolutionNotificationTimer) {
      clearTimeout(this.evolutionNotificationTimer);
    }

    this.evolutionNotificationTimer = setTimeout(() => {
      this.showEvolutionNotification = false;
      this.cdr.detectChanges();
    }, 1400);

    this.cdr.detectChanges();
  }

  loseLife() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.onDeath();
    } else {
      this.invincibilityTime = 1.0;
      this.bird = { x: this.width * 0.2, y: this.height / 2, vy: 0, radius: 14 };
      // Clear existing pipes then spawn a nearby pipe so the gap isn't too far
      this.pipes = [];
      // Spawn a close pipe, then a second pipe spaced like normal spawns so gaps stay regular
      const immediateX = Math.max(120, this.width * 0.45);
      const gapSize = 190;
      const minGapY = gapSize + 80;
      const maxGapY = this.height - 120 - gapSize;
      const gapY1 = minGapY + Math.random() * (maxGapY - minGapY);
      // use viewport-relative spacing to keep the follow-up pipes visually consistent
      const spacing = Math.round(Math.max(260, Math.min(420, this.width * 0.28)));
      const gapY2 = Math.min(maxGapY, Math.max(minGapY, gapY1 + (Math.random() - 0.5) * 60));
      const gapY3 = Math.min(maxGapY, Math.max(minGapY, gapY2 + (Math.random() - 0.5) * 60));
      this.pipes.push({ x: immediateX, gapY: gapY1 });
      this.pipes.push({ x: immediateX + spacing, gapY: gapY2 });
      this.pipes.push({ x: immediateX + spacing * 2, gapY: gapY3 });
      // reset pipeTimer so subsequent spawns follow the normal rhythm
      this.pipeTimer = 0;
      this.cdr.detectChanges();
    }
  }

  onDeath() {
    this.stopLoop();
    this.zone.run(() => {
      this.gameOverScore = this.score;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
      this.screen = 'gameOver';
      this.cdr.detectChanges();
      this.draw();
    });
  }

  onGameOverRestart() {
    this.screen = 'start';
    this.resetGameState();
    this.draw();
    this.cdr.detectChanges();
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.drawBackground(ctx);
    this.drawGameArea(ctx);
  }

  drawBackground(ctx: CanvasRenderingContext2D) {
    const sky = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    sky.addColorStop(0, '#87ceff');
    sky.addColorStop(0.6, '#64b5f6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.width * 0.85, this.height * 0.15, 60, 0, Math.PI * 2);
    ctx.fill();

    const cloud = (x: number, y: number, scale: number) => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 26 * scale, 0, Math.PI * 2);
      ctx.arc(x + 30 * scale, y - 10 * scale, 24 * scale, 0, Math.PI * 2);
      ctx.arc(x + 60 * scale, y, 28 * scale, 0, Math.PI * 2);
      ctx.arc(x + 36 * scale, y + 10 * scale, 22 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    };

    cloud(this.width * 0.2, this.height * 0.18, 1.1);
    cloud(this.width * 0.4, this.height * 0.12, 0.8);
    cloud(this.width * 0.65, this.height * 0.22, 1.0);

    ctx.fillStyle = '#72b1e0';
    ctx.fillRect(0, this.height * 0.6, this.width, this.height * 0.15);
    ctx.fillStyle = '#a6db5b';
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.15);
    ctx.fillStyle = '#7d983d';
    ctx.fillRect(0, this.height - 100, this.width, 100);

    ctx.fillStyle = '#ffffff22';
    ctx.fillRect(0, this.height * 0.63, this.width, 8);
  }

  drawGameArea(ctx: CanvasRenderingContext2D) {
    if (this.screen === 'playing') {
      ctx.fillStyle = '#24a63f';
      for (const p of this.pipes) {
        const pipeW = 70;
        const gapSize = 160;
        ctx.fillRect(p.x, 0, pipeW, p.gapY - gapSize / 2);
        ctx.fillRect(p.x, p.gapY + gapSize / 2, pipeW, this.height - (p.gapY + gapSize / 2) - 100);
      }

      const size = 80;
      const birdImage = this.currentBirdImage;

      if (birdImage && birdImage.complete && birdImage.naturalWidth > 0) {
        ctx.drawImage(
          birdImage,
          this.bird.x - size / 2,
          this.bird.y - size / 2,
          size,
          size
        );
      } else {
        ctx.fillStyle = '#fddc56';
        ctx.beginPath();
        ctx.arc(
          this.bird.x,
          this.bird.y,
          this.bird.radius,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  get currentBirdImage() {

    if (!this.evolutionMode) {
      return this.birdImages.bird;
    }

    const stage = this.getBirdEvolutionStage(this.score);

    if (stage >= 2) {
      return this.birdImages.bigBird;
    }

    if (stage >= 1) {
      return this.birdImages.bird;
    }

    return this.birdImages.egg;
  }

    formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  flap() {
    if (this.screen === 'playing') {
      this.bird.vy = this.flapImpulse;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.screen === 'instructions') {
        this.onInstructionsOK();
      } else if (this.screen === 'start') {
        this.onStartGame();
      } else if (this.screen === 'playing') {
        this.flap();
      }
    }
  }

  @HostListener('window:resize')
  handleResize() {
    const canvas = this.canvasRef.nativeElement;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = this.width;
    canvas.height = this.height;
    this.draw();
  }

  onCanvasClick() {
    if (this.screen === 'playing') {
      this.flap();
    }
  }

  handleQuit() {
    const ok = confirm('Are you sure you want to quit?');
    if (ok) {
      this.cleanup();
      this.router.navigate(['/game-page']);
    }
  }
}

