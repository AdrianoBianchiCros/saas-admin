<?php

namespace App\Http\Controllers;

use App\Models\Administrador;
use App\Support\Totp;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Login do administrador no portal. Com a verificação em duas etapas ativada,
 * a senha certa não entra direto: devolve um desafio e o código do app completa o login.
 */
class AuthController extends Controller
{
    /** Tempo para digitar o código depois da senha. */
    private const MINUTOS_CODIGO = 5;

    /** Tentativas de código por login. */
    private const TENTATIVAS_CODIGO = 5;

    public function login(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [], ['password' => 'senha']);

        $admin = Administrador::where('email', $dados['email'])->first();

        if (! $admin || ! $admin->ativo || ! Hash::check($dados['password'], $admin->password)) {
            throw ValidationException::withMessages(['email' => 'E-mail ou senha inválidos.']);
        }

        if ($admin->usaDuasEtapas()) {
            $desafio = Crypt::encryptString(json_encode([
                'id' => $admin->id,
                'ate' => now()->addMinutes(self::MINUTOS_CODIGO)->timestamp,
            ]));

            return response()->json(['precisa_codigo' => true, 'desafio' => $desafio]);
        }

        return $this->entrar($admin);
    }

    /** Segunda etapa: o código de 6 dígitos do app autenticador. */
    public function codigo(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'desafio' => ['required', 'string'],
            'codigo' => ['required', 'string'],
        ], [], ['codigo' => 'código']);

        $expirou = ValidationException::withMessages([
            'codigo' => 'Tempo esgotado ou tentativas demais. Entre com e-mail e senha de novo.',
        ]);

        try {
            $desafio = json_decode(Crypt::decryptString($dados['desafio']), true);
        } catch (DecryptException) {
            throw $expirou;
        }

        $chaveLimite = 'codigo-login:'.sha1($dados['desafio']);
        if (($desafio['ate'] ?? 0) < now()->timestamp || RateLimiter::tooManyAttempts($chaveLimite, self::TENTATIVAS_CODIGO)) {
            throw $expirou;
        }

        $admin = Administrador::find($desafio['id'] ?? 0);
        $passo = $admin?->ativo && $admin->usaDuasEtapas()
            ? Totp::verificar($admin->totp_chave, $dados['codigo'], $admin->totp_passo)
            : null;

        if ($passo === null) {
            RateLimiter::hit($chaveLimite, self::MINUTOS_CODIGO * 60);
            throw ValidationException::withMessages(['codigo' => 'Código inválido. Confira o app autenticador.']);
        }

        $admin->forceFill(['totp_passo' => $passo])->save();
        RateLimiter::clear($chaveLimite);

        return $this->entrar($admin);
    }

    public function eu(Request $request): JsonResponse
    {
        return response()->json(['admin' => $this->dados($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    private function entrar(Administrador $admin): JsonResponse
    {
        $token = $admin->createToken('admin')->plainTextToken;

        return response()->json(['token' => $token, 'admin' => $this->dados($admin)]);
    }

    private function dados(Administrador $admin): array
    {
        return $admin->only(['id', 'nome', 'email']) + ['duas_etapas' => $admin->usaDuasEtapas()];
    }
}
