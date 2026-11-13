<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Verificação em duas etapas pelo app autenticador. As chaves ficam criptografadas com o APP_KEY.
        Schema::table('administradores', function (Blueprint $table) {
            $table->text('totp_chave')->nullable()->after('ativo');      // NULL = desativada
            $table->text('totp_chave_nova')->nullable()->after('totp_chave'); // gerada ao mostrar o QR code, até confirmar
            $table->unsignedBigInteger('totp_passo')->default(0)->after('totp_chave_nova'); // último código aceito (impede reuso)
        });
    }

    public function down(): void
    {
        Schema::table('administradores', function (Blueprint $table) {
            $table->dropColumn(['totp_chave', 'totp_chave_nova', 'totp_passo']);
        });
    }
};
