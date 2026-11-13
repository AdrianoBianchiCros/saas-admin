<?php

/*
 * Produtos (SaaS) gerenciados pelo portal. Para cada um:
 * - url: endereço do sistema (a API fica em {url}/api/admin);
 * - email/senha: administrador "de serviço" criado no produto com "php artisan admin:criar".
 * Produto sem url no .env não aparece no menu.
 */
return [

    'barbearia' => [
        'nome' => 'Barbearia',
        'url' => env('BARBEARIA_URL'),
        'email' => env('BARBEARIA_ADMIN_EMAIL'),
        'senha' => env('BARBEARIA_ADMIN_SENHA'),
    ],

];
