import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.loading()) {
    return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
  }

  return toObservable(authService.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => authService.isAuthenticated() ? true : router.createUrlTree(['/login'])),
  );
};