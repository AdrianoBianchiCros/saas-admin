<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Quem fez o quê em cada produto. Nos produtos, as ações aparecem com a conta de serviço do portal.
        Schema::create('registros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('administrador_id')->constrained('administradores');
            $table->string('produto', 40);
            $table->string('metodo', 10);
            $table->string('caminho');
            $table->unsignedSmallInteger('status');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros');
    }
};
