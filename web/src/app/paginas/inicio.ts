import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { ResumoAcesso, SITUACOES_ACESSO } from '../core/acesso';
import { mensagemDeErro } from '../core/erros';
import { SessaoService } from '../core/sessao.service';
import { BarbeariaService } from './barbearia/barbearia.service';

/** Cliente de qualquer produto, no formato usado pelo resumo. */
interface Cliente {
  id: number;
  nome: string;
  acesso: ResumoAcesso;
}

interface ResumoProduto {
  chave: string;
  nome: string;
  clientes: Cliente[];
  erro: string;
}

/** Situações que pedem atenção do administrador. */
const ATENCAO = ['vencendo', 'carencia', 'vencida', 'suspensa'];

/** Início do portal: números de cada produto e os clientes que pedem atenção, de todos os produtos juntos. */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="cabecalho-pagina">
      <div>
        <h1>Início</h1>
        <p class="texto-suave">Clientes de todos os sistemas e o prazo de acesso de cada um.</p>
      </div>
    </div>

    @if (carregando()) {
      <div class="vazio">Carregando…</div>
    } @else {
      @for (p of resumos(); track p.chave) {
        <h2>
          <a class="botao-link" [routerLink]="['/', p.chave]">{{ p.nome }}</a>
        </h2>
        @if (p.erro) {
          <div class="alerta" role="alert">{{ p.erro }}</div>
        } @else {
          <div class="indicadores">
            <div class="indicador"><span>Clientes</span><strong>{{ p.clientes.length }}</strong></div>
            <div class="indicador"><span>Em dia</span><strong>{{ contar(p, 'em_dia', 'sem_prazo') }}</strong></div>
            <div class="indicador"><span>Vencendo ou em carência</span><strong>{{ contar(p, 'vencendo', 'carencia') }}</strong></div>
            <div class="indicador" [class.alerta-indicador]="contar(p, 'vencida', 'suspensa') > 0">
              <span>Bloqueados ou suspensos</span><strong>{{ contar(p, 'vencida', 'suspensa') }}</strong>
            </div>
          </div>
        }
      } @empty {
        <div class="vazio">Nenhum sistema configurado no portal.</div>
      }

      <h2>Pedem atenção</h2>
      @if (atencao().length === 0) {
        <div class="vazio">Nenhum cliente vencendo, em carência, bloqueado ou suspenso.</div>
      } @else {
        <div class="tabela-container">
          <table class="tabela">
            <thead><tr><th>Cliente</th><th>Sistema</th><th>Situação</th><th>Vence em</th><th></th></tr></thead>
            <tbody>
              @for (c of atencao(); track c.produto.chave + c.cliente.id) {
                <tr>
                  <td><strong>{{ c.cliente.nome }}</strong></td>
                  <td>{{ c.produto.nome }}</td>
                  <td>
                    <span class="etiqueta" [class]="situacoes[c.cliente.acesso.situacao].classe">{{ situacoes[c.cliente.acesso.situacao].rotulo }}</span>
                  </td>
                  <td>
                    @if (c.cliente.acesso.vence_em) {
                      {{ c.cliente.acesso.vence_em + 'T12:00:00' | date: 'dd/MM/yyyy' }}
                    } @else {
                      —
                    }
                  </td>
                  <td class="acoes"><a class="botao-link" [routerLink]="['/', c.produto.chave, c.cliente.id]">Abrir</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class Inicio implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly barbearia = inject(BarbeariaService);
  protected readonly situacoes = SITUACOES_ACESSO;

  /** Como buscar os clientes de cada produto. Um produto novo entra aqui. */
  private readonly clientesPorProduto: Record<string, () => Observable<Cliente[]>> = {
    barbearia: () => this.barbearia.barbearias(),
  };

  protected readonly resumos = signal<ResumoProduto[]>([]);
  protected readonly carregando = signal(true);

  protected readonly atencao = computed(() =>
    this.resumos()
      .flatMap((p) => p.clientes.filter((c) => ATENCAO.includes(c.acesso.situacao)).map((cliente) => ({ produto: p, cliente })))
      .sort((a, b) => (a.cliente.acesso.dias_restantes ?? -999) - (b.cliente.acesso.dias_restantes ?? -999)),
  );

  ngOnInit(): void {
    this.sessao.produtosCarregados().subscribe((produtos) => {
      const conhecidos = produtos.filter((p) => this.clientesPorProduto[p.chave]);
      if (conhecidos.length === 0) {
        this.carregando.set(false);
        return;
      }
      let pendentes = conhecidos.length;
      for (const p of conhecidos) {
        this.clientesPorProduto[p.chave]()
          .pipe(
            map((clientes) => ({ ...p, clientes, erro: '' })),
            catchError((e) => of({ ...p, clientes: [], erro: mensagemDeErro(e) })),
          )
          .subscribe((resumo) => {
            this.resumos.update((r) => [...r, resumo].sort((a, b) => a.nome.localeCompare(b.nome)));
            if (--pendentes === 0) this.carregando.set(false);
          });
      }
    });
  }

  contar(p: ResumoProduto, ...situacoes: string[]): number {
    return p.clientes.filter((c) => situacoes.includes(c.acesso.situacao)).length;
  }
}
