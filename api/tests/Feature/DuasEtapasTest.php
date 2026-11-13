<?php

namespace Tests\Feature;

use App\Models\Administrador;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DuasEtapasTest extends TestCase
{
    use RefreshDatabase;

    private function admin(?string $chave = null): Administrador
    {
        $admin = Administrador::create(['nome' => 'Adriano', 'email' => 'admin@exemplo.test', 'password' => 'segredo123', 'ativo' => true]);
        if ($chave) {
            $admin->forceFill(['totp_chave' => $chave])->save();
        }

        return $admin;
    }

    private function codigoAgora(string $chave): string
    {
        return Totp::codigo($chave, intdiv(time(), 30));
    }

    public function test_codigo_confere_com_o_padrao_rfc_6238(): void
    {
        // Vetor de teste da RFC 6238 (SHA-1, chave "12345678901234567890"), últimos 6 dígitos.
        $chave = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $this->assertSame('287082', Totp::codigo($chave, intdiv(59, 30)));
        $this->assertSame('005924', Totp::codigo($chave, intdiv(1234567890, 30)));
        $this->assertSame(intdiv(1234567890, 30), Totp::verificar($chave, '005 924', 0, 1234567890));
        $this->assertNull(Totp::verificar($chave, '005924', intdiv(1234567890, 30), 1234567890)); // já usado
        $this->assertSame(32, strlen(Totp::novaChave()));
    }

    public function test_ativar_pelo_qr_code(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $resposta = $this->postJson('/api/auth/duas-etapas/iniciar')->assertOk();
        $chave = $resposta->json('chave');
        $this->assertStringStartsWith('otpauth://totp/ABianchi%20Admin%3Aadmin%40exemplo.test?secret='.$chave, $resposta->json('uri'));

        $this->postJson('/api/auth/duas-etapas/ativar', ['codigo' => '000000'])->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->getJson('/api/auth/eu')->assertJsonPath('admin.duas_etapas', false);

        $this->postJson('/api/auth/duas-etapas/ativar', ['codigo' => $this->codigoAgora($chave)])->assertOk();
        $this->getJson('/api/auth/eu')->assertJsonPath('admin.duas_etapas', true);

        // A chave fica criptografada no banco e nunca aparece nas respostas.
        $this->assertNotSame($chave, $admin->fresh()->getRawOriginal('totp_chave'));
        $this->assertSame($chave, $admin->fresh()->totp_chave);
        $this->getJson('/api/auth/eu')->assertJsonMissingPath('admin.totp_chave');
    }

    public function test_login_com_duas_etapas_pede_o_codigo(): void
    {
        $chave = Totp::novaChave();
        $this->admin($chave);

        $desafio = $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'segredo123'])
            ->assertOk()->assertJsonPath('precisa_codigo', true)->assertJsonMissingPath('token')->json('desafio');

        $this->postJson('/api/auth/codigo', ['desafio' => $desafio, 'codigo' => '000000'])
            ->assertUnprocessable()->assertJsonPath('errors.codigo.0', 'Código inválido. Confira o app autenticador.');

        $codigo = $this->codigoAgora($chave);
        $token = $this->postJson('/api/auth/codigo', ['desafio' => $desafio, 'codigo' => $codigo])
            ->assertOk()->assertJsonPath('admin.duas_etapas', true)->json('token');
        $this->assertNotEmpty($token);

        // O mesmo código não entra duas vezes.
        $this->postJson('/api/auth/codigo', ['desafio' => $desafio, 'codigo' => $codigo])->assertUnprocessable();
    }

    public function test_desafio_expira_e_limita_tentativas(): void
    {
        $chave = Totp::novaChave();
        $this->admin($chave);
        $desafio = $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'segredo123'])->json('desafio');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/codigo', ['desafio' => $desafio, 'codigo' => '000000']);
        }
        $this->postJson('/api/auth/codigo', ['desafio' => $desafio, 'codigo' => $this->codigoAgora($chave)])
            ->assertUnprocessable()->assertJsonPath('errors.codigo.0', 'Tempo esgotado ou tentativas demais. Entre com e-mail e senha de novo.');

        $novo = $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'segredo123'])->json('desafio');
        Carbon::setTestNow(now()->addMinutes(6));
        $this->postJson('/api/auth/codigo', ['desafio' => $novo, 'codigo' => $this->codigoAgora($chave)])->assertUnprocessable();

        $this->postJson('/api/auth/codigo', ['desafio' => 'inventado', 'codigo' => '123456'])->assertUnprocessable();
    }

    public function test_desativar_pede_a_senha(): void
    {
        $admin = $this->admin(Totp::novaChave());
        Sanctum::actingAs($admin);

        $this->postJson('/api/auth/duas-etapas/desativar', ['senha' => 'errada'])->assertUnprocessable()->assertJsonValidationErrors('senha');
        $this->postJson('/api/auth/duas-etapas/desativar', ['senha' => 'segredo123'])->assertOk();

        $this->assertFalse($admin->fresh()->usaDuasEtapas());
    }

    public function test_comando_de_emergencia_desliga(): void
    {
        $admin = $this->admin(Totp::novaChave());

        $this->artisan('admin:desligar-duas-etapas', ['email' => 'admin@exemplo.test'])->assertSuccessful();
        $this->assertFalse($admin->fresh()->usaDuasEtapas());

        $this->postJson('/api/auth/login', ['email' => 'admin@exemplo.test', 'password' => 'segredo123'])->assertJsonPath('admin.nome', 'Adriano');
    }
}
