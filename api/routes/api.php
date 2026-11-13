<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DuasEtapasController;
use App\Http\Controllers\ProdutoController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('auth/codigo', [AuthController::class, 'codigo'])->middleware('throttle:codigo');

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('auth/eu', [AuthController::class, 'eu']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Verificação em duas etapas (app autenticador) do administrador logado.
    Route::post('auth/duas-etapas/iniciar', [DuasEtapasController::class, 'iniciar']);
    Route::post('auth/duas-etapas/ativar', [DuasEtapasController::class, 'ativar']);
    Route::post('auth/duas-etapas/desativar', [DuasEtapasController::class, 'desativar']);

    // Menu do portal e repasse para a área de administrador de cada produto.
    Route::get('produtos', [ProdutoController::class, 'index']);
    Route::any('produtos/{produto}/{caminho}', [ProdutoController::class, 'repassar'])->where('caminho', '.*');
});
