<?php

namespace Database\Seeders;

use App\Models\Administrador;
use Illuminate\Database\Seeder;

/**
 * Dados de demonstração para desenvolvimento local (não usar em produção).
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Administrador::updateOrCreate(
            ['email' => 'admin@demo.test'],
            ['nome' => 'Administrador Demo', 'password' => 'demo1234', 'ativo' => true],
        );
    }
}
