import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.services';
import { FirestoreService } from '../services/firestore.service';
import { auth } from '../firebase.config';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
type Particle = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  alpha: number;
  drift: number;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') particleCanvas?: ElementRef<HTMLCanvasElement>;

  loginForm: FormGroup;
  isPortalOpen = false;
  portalActivating = false;
  private particles: Particle[] = [];
  private pointer = { x: -9999, y: -9999, active: false };
  private animationFrame = 0;
  private resizeObserver?: ResizeObserver;
  private portalSound!: HTMLAudioElement;

  constructor(
  private fb: FormBuilder,
  private router: Router,
  private authService: AuthService,
  private firestoreService: FirestoreService,
  private zone: NgZone,
  @Inject(PLATFORM_ID) private platformId: Object
) {
  this.loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  if (isPlatformBrowser(this.platformId)) {
    this.portalSound = new Audio('/sounds/portal-activate.mpeg');
    this.portalSound.preload = 'auto';
    this.portalSound.volume = 0.8;
  }
}

  trackPointer(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    this.pointer.active = true;
  }

  releasePointer(): void {
    this.pointer.active = false;
  }
  private resetPointer(): void {
    this.pointer = {
      x: -9999,
      y: -9999,
      active: false
    };
  }

  ngAfterViewInit(): void {
    if (!this.particleCanvas || typeof window === 'undefined') {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.setupParticles();

      this.resizeObserver = new ResizeObserver(() => {
      this.setupParticles();
    });

    const container =
      this.particleCanvas!.nativeElement.parentElement;

    if (container) {
      this.resizeObserver.observe(container);
    }
      this.animateParticles();
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.resizeObserver?.disconnect();
  }
  @HostListener('window:resize')
  onWindowResize(): void {
    this.resetPointer();
    this.setupParticles();
  }

  private setupParticles(): void {
    this.resetPointer();

    const canvas = this.particleCanvas?.nativeElement;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const total =
    rect.width < 768
      ? 100
      : 280;

    this.particles = Array.from({ length: total }, () => {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;

      return {
        x,
        y,
        baseX: x,
        baseY: y,
        size:
          rect.width < 768
            ? Math.random() * 0.6 + 0.3
            : Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.55 + 0.25,
        drift: Math.random() * Math.PI * 2
      };
    });
  }

  private animateParticles(): void {
    const canvas = this.particleCanvas?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    context.setTransform(1, 0, 0, 1, 0, 0);

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const ratio = canvas.width / rect.width || 1;

    context.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    for (const particle of this.particles) {
      const driftX = Math.cos(particle.drift) * 0.16;
      const driftY = Math.sin(particle.drift) * 0.16;
      particle.baseX += driftX;
      particle.baseY += driftY;

      if (particle.baseX < -10) particle.baseX = rect.width + 10;
      if (particle.baseX > rect.width + 10) particle.baseX = -10;
      if (particle.baseY < -10) particle.baseY = rect.height + 10;
      if (particle.baseY > rect.height + 10) particle.baseY = -10;

      let targetX = particle.baseX;
      let targetY = particle.baseY;

      if (this.pointer.active) {
        const dx = particle.baseX - this.pointer.x;
        const dy = particle.baseY - this.pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius =
          rect.width < 768
            ? 70
            : 118;

        if (distance < radius) {
          const force = (radius - distance) / radius;
          const angle = Math.atan2(dy, dx);
          targetX += Math.cos(angle) * force * 72;
          targetY += Math.sin(angle) * force * 72;
        }
      }

      particle.x += (targetX - particle.x) * 0.08;
      particle.y += (targetY - particle.y) * 0.08;

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(170, 248, 255, ${particle.alpha})`;
      context.shadowColor = 'rgba(57, 236, 255, .7)';
      context.shadowBlur = 8;
      context.fill();
    }

    this.animationFrame = requestAnimationFrame(() => this.animateParticles());
  }
   async login() {

  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    alert('Please fill in all fields correctly!');
    return;
  }

  const { email, password } = this.loginForm.value;

  try {

    await this.authService.login(
      email,
      password
    );

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not found');
    }

    const profile =
      await this.firestoreService.getUser(
        currentUser.uid
      );

    if (!profile) {
      throw new Error('User profile not found.');
    }

    this.isPortalOpen = true;
    if (this.portalSound) {
          this.portalSound.currentTime = 0;

          this.portalSound.play().catch(err => {
            console.error('Failed to play portal sound:', err);
          });
        }
    cancelAnimationFrame(this.animationFrame);

    document
      .querySelector('.login-world')
      ?.classList.add('portal-active');

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        uid: currentUser.uid,
        name: profile['name'],
        email: profile['email']
      })
    );

    setTimeout(() => {
      this.router.navigate(['/game-page']);
    }, 2800);

  } catch (error: any) {

    if (error.code === 'auth/invalid-credential') {

      alert('Invalid email or password.');

    } else {

      alert(error.message);
    }

  }

}

  goHome(): void {
    this.router.navigate(['/']);
  }
}