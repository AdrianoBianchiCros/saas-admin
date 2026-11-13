<?php

namespace App\Support;

/**
 * Códigos de 6 dígitos de app autenticador (TOTP: Google Authenticator, Microsoft Authenticator, Authy...).
 * Mesmo funcionamento do MiniCRM: passos de 30 segundos, SHA-1, chave em base32.
 */
class Totp
{
    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** Chave nova em base32 (160 bits), para ler no app pelo QR code ou digitar. */
    public static function novaChave(): string
    {
        $bits = '';
        foreach (str_split(random_bytes(20)) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }

        return implode('', array_map(fn ($b) => self::BASE32[bindec(str_pad($b, 5, '0'))], str_split($bits, 5)));
    }

    /** Endereço otpauth:// que vai dentro do QR code. */
    public static function uri(string $conta, string $chave, string $emissor): string
    {
        return 'otpauth://totp/'.rawurlencode($emissor.':'.$conta)
            .'?secret='.$chave.'&issuer='.rawurlencode($emissor);
    }

    public static function codigo(string $chave, int $passo): string
    {
        $h = hash_hmac('sha1', pack('N*', 0, $passo), self::decodificar($chave), true);
        $o = ord($h[19]) & 0xF;
        $n = ((ord($h[$o]) & 0x7F) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]);

        return str_pad((string) ($n % 1000000), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Aceita o código atual e os de 30 s antes/depois (relógio do celular fora de hora).
     * Devolve o passo usado, ou null. $depoisDe impede reusar um código que já entrou.
     */
    public static function verificar(string $chave, string $codigo, int $depoisDe = 0, ?int $agora = null): ?int
    {
        $codigo = preg_replace('/\D/', '', $codigo);
        if (strlen($codigo) !== 6) {
            return null;
        }

        $atual = intdiv($agora ?? time(), 30);
        for ($p = $atual - 1; $p <= $atual + 1; $p++) {
            if ($p > $depoisDe && hash_equals(self::codigo($chave, $p), $codigo)) {
                return $p;
            }
        }

        return null;
    }

    private static function decodificar(string $chave): string
    {
        $bits = '';
        foreach (str_split(strtoupper($chave)) as $c) {
            $i = strpos(self::BASE32, $c);
            if ($i !== false) {
                $bits .= str_pad(decbin($i), 5, '0', STR_PAD_LEFT);
            }
        }

        $saida = '';
        foreach (str_split($bits, 8) as $b) {
            if (strlen($b) === 8) {
                $saida .= chr(bindec($b));
            }
        }

        return $saida;
    }
}
