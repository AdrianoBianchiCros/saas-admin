import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Administrador {
  id: number;
  nome: string;
  email: string;
  /** Verificação em duas etapas (app autenticador) ligada. */
  duas_etapas: boolean;
}

type RespostaLogin = { token: string; admin: Administrador } | { precisa_codigo: true; desafio: string };

/** Produto (SaaS) configurado no portal. A chave é também o caminho das telas dele (ex.: /barbearia). */
export interface Produto {
  chave: string;
  nome: string;
}

const CHAVE_TOKEN = 'portal.token';
const API = environment.apiUrl;

/** Login do administrador no portal e lista de produtos do menu. */
@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _admin = signal<Administrador | null>(null);
  readonly admin = this._admin.asReadonly();
  readonly logado = computed(() => this._admin() !== null);

  private readonly _produtos = signal<Produto[]>([]);
  readonly produtos = this._produtos.asReadonly();
  private produtos$?: Observable<Produto[]>;

  get token(): string | null {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  }

  /**
   * Primeira etapa (e-mail e senha). Com a verificação em duas etapas ligada, devolve o desafio
   * para enviar junto com o código do app em entrarComCodigo(); senão, já entra.
   */
  login(email: string, password: string): Observable<{ admin: Administrador } | { desafio: string }> {
    return this.http.post<RespostaLogin>(`${API}/auth/login`, { email, password }).pipe(
      map((r) => ('desafio' in r ? { desafio: r.desafio } : { admin: this.guardar(r) })),
    );
  }

  /** Segunda etapa: código de 6 dígitos do app autenticador. */
  entrarComCodigo(desafio: string, codigo: string): Observable<Administrador> {
    return this.http
      .post<{ token: string; admin: Administrador }>(`${API}/auth/codigo`, { desafio, codigo })
      .pipe(map((r) => this.guardar(r)));
  }

  /** Gera a chave nova e o endereço que vai no QR code. */
  iniciarDuasEtapas(): Observable<{ chave: string; uri: string }> {
    return this.http.post<{ chave: string; uri: string }>(`${API}/auth/duas-etapas/iniciar`, {});
  }

  ativarDuasEtapas(codigo: string): Observable<unknown> {
    return this.http.post(`${API}/auth/duas-etapas/ativar`, { codigo }).pipe(tap(() => this.marcarDuasEtapas(true)));
  }

  desativarDuasEtapas(senha: string): Observable<unknown> {
    return this.http.post(`${API}/auth/duas-etapas/desativar`, { senha }).pipe(tap(() => this.marcarDuasEtapas(false)));
  }

  private marcarDuasEtapas(ligada: boolean): void {
    this._admin.update((a) => (a ? { ...a, duas_etapas: ligada } : a));
  }

  private guardar(r: { token: string; admin: Administrador }): Administrador {
    try {
      localStorage.setItem(CHAVE_TOKEN, r.token);
    } catch {
      // sem armazenamento: a sessão dura até recarregar a página
    }
    this._admin.set(r.admin);
    return r.admin;
  }

  carregarSessao(): Observable<boolean> {
    if (this._admin()) return of(true);
    if (!this.token) return of(false);

    return this.http.get<{ admin: Administrador }>(`${API}/auth/eu`).pipe(
      tap((r) => this._admin.set(r.admin)),
      map(() => true),
      catchError(() => {
        this.limpar();
        return of(false);
      }),
    );
  }

  /** Produtos do menu, buscados uma vez por sessão. */
  produtosCarregados(): Observable<Produto[]> {
    this.produtos$ ??= this.http.get<{ produtos: Produto[] }>(`${API}/produtos`).pipe(
      map((r) => r.produtos),
      tap((p) => this._produtos.set(p)),
      catchError(() => {
        this.produtos$ = undefined;
        return of([]);
      }),
      shareReplay(1),
    );
    return this.produtos$;
  }

  logout(): void {
    const sair = () => {
      this.limpar();
      this.router.navigate(['/login']);
    };
    this.http.post(`${API}/auth/logout`, {}).subscribe({ next: sair, error: sair });
  }

  limpar(): void {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      // armazenamento indisponível: nada a remover
    }
    this._admin.set(null);
    this._produtos.set([]);
    this.produtos$ = undefined;
  }
}
