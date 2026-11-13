import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../core/erros';
import { PLATAFORMA } from '../core/plataforma';
import { SessaoService } from '../core/sessao.service';
import { VerSenha } from '../layout/ver-senha';

/** Login do administrador no portal (um acesso para todos os produtos). */
@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, VerSenha],
  template: `
    <main class="tela-acesso">
      <form class="cartao" [formGroup]="form" (ngSubmit)="entrar()" novalidate>
        <h1 class="marca">Administração</h1>
        <p class="subtitulo">Área da {{ plataforma.nome }} para cadastrar clientes e controlar o acesso aos sistemas.</p>

        @if (erro()) {
          <div class="alerta" role="alert">{{ erro() }}</div>
        }

        <label class="campo">
          <span>E-mail</span>
          <input type="email" formControlName="email" autocomplete="username" autofocus />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small class="erro-campo">Informe um e-mail válido.</small>
          }
        </label>

        <div class="campo">
          <label for="senha-admin"><span>Senha</span></label>
          <div class="campo-senha">
            <input #senha id="senha-admin" type="password" formControlName="password" autocomplete="current-password" />
            <app-ver-senha [campo]="senha" />
          </div>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="erro-campo">Informe sua senha.</small>
          }
        </div>

        <button class="botao" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </main>
  `,
})
export class AdminLogin {
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  protected readonly plataforma = PLATAFORMA;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.erro.set('');

    const { email, password } = this.form.getRawValue();
    this.sessao.login(email, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e) => {
        this.erro.set(mensagemDeErro(e));
        this.enviando.set(false);
      },
    });
  }
}
