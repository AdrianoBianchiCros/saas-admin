export type SituacaoAcesso = 'sem_prazo' | 'em_dia' | 'vencendo' | 'carencia' | 'vencida' | 'suspensa';

/** Prazo do acesso pago de um cliente (mesmo formato em todos os produtos). */
export interface ResumoAcesso {
  situacao: SituacaoAcesso;
  vence_em: string | null;
  dias_restantes: number | null;
  bloqueia_em: string | null;
}

/** Rótulos das situações do prazo de acesso. */
export const SITUACOES_ACESSO: Record<SituacaoAcesso, { rotulo: string; classe: string }> = {
  sem_prazo: { rotulo: 'Sem prazo', classe: '' },
  em_dia: { rotulo: 'Em dia', classe: 'etiqueta-ok' },
  vencendo: { rotulo: 'Vencendo', classe: 'etiqueta-alerta' },
  carencia: { rotulo: 'Em carência', classe: 'etiqueta-erro' },
  vencida: { rotulo: 'Bloqueada', classe: 'etiqueta-erro' },
  suspensa: { rotulo: 'Suspensa', classe: 'etiqueta-erro' },
};
