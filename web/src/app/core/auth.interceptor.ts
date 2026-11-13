import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessaoService } from './sessao.service';

/**
 * Envia o token do administrador nas chamadas à API do portal e volta ao login quando a sessão expira.
 * Erros 403 vindos de um produto (repassados pelo portal) não encerram a sessão do portal.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(SessaoService);
  const router = inject(Router);

  const paraApi = req.url.startsWith(environment.apiUrl);
  const token = sessao.token;
  const requisicao =
    paraApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }) : req;

  return next(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      const doProduto = req.url.startsWith(`${environment.apiUrl}/produtos/`);
      if (paraApi && token && (erro.status === 401 || (erro.status === 403 && !doProduto))) {
        sessao.limpar();
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    }),
  );
};
