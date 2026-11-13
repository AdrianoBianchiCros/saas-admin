import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { SessaoService } from './core/sessao.service';

describe('SessaoService', () => {
  let sessao: SessaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    sessao = TestBed.inject(SessaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda o token e o administrador ao entrar', () => {
    sessao.login('admin@exemplo.test', 'segredo123').subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 'tok', admin: { id: 1, nome: 'Adriano', email: 'admin@exemplo.test' } });

    expect(sessao.token).toBe('tok');
    expect(sessao.admin()?.nome).toBe('Adriano');
  });

  it('busca os produtos do menu uma vez só', () => {
    sessao.produtosCarregados().subscribe();
    sessao.produtosCarregados().subscribe();
    http.expectOne(`${environment.apiUrl}/produtos`).flush({ produtos: [{ chave: 'barbearia', nome: 'Barbearia' }] });

    expect(sessao.produtos()).toEqual([{ chave: 'barbearia', nome: 'Barbearia' }]);
  });

  it('limpa a sessão ao sair', () => {
    localStorage.setItem('portal.token', 'tok');
    sessao.limpar();

    expect(sessao.token).toBeNull();
    expect(sessao.produtos()).toEqual([]);
  });
});
