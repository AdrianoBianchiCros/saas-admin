import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { qrDesenho, qrMatriz } from './core/qrcode';
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
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 'tok', admin: { id: 1, nome: 'Adriano', email: 'admin@exemplo.test', duas_etapas: false } });

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
  it('com duas etapas, a senha devolve o desafio e o código completa o login', () => {
    let resposta: unknown;
    sessao.login('admin@exemplo.test', 'segredo123').subscribe((r) => (resposta = r));
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({ precisa_codigo: true, desafio: 'abc' });

    expect(resposta).toEqual({ desafio: 'abc' });
    expect(sessao.token).toBeNull();

    sessao.entrarComCodigo('abc', '123456').subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/codigo`);
    expect(req.request.body).toEqual({ desafio: 'abc', codigo: '123456' });
    req.flush({ token: 'tok2', admin: { id: 1, nome: 'Adriano', email: 'admin@exemplo.test', duas_etapas: true } });

    expect(sessao.token).toBe('tok2');
    expect(sessao.admin()?.duas_etapas).toBe(true);
  });
});

describe('QR code', () => {
  it('gera a matriz com os três localizadores e o desenho com margem', () => {
    const uri = 'otpauth://totp/ABianchi%20Admin%3Aadriano%40abianchitech.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=ABianchi%20Admin';
    const m = qrMatriz(uri);
    expect(m.length).toBe(49); // versão 8
    // canto do localizador: borda escura, anel claro, centro escuro
    expect([m[0][0], m[1][1], m[3][3]]).toEqual([true, false, true]);
    expect([m[0][48], m[48][0]]).toEqual([true, true]);
    expect(qrDesenho(uri).tamanho).toBe(57);
  });
});
