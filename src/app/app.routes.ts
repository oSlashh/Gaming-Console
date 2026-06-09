import { Routes } from '@angular/router';

import { Home2 } from './home2/home2';
import { Login } from './login/login';
import { Registration } from './registration/registration';
import { GamePage } from './game-page/game-page';
import { FlappyBird } from './flappy-bird/flappy-bird';
import { ImagePuzzleComponent } from './puzzle-game/image-puzzle.component';
import { ImagePuzzleInfoComponent } from './puzzle-game/image-puzzle-info.component';

export const routes: Routes = [
  { path: '', component: Home2 },
  { path: 'login', component: Login },
  { path: 'register', component: Registration },
  { path: 'game-page', component: GamePage },
  { path: 'flappy-bird', component: FlappyBird },
  { path: 'image-puzzle-info', component: ImagePuzzleInfoComponent },
  { path: 'image-puzzle', component: ImagePuzzleComponent },
];