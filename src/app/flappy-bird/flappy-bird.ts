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
  private secretToastTimer: any = null;
  private secretCloudTaps = 0;

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
  goldenHour = false;
  secretToast = false;
  secretToastMessage = '';

  gravity = 0.42;
  flapImpulse = -8;

  score = 0;
  gameOverScore = 0;
  bestScore = 0;
  lives = 3;
  invincibilityTime = 0;
  running = false;

  totalSeconds = 10 * 60;
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
    if (this.secretToastTimer) clearTimeout(this.secretToastTimer);
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

  goBackFromInstructions() {
    this.cleanup();
    this.router.navigate(['/game-page']);
  }

  goBackToInstructions() {
    this.screen = 'instructions';
    this.draw();
    this.cdr.detectChanges();
  }

  selectNormalMode() {
    this.evolutionMode = false;
  }

  selectEvolutionMode() {
    this.evolutionMode = true;
  }

  tapCloudSecret() {
    this.secretCloudTaps += 1;

    if (this.secretCloudTaps >= 3) {
      this.secretCloudTaps = 0;
      this.goldenHour = !this.goldenHour;
      this.secretToastMessage = this.goldenHour ? 'Golden Hour unlocked' : 'Normal sky unlocked';
      this.secretToast = true;
      this.draw();

      if (this.secretToastTimer) {
        clearTimeout(this.secretToastTimer);
      }

      this.secretToastTimer = setTimeout(() => {
        this.secretToast = false;
        this.cdr.detectChanges();
      }, 1800);

      this.cdr.detectChanges();
    }
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
      this.pipes = [];

      const immediateX = Math.max(120, this.width * 0.45);
      const gapSize = 190;
      const minGapY = gapSize + 80;
      const maxGapY = this.height - 120 - gapSize;
      const gapY1 = minGapY + Math.random() * (maxGapY - minGapY);
      const spacing = Math.round(Math.max(260, Math.min(420, this.width * 0.28)));
      const gapY2 = Math.min(maxGapY, Math.max(minGapY, gapY1 + (Math.random() - 0.5) * 60));
      const gapY3 = Math.min(maxGapY, Math.max(minGapY, gapY2 + (Math.random() - 0.5) * 60));

      this.pipes.push({ x: immediateX, gapY: gapY1 });
      this.pipes.push({ x: immediateX + spacing, gapY: gapY2 });
      this.pipes.push({ x: immediateX + spacing * 2, gapY: gapY3 });

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
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, this.goldenHour ? '#ffc98b' : '#8fd8ff');
    sky.addColorStop(0.5, this.goldenHour ? '#ffe6a7' : '#b9ecff');
    sky.addColorStop(1, '#fff7da');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawSoftSun(ctx);
    this.drawSoftCloud(ctx, this.width * 0.16, this.height * 0.18, 1.05);
    this.drawSoftCloud(ctx, this.width * 0.42, this.height * 0.12, 0.72);
    this.drawSoftCloud(ctx, this.width * 0.68, this.height * 0.24, 0.92);

    ctx.fillStyle = this.goldenHour ? '#f7c76d' : '#9ed9f5';
    ctx.beginPath();
    ctx.ellipse(this.width * 0.18, this.height - 80, this.width * 0.46, 150, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.goldenHour ? '#b8d66f' : '#a7df6f';
    ctx.beginPath();
    ctx.ellipse(this.width * 0.72, this.height - 70, this.width * 0.58, 165, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#68c95d';
    ctx.fillRect(0, this.height - 100, this.width, 100);

    ctx.fillStyle = '#4ead42';
    for (let x = -20; x < this.width + 40; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, this.height - 100);
      ctx.lineTo(x + 12, this.height - 122);
      ctx.lineTo(x + 24, this.height - 100);
      ctx.fill();
    }

    ctx.fillStyle = '#ffe082';
    ctx.fillRect(0, this.height - 30, this.width, 30);
  }

  drawSoftSun(ctx: CanvasRenderingContext2D) {
    const x = this.width * 0.84;
    const y = this.height * 0.14;
    const r = 54;

    ctx.fillStyle = this.goldenHour ? 'rgba(255, 177, 91, 0.24)' : 'rgba(255, 225, 130, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r + 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.goldenHour ? '#ffb75e' : '#ffd166';
    ctx.strokeStyle = '#24435c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#24435c';
    ctx.beginPath();
    ctx.arc(x - 16, y - 8, 4, 0, Math.PI * 2);
    ctx.arc(x + 16, y - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#24435c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + 6, 18, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  drawSoftCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(36, 67, 92, 0.12)';
    ctx.beginPath();
    ctx.ellipse(38, 20, 82, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.goldenHour ? '#fff1cf' : '#ffffff';
    ctx.strokeStyle = 'rgba(36, 67, 92, 0.55)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(-24, 8, 28, Math.PI, 0);
    ctx.arc(12, -12, 36, Math.PI, 0);
    ctx.arc(54, 4, 30, Math.PI, 0);
    ctx.quadraticCurveTo(82, 8, 86, 28);
    ctx.lineTo(-50, 28);
    ctx.quadraticCurveTo(-48, 12, -24, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawGameArea(ctx: CanvasRenderingContext2D) {
    if (this.screen === 'playing') {
      for (const p of this.pipes) {
        this.drawPipe(ctx, p.x, p.gapY);
      }

      const size = 80;
      const birdImage = this.currentBirdImage;

      ctx.save();

      if (this.invincibilityTime > 0) {
        ctx.globalAlpha = 0.62 + Math.sin(Date.now() / 70) * 0.25;
      }

      if (birdImage && birdImage.complete && birdImage.naturalWidth > 0) {
        ctx.drawImage(
          birdImage,
          this.bird.x - size / 2,
          this.bird.y - size / 2,
          size,
          size
        );
      } else {
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = '#24435c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.bird.x, this.bird.y, this.bird.radius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#24435c';
        ctx.beginPath();
        ctx.arc(this.bird.x + 9, this.bird.y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawPipe(ctx: CanvasRenderingContext2D, x: number, gapY: number) {
    const pipeW = 70;
    const gapSize = 160;
    const topH = gapY - gapSize / 2;
    const bottomY = gapY + gapSize / 2;
    const bottomH = this.height - bottomY - 100;

    const drawSinglePipe = (px: number, py: number, w: number, h: number, flip: boolean) => {
      const grad = ctx.createLinearGradient(px, py, px + w, py);
      grad.addColorStop(0, '#35b957');
      grad.addColorStop(0.5, '#9ae66e');
      grad.addColorStop(1, '#228c45');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#24435c';
      ctx.lineWidth = 4;
      ctx.fillRect(px, py, w, h);
      ctx.strokeRect(px, py, w, h);

      const capH = 26;
      const capY = flip ? py + h - capH : py;

      ctx.fillStyle = '#c6f285';
      ctx.fillRect(px - 8, capY, w + 16, capH);
      ctx.strokeRect(px - 8, capY, w + 16, capH);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(px + 10, py + 10, 10, Math.max(20, h - 20));
    };

    drawSinglePipe(x, 0, pipeW, topH, true);
    drawSinglePipe(x, bottomY, pipeW, bottomH, false);
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