<?php

namespace App\Http\Controllers;

use App\Support\Totp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Ativar e desativar a verificação em duas etapas do administrador logado.
 * Ativar: gera a chave (QR code) e só liga depois que um código do app confere.
 */
class DuasEtapasController extends Controller
{
    /** Nome que aparece na conta dentro do app autenticador. */
    private const EMISSOR = 'ABianchi Admin';

    public function iniciar(Request $request): JsonResponse
    {
        $admin = $request->user();
        $chave = Totp::novaChave();
        $admin->forceFill(['totp_chave_nova' => $chave])->save();

        return response()->json([
            'chave' => $chave,
            'uri' => Totp::uri($admin->email, $chave, self::EMISSOR),
        ]);
    }

    public function ativar(Request $request): JsonResponse
    {
        $dados = $request->validate(['codigo' => ['required', 'string']], [], ['codigo' => 'código']);
        $admin = $request->user();

        if (blank($admin->totp_chave_nova)) {
            throw ValidationException::withMessages(['codigo' => 'Gere o QR code de novo.']);
        }

        $passo = Totp::verificar($admin->totp_chave_nova, $dados['codigo']);
        if ($passo === null) {
            throw ValidationException::withMessages([
                'codigo' => 'Código inválido. Confira se o horário do celular está automático e tente de novo.',
            ]);
        }

        $admin->forceFill(['totp_chave' => $admin->totp_chave_nova, 'totp_chave_nova' => null, 'totp_passo' => $passo])->save();

        return response()->json(['message' => 'Verificação em duas etapas ativada.']);
    }

    public function desativar(Request $request): JsonResponse
    {
        $dados = $request->validate(['senha' => ['required', 'string']]);
        $admin = $request->user();

        if (! Hash::check($dados['senha'], $admin->password)) {
            throw ValidationException::withMessages(['senha' => 'Senha incorreta.']);
        }

        $admin->forceFill(['totp_chave' => null, 'totp_chave_nova' => null, 'totp_passo' => 0])->save();

        return response()->json(['message' => 'Verificação em duas etapas desativada.']);
    }
}
