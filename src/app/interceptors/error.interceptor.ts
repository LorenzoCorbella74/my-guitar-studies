import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message: string;

      switch (error.status) {
        case 0:
          message = 'Nessuna connessione al server.';
          break;
        case 400:
          message = error.error?.message ?? 'Richiesta non valida.';
          break;
        case 401:
          message = 'Non autorizzato. Effettua il login.';
          break;
        case 403:
          message = 'Accesso negato.';
          break;
        case 404:
          message = 'Risorsa non trovata.';
          break;
        case 500:
          message = 'Errore interno del server.';
          break;
        default:
          message = error.error?.message ?? `Errore ${error.status}.`;
      }

      toastService.showToast(message, 'error');
      return throwError(() => error);
    }),
  );
};
