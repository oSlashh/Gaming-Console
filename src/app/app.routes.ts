import { Routes } from '@angular/router';

import { Home2 } from './home2/home2';
import { Login } from './login/login';
import { Registration } from './registration/registration';

export const routes: Routes = [
  { path: '', component: Home2 },
  { path: 'login', component: Login },
  { path: 'register', component: Registration }
];