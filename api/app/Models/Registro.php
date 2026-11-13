<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ação feita por um administrador num produto (cadastro, renovação, suspensão...).
 */
#[Fillable(['administrador_id', 'produto', 'metodo', 'caminho', 'status'])]
class Registro extends Model
{
    const UPDATED_AT = null;

    public function administrador(): BelongsTo
    {
        return $this->belongsTo(Administrador::class);
    }
}
