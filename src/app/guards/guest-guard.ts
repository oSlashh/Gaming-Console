import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

export const guestGuard: CanActivateFn = async () => {

  const authState = inject(AuthStateService);

  const router = inject(Router);

  const user = await authState.getCurrentUser();

  if (user) {
  return router.createUrlTree(['/game-hub-phaser']);
  }

  return true;

};