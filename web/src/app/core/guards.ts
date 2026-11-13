import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessaoService } from './sessao.service';

/** Telas do portal: sem sessão, vai para o login. */
export const exigeLogin: CanActivateFn = () => {
  const sessao = inject(SessaoService);
  const router = inject(Router);
  return sessao.carregarSessao().pipe(map((ok) => ok || router.createUrlTree(['/login'])));
};

/** Login: quem já entrou vai direto para o início. */
export const somenteVisitante: CanActivateFn = () => {
  const sessao = inject(SessaoService);
  const router = inject(Router);
  return sessao.carregarSessao().pipe(map((ok) => (ok ? router.createUrlTree(['/']) : true)));
};
