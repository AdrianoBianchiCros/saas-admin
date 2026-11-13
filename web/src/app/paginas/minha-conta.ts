import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AvisoService } from '../core/aviso.service';
import { mensagemDeErro } from '../core/erros';
import { qrDesenho } from '../core/qrcode';
import { SessaoService } from '../core/sessao.service';
import { VerSenha } from '../layout/ver-senha';

/** Configuração do novo app autenticador: QR code, chave para digitar e o desenho do QR. */
interface Configuracao {
  chave: string;
  tamanho: number;
  caminho: string;
}

/** Minha conta: verificação em duas etapas com app autenticador (Google Authenticator, Microsoft Authenticator, Authy). */
@Component({
  selector: 'app-minha-conta',
  imports: [FormsModule, VerSenha],
  styles: `
    .qr-config {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: flex-start;
      margin-top: 16px;
    }
    .qr-config svg {
      width: 200px;
      height: 200px;
      background: #fff;
      border-radius: 8px;
      flex: none;
    }
    .qr-config > div {
      flex: 1;
      min-width: 220px;
    }
    .qr-config ol {
      margin: 0 0 16px;
      padding-left: 20px;
    }
    .chave {
      word-break: break-all;
      user-select: all;
      font-weight: 600;
    }
  `,
  template: `
    <div class="cabecalho-pagina">
      <div>
        <h1>Minha conta</h1>
        <p class="texto-suave">{{ sessao.admin()?.nome }} · {{ sessao.admin()?.email }}</p>
      </div>
    </div>

    <section class="cartao-secao">
      <h2>
        Verificação em duas etapas
        @if (sessao.admin()?.duas_etapas) {
          <span class="etiqueta etiqueta-ok">Ativada</span>
        } @else {
          <span class="etiqueta">Desativada</span>
        }
      </h2>

      @if (erro()) {
        <div class="alerta" role="alert">{{ erro() }}</div>
      }

      @if (sessao.admin()?.duas_etapas) {
        <p class="texto-suave">A cada login, depois da senha, o portal pede o código de 6 dígitos do seu app autenticador.</p>
        <form class="rodape-secao" (ngSubmit)="desativar()">
          <div class="campo">
            <label for="senha-desativar"><span>Sua senha (para desativar)</span></label>
            <div class="campo-senha">
              <input #s id="senha-desativar" type="password" name="senha" [(ngModel)]="senha" autocomplete="current-password" />
              <app-ver-senha [campo]="s" />
            </div>
          </div>
          <button class="botao botao-secundario botao-auto" type="submit" [disabled]="enviando()">Desativar</button>
        </form>
      } @else if (config(); as c) {
        <div class="qr-config">
          <svg [attr.viewBox]="'0 0 ' + c.tamanho + ' ' + c.tamanho" shape-rendering="crispEdges" role="img" aria-label="QR code para o app autenticador">
            <rect [attr.width]="c.tamanho" [attr.height]="c.tamanho" fill="#fff" />
            <path [attr.d]="c.caminho" fill="#000" />
          </svg>
          <div>
            <ol class="texto-suave">
              <li>No app autenticador do celular, toque em adicionar conta e leia o QR code.</li>
              <li>Sem câmera? Escolha "digitar chave" e use: <span class="chave">{{ c.chave }}</span></li>
              <li>Digite abaixo o código de 6 dígitos que aparecer no app.</li>
            </ol>
            <form (ngSubmit)="ativar()">
              <label class="campo">
                <span>Código do app</span>
                <input type="text" name="codigo" [(ngModel)]="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" />
              </label>
              <div class="rodape-secao">
                <button class="botao botao-auto" type="submit" [disabled]="enviando()">Confirmar e ativar</button>
                <button class="botao botao-secundario botao-auto" type="button" (click)="cancelar()">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      } @else {
        <p class="texto-suave">
          Ative para pedir, a cada login, um código do Google Authenticator, Microsoft Authenticator ou Authy.
          Mesmo que alguém descubra sua senha, não entra sem o seu celular.
        </p>
        <div class="rodape-secao">
          <button class="botao botao-auto" type="button" (click)="iniciar()" [disabled]="enviando()">Ativar</button>
        </div>
      }
    </section>
  `,
})
export class MinhaConta {
  protected readonly sessao = inject(SessaoService);
  private readonly aviso = inject(AvisoService);

  protected readonly config = signal<Configuracao | null>(null);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  protected codigo = '';
  protected senha = '';

  iniciar(): void {
    this.executar(this.sessao.iniciarDuasEtapas(), (r) => {
      // Chave em grupos de 4 para facilitar a digitação.
      this.config.set({ chave: r.chave.replace(/(.{4})/g, '$1 ').trim(), ...qrDesenho(r.uri) });
      this.codigo = '';
    });
  }

  ativar(): void {
    const codigo = this.codigo.replace(/\D/g, '');
    if (codigo.length !== 6) {
      this.erro.set('O código tem 6 dígitos.');
      return;
    }
    this.executar(this.sessao.ativarDuasEtapas(codigo), () => {
      this.config.set(null);
      this.aviso.sucesso('Verificação em duas etapas ativada.');
    });
  }

  desativar(): void {
    this.executar(this.sessao.desativarDuasEtapas(this.senha), () => {
      this.senha = '';
      this.aviso.sucesso('Verificação em duas etapas desativada.');
    });
  }

  cancelar(): void {
    this.config.set(null);
    this.erro.set('');
  }

  private executar<T>(chamada: Observable<T>, ok: (r: T) => void): void {
    this.enviando.set(true);
    this.erro.set('');
    chamada.subscribe({
      next: (r) => {
        this.enviando.set(false);
        ok(r);
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}
