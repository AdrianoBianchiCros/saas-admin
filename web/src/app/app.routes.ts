import { Routes } from '@angular/router';
import { exigeLogin, somenteVisitante } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [somenteVisitante],
    title: 'Entrar | Administração',
    loadComponent: () => import('./paginas/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: '',
    canActivate: [exigeLogin],
    loadComponent: () => import('./paginas/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Início | Administração',
        loadComponent: () => import('./paginas/inicio').then((m) => m.Inicio),
      },
      // Barbearia: barbearias clientes, contrato e prazo de acesso.
      {
        path: 'barbearia',
        title: 'Barbearias | Administração',
        loadComponent: () => import('./paginas/barbearia/barbearias').then((m) => m.AdminBarbearias),
      },
      {
        path: 'barbearia/nova',
        title: 'Nova barbearia | Administração',
        loadComponent: () => import('./paginas/barbearia/nova-barbearia').then((m) => m.NovaBarbearia),
      },
      {
        path: 'barbearia/:id',
        title: 'Barbearia | Administração',
        loadComponent: () => import('./paginas/barbearia/barbearia-detalhe').then((m) => m.BarbeariaDetalhe),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
