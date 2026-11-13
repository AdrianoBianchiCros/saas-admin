import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AvisoService } from '../core/aviso.service';
import { PLATAFORMA } from '../core/plataforma';
import { SessaoService } from '../core/sessao.service';

/** Estrutura do portal: barra no topo com um item por produto e o conteúdo. */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topo-admin">
      <a class="topo-admin-marca" routerLink="/">
        <span class="marca-icone">A</span>
        <span><strong>Administração</strong><small>{{ plataforma.nome }}</small></span>
      </a>
      <nav>
        <a routerLink="/" routerLinkActive="ativo" [routerLinkActiveOptions]="{ exact: true }">Início</a>
        @for (p of sessao.produtos(); track p.chave) {
          <a [routerLink]="['/', p.chave]" routerLinkActive="ativo">{{ p.nome }}</a>
        }
      </nav>
      <div class="topo-admin-usuario">
        <small>{{ sessao.admin()?.nome }}</small>
        <a class="botao-link" routerLink="/conta" routerLinkActive="ativo">Minha conta</a>
        <button class="botao botao-secundario botao-auto" type="button" (click)="sessao.logout()">Sair</button>
      </div>
    </header>
    <main class="conteudo conteudo-admin">
      <router-outlet />
    </main>

    @if (aviso.atual(); as a) {
      <div class="aviso" [class.aviso-erro]="a.tipo === 'erro'" role="status">{{ a.texto }}</div>
    }
  `,
})
export class AdminShell implements OnInit {
  protected readonly sessao = inject(SessaoService);
  protected readonly aviso = inject(AvisoService);
  protected readonly plataforma = PLATAFORMA;

  ngOnInit(): void {
    this.sessao.produtosCarregados().subscribe();
  }
}
