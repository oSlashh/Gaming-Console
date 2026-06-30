import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'game-hub-phaser',
    pathMatch: 'full',
  },
  {
    path: 'home2',
    loadComponent: () => import('./home2/home2').then((m) => m.Home2),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./registration/registration').then((m) => m.Registration),
  },
  {
    path: 'game-hub-phaser',
    loadComponent: () => import('./game-hub-phaser/game-hub-phaser').then((m) => m.GameHubPhaserComponent),
  },
  {
    path: 'flappy-bird',
    loadComponent: () => import('./flappy-bird/flappy-bird').then((m) => m.FlappyBird),
  },
  {
    path: 'image-puzzle-info',
    loadComponent: () => import('./puzzle-game/image-puzzle-info.component').then((m) => m.ImagePuzzleInfoComponent),
  },
  {
    path: 'image-puzzle',
    loadComponent: () => import('./puzzle-game/image-puzzle.component').then((m) => m.ImagePuzzleComponent),
  },
  {
    path: 'reaction-time',
    loadComponent: () => import('./reaction-time/reaction-time').then((m) => m.ReactionTimeGameComponent),
  },
  {
    path: 'wavelength',
    loadComponent: () =>
      import('./wavelength/wavelength')
        .then(m => (m as any).WavelengthComponent)
  },
  {
    path: 'oops',
    loadComponent: () => import('./oops/components/oops.component').then((m) => m.OopsComponent),
  },
  {
    path: 'guess',
    loadComponent: () => import('./guess/guess').then((m) => m.GuessGuessComponent),
  },
  {
    path: 'preview/:game',
    loadComponent: () => import('./game-preview/game-preview').then((m) => m.GamePreviewComponent),
  },

  {
    path: '**',
    redirectTo: '',
  },

];