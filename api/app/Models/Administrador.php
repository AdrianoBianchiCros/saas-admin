<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Administrador da plataforma (ABianchi Tech): entra no portal e gerencia os clientes
 * de todos os produtos (Barbearia, Clínica...). Criado pelo comando "php artisan admin:criar".
 */
#[Fillable(['nome', 'email', 'password', 'ativo'])]
#[Hidden(['password', 'totp_chave', 'totp_chave_nova'])]
class Administrador extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'administradores';

    public function usaDuasEtapas(): bool
    {
        return filled($this->totp_chave);
    }

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ativo' => 'boolean',
            'totp_chave' => 'encrypted',
            'totp_chave_nova' => 'encrypted',
            'totp_passo' => 'integer',
        ];
    }
}
