<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProdutoController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('auth/eu', [AuthController::class, 'eu']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // Menu do portal e repasse para a área de administrador de cada produto.
    Route::get('produtos', [ProdutoController::class, 'index']);
    Route::any('produtos/{produto}/{caminho}', [ProdutoController::class, 'repassar'])->where('caminho', '.*');
});
