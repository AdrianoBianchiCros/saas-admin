import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResumoAcesso } from '../../core/acesso';

export interface Opcao {
  valor: string;
  rotulo: string;
}

export interface OpcoesAdmin {
  periodos: Opcao[];
  formas_pagamento: Opcao[];
  carencia_dias: number;
  aviso_dias: number;
}

export interface Assinatura {
  id: number;
  periodo: string;
  inicio: string;
  fim: string;
  forma_pagamento: string;
  valor: string;
  observacao: string | null;
  contrato_nome: string | null;
  tem_contrato: boolean;
  created_at: string;
  administrador: { id: number; nome: string } | null;
}

export interface BarbeariaAdmin {
  id: number;
  nome: string;
  slug: string;
  telefone: string | null;
  documento: string | null;
  ativo: boolean;
  criada_em: string | null;
  acesso: ResumoAcesso;
  dono: { id: number; nome: string; email: string } | null;
  ultima_assinatura: Pick<Assinatura, 'periodo' | 'forma_pagamento' | 'valor' | 'inicio' | 'fim'> | null;
  pagina_url: string;
}

export interface DetalheBarbearia extends BarbeariaAdmin {
  assinaturas: Assinatura[];
  total_usuarios: number;
}

/** Login do dono gerado pelo administrador (a senha provisória aparece uma única vez). */
export interface DadosAcesso {
  email: string;
  senha_provisoria: string;
  painel_url: string;
}

/** O portal repassa estas chamadas para a área de administrador do sistema da Barbearia. */
const API = `${environment.apiUrl}/produtos/barbearia`;

/** Barbearias clientes: cadastro, contrato e prazo de acesso. */
@Injectable({ providedIn: 'root' })
export class BarbeariaService {
  private readonly http = inject(HttpClient);

  opcoes(): Observable<OpcoesAdmin> {
    return this.http.get<OpcoesAdmin>(`${API}/opcoes`);
  }

  barbearias(): Observable<BarbeariaAdmin[]> {
    return this.http.get<{ barbearias: BarbeariaAdmin[] }>(`${API}/barbearias`).pipe(map((r) => r.barbearias));
  }

  barbearia(id: number): Observable<DetalheBarbearia> {
    return this.http.get<DetalheBarbearia>(`${API}/barbearias/${id}`);
  }

  /** Dados em FormData por causa do contrato anexado. */
  criar(dados: FormData): Observable<{ barbearia: BarbeariaAdmin; acesso: DadosAcesso }> {
    return this.http.post<{ barbearia: BarbeariaAdmin; acesso: DadosAcesso }>(`${API}/barbearias`, dados);
  }

  renovar(id: number, dados: FormData): Observable<DetalheBarbearia> {
    return this.http.post<DetalheBarbearia>(`${API}/barbearias/${id}/renovar`, dados);
  }

  suspender(id: number): Observable<DetalheBarbearia> {
    return this.http.post<DetalheBarbearia>(`${API}/barbearias/${id}/suspender`, {});
  }

  reativar(id: number): Observable<DetalheBarbearia> {
    return this.http.post<DetalheBarbearia>(`${API}/barbearias/${id}/reativar`, {});
  }

  novaSenha(id: number): Observable<{ acesso: DadosAcesso }> {
    return this.http.post<{ acesso: DadosAcesso }>(`${API}/barbearias/${id}/nova-senha`, {});
  }

  /** Baixa o contrato com o token (um link direto não levaria a autenticação). */
  contrato(assinaturaId: number): Observable<Blob> {
    return this.http.get(`${API}/assinaturas/${assinaturaId}/contrato`, { responseType: 'blob' });
  }
}
