import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

export const authGuard: CanActivateFn = async () => {

  const authState = inject(AuthStateService);

  const router = inject(Router);

  const user = await authState.getCurrentUser();

  if (user) {
    return true;
  }

  return router.createUrlTree(['/login']);

};