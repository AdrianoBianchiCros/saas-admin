<?php

namespace Tests\Feature;

use App\Models\Administrador;
use App\Models\Registro;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as RequisicaoProduto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['produtos' => [
            'barbearia' => ['nome' => 'Barbearia', 'url' => 'https://exemplo.test/saas/barbearia', 'email' => 'portal@exemplo.test', 'senha' => 'servico123'],
            'clinica' => ['nome' => 'Clínica', 'url' => null, 'email' => null, 'senha' => null],
        ]]);
    }

    private function logar(): Administrador
    {
        $admin = Administrador::create(['nome' => 'Adriano', 'email' => 'admin@exemplo.test', 'password' => 'segredo123', 'ativo' => true]);
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_login_do_administrador(): void
    {
        Administrador::create(['nome' => 'Adriano', 'email' => 'admin@exemplo.test', 'password' => 'segredo123', 'ativo' => true]);

        $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'errada'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $token = $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'segredo123'])
            ->assertOk()->assertJsonPath('admin.nome', 'Adriano')->json('token');

        $this->withToken($token)->getJson('/api/produtos')->assertOk();
    }

    public function test_administrador_inativo_nao_entra(): void
    {
        Administrador::create(['nome' => 'Ex', 'email' => 'ex@exemplo.test', 'password' => 'segredo123', 'ativo' => false]);

        $this->postJson('/api/auth/login', ['email' => 'ex@exemplo.test', 'password' => 'segredo123'])
            ->assertUnprocessable();
    }

    public function test_sem_login_nao_acessa(): void
    {
        $this->getJson('/api/produtos')->assertUnauthorized();
        $this->getJson('/api/produtos/barbearia/barbearias')->assertUnauthorized();
    }

    public function test_menu_mostra_so_produtos_configurados(): void
    {
        $this->logar();

        $this->getJson('/api/produtos')
            ->assertOk()
            ->assertExactJson(['produtos' => [['chave' => 'barbearia', 'nome' => 'Barbearia']]]);
    }

    public function test_repassa_para_o_produto_com_a_conta_de_servico(): void
    {
        $this->logar();
        Http::fake([
            'exemplo.test/saas/barbearia/api/admin/auth/login' => Http::response(['token' => 'tok-1']),
            'exemplo.test/saas/barbearia/api/admin/barbearias*' => Http::response(['barbearias' => [['id' => 1, 'nome' => 'Barbearia do Zé']]]),
        ]);

        $this->getJson('/api/produtos/barbearia/barbearias?busca=ze')
            ->assertOk()->assertJsonPath('barbearias.0.nome', 'Barbearia do Zé');
        $this->getJson('/api/produtos/barbearia/barbearias')->assertOk();

        Http::assertSent(fn (RequisicaoProduto $r) => $r->url() === 'https://exemplo.test/saas/barbearia/api/admin/auth/login'
            && $r['email'] === 'portal@exemplo.test' && $r['password'] === 'servico123');
        Http::assertSent(fn (RequisicaoProduto $r) => str_contains($r->url(), '/api/admin/barbearias?busca=ze')
            && $r->hasHeader('Authorization', 'Bearer tok-1'));

        // O token fica guardado: entrou no produto uma vez só.
        Http::assertSentCount(3);
        $this->assertSame(0, Registro::count()); // consultas não entram no registro
    }

    public function test_token_expirado_no_produto_entra_de_novo(): void
    {
        $this->logar();
        Http::fake([
            '*/api/admin/auth/login' => Http::sequence()->push(['token' => 'velho'])->push(['token' => 'novo']),
            '*/api/admin/barbearias' => function (RequisicaoProduto $r) {
                return $r->hasHeader('Authorization', 'Bearer novo')
                    ? Http::response(['barbearias' => []])
                    : Http::response(['message' => 'Unauthenticated.'], 401);
            },
        ]);

        $this->getJson('/api/produtos/barbearia/barbearias')->assertOk()->assertJsonPath('barbearias', []);
    }

    public function test_cadastro_com_contrato_segue_como_multipart_e_fica_registrado(): void
    {
        $admin = $this->logar();
        Http::fake([
            '*/api/admin/auth/login' => Http::response(['token' => 'tok']),
            '*/api/admin/barbearias' => Http::response(['acesso' => ['email' => 'ze@exemplo.test', 'senha_provisoria' => 'Abc12345']], 201),
        ]);

        $this->post('/api/produtos/barbearia/barbearias', [
            'nome' => 'Barbearia do Zé',
            'dono_email' => 'ze@exemplo.test',
            'contrato' => UploadedFile::fake()->create('contrato.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('acesso.senha_provisoria', 'Abc12345');

        Http::assertSent(fn (RequisicaoProduto $r) => str_ends_with($r->url(), '/api/admin/barbearias')
            && $r->isMultipart()
            && collect($r->data())->contains(fn ($campo) => $campo['name'] === 'contrato' && $campo['filename'] === 'contrato.pdf')
            && collect($r->data())->contains(fn ($campo) => $campo['name'] === 'nome' && $campo['contents'] === 'Barbearia do Zé'));

        $this->assertDatabaseHas('registros', [
            'administrador_id' => $admin->id, 'produto' => 'barbearia', 'metodo' => 'POST', 'caminho' => 'barbearias', 'status' => 201,
        ]);
    }

    public function test_erros_de_validacao_do_produto_chegam_ao_portal(): void
    {
        $this->logar();
        Http::fake([
            '*/api/admin/auth/login' => Http::response(['token' => 'tok']),
            '*/api/admin/barbearias' => Http::response(['message' => 'O e-mail do dono já está em uso.', 'errors' => ['dono_email' => ['O e-mail do dono já está em uso.']]], 422),
        ]);

        $this->postJson('/api/produtos/barbearia/barbearias', ['nome' => 'X'])
            ->assertUnprocessable()->assertJsonValidationErrors('dono_email');
    }

    public function test_download_do_contrato_mantem_o_tipo_do_arquivo(): void
    {
        $this->logar();
        Http::fake([
            '*/api/admin/auth/login' => Http::response(['token' => 'tok']),
            '*/api/admin/assinaturas/7/contrato' => Http::response('%PDF-1.4', 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename=contrato.pdf',
            ]),
        ]);

        $resposta = $this->get('/api/produtos/barbearia/assinaturas/7/contrato')->assertOk();

        $this->assertSame('application/pdf', $resposta->headers->get('Content-Type'));
        $this->assertSame('attachment; filename=contrato.pdf', $resposta->headers->get('Content-Disposition'));
        $this->assertSame('%PDF-1.4', $resposta->getContent());
    }

    public function test_produto_inexistente_ou_caminho_fora_da_area_de_admin(): void
    {
        $this->logar();
        Http::fake();

        $this->getJson('/api/produtos/clinica/clinicas')->assertNotFound();
        $this->getJson('/api/produtos/desconhecido/x')->assertNotFound();
        $this->postJson('/api/produtos/barbearia/auth/logout')->assertNotFound();
        $this->getJson('/api/produtos/barbearia/..%2Fclientes')->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_conta_de_servico_errada_avisa_o_administrador(): void
    {
        $this->logar();
        Http::fake(['*/api/admin/auth/login' => Http::response(['message' => 'E-mail ou senha inválidos.'], 422)]);

        $this->getJson('/api/produtos/barbearia/barbearias')
            ->assertStatus(502)
            ->assertJsonPath('message', 'O portal não conseguiu entrar no sistema Barbearia. Confira a conta de serviço no .env do portal.');
    }

    public function test_comando_cria_administrador(): void
    {
        $this->artisan('admin:criar', ['email' => 'novo@exemplo.test', 'nome' => 'Novo', '--senha' => 'segredo123'])
            ->assertSuccessful();

        $this->assertDatabaseHas('administradores', ['email' => 'novo@exemplo.test', 'ativo' => true]);
    }
}
