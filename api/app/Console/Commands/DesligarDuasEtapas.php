<?php

namespace App\Console\Commands;

use App\Models\Administrador;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Emergência (celular perdido ou trocado): desliga a verificação em duas etapas de um administrador.
 * Ex.: php artisan admin:desligar-duas-etapas voce@abianchitech.com
 */
#[Signature('admin:desligar-duas-etapas {email}')]
#[Description('Desliga a verificação em duas etapas de um administrador (celular perdido)')]
class DesligarDuasEtapas extends Command
{
    public function handle(): int
    {
        $admin = Administrador::where('email', $this->argument('email'))->first();

        if (! $admin) {
            $this->error('Administrador não encontrado.');

            return self::FAILURE;
        }

        $admin->forceFill(['totp_chave' => null, 'totp_chave_nova' => null, 'totp_passo' => 0])->save();
        $this->info('Verificação em duas etapas desligada. Entre só com e-mail e senha e ative de novo em "Minha conta".');

        return self::SUCCESS;
    }
}
