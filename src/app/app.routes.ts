import { Routes } from '@angular/router';
import { guestGuard } from './guards/guest-guard';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [

  {
    path: '',

    loadComponent: () =>
      import('./game-hub-phaser/game-hub-phaser')
        .then(m => m.GameHubPhaserComponent),
  },
  
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login')
        .then(m => m.Login),
    canActivate: [guestGuard]
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./registration/registration')
        .then(m => m.Registration),
    canActivate: [guestGuard]
  },

  {
    path: 'flappy-bird',
    loadComponent: () =>
      import('./flappy-bird/flappy-bird')
        .then(m => m.FlappyBird),canActivate: [authGuard]
  },

  {
    path: 'image-puzzle-info',
    loadComponent: () =>
      import('./puzzle-game/image-puzzle-info.component')
        .then(m => m.ImagePuzzleInfoComponent),canActivate: [authGuard]
  },

  {
    path: 'image-puzzle',
    loadComponent: () =>
      import('./puzzle-game/image-puzzle.component')
        .then(m => m.ImagePuzzleComponent),canActivate: [authGuard]
  },

  {
    path: 'reaction-time',
    loadComponent: () =>
      import('./reaction-time/reaction-time')
        .then(m => m.ReactionTimeGameComponent),canActivate: [authGuard]
  },

  {
    path: 'wavelength',
    loadComponent: () =>
      import('./wavelength/wavelength')
        .then(m => m.WavelengthComponent),canActivate: [authGuard]
  },

  {
    path: 'oops',
    loadComponent: () =>
      import('./oops/components/oops.component')
        .then(m => m.OopsComponent),canActivate: [authGuard]
  },

  {
    path: 'guess',
    loadComponent: () =>
      import('./guess/guess')
        .then(m => m.GuessGuessComponent),canActivate: [authGuard]
  },
  {
  path: 'preview/:game',
    loadComponent: () => import('./game-preview/game-preview').then((m) => m.GamePreviewComponent),
  },
  {
    path: '**',
    redirectTo: ''
  }

];