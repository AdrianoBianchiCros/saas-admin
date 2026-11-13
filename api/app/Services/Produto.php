<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Conversa com a API de administrador de um produto (Barbearia, Clínica...) usando a conta
 * de serviço configurada em config/produtos.php. O token fica em cache e é renovado quando expira.
 */
class Produto
{
    public function __construct(
        public readonly string $chave,
        public readonly string $nome,
        private readonly string $url,
        private readonly ?string $email,
        private readonly ?string $senha,
    ) {}

    /** Produtos com endereço configurado no .env. */
    public static function todos(): array
    {
        return collect(config('produtos'))
            ->filter(fn (array $p) => filled($p['url'] ?? null))
            ->map(fn (array $p, string $chave) => new self($chave, $p['nome'], rtrim($p['url'], '/'), $p['email'] ?? null, $p['senha'] ?? null))
            ->all();
    }

    public static function encontrar(string $chave): ?self
    {
        return self::todos()[$chave] ?? null;
    }

    /** Repassa a requisição do portal para {url}/api/admin/{caminho}. */
    public function repassar(Request $request, string $caminho): Response
    {
        $resposta = $this->enviar($request, $caminho, $this->token());

        // Token expirado ou revogado no produto: entra de novo e tenta mais uma vez.
        if ($resposta->status() === 401) {
            Cache::forget($this->chaveCache());
            $resposta = $this->enviar($request, $caminho, $this->token());
        }

        return $resposta;
    }

    private function enviar(Request $request, string $caminho, string $token): Response
    {
        $url = "{$this->url}/api/admin/{$caminho}";
        $http = $this->http()->withToken($token);

        try {
            if ($request->isMethod('GET')) {
                return $http->get($url, $request->query());
            }

            $dados = $request->isJson() ? $request->json()->all() : $request->request->all();

            // Arquivos anexados (ex.: contrato) seguem como multipart, junto com os demais campos.
            foreach (Arr::dot($request->allFiles()) as $campo => $arquivo) {
                if ($arquivo instanceof UploadedFile) {
                    $http->attach($campo, fopen($arquivo->getRealPath(), 'r'), $arquivo->getClientOriginalName());
                }
            }

            return $http->send($request->method(), $url, $request->allFiles()
                ? ['multipart' => collect($dados)->map(fn ($valor, $campo) => ['name' => $campo, 'contents' => (string) $valor])->values()->all()]
                : ['json' => $dados]);
        } catch (ConnectionException) {
            throw $this->indisponivel();
        }
    }

    private function token(): string
    {
        return Cache::remember($this->chaveCache(), now()->addDays(6), function () {
            if (blank($this->email) || blank($this->senha)) {
                throw new HttpException(502, "O acesso ao sistema {$this->nome} não está configurado no portal.");
            }

            try {
                $resposta = $this->http()->post("{$this->url}/api/admin/auth/login", [
                    'email' => $this->email,
                    'password' => $this->senha,
                ]);
            } catch (ConnectionException) {
                throw $this->indisponivel();
            }

            if (! $resposta->successful() || blank($resposta->json('token'))) {
                throw new HttpException(502, "O portal não conseguiu entrar no sistema {$this->nome}. Confira a conta de serviço no .env do portal.");
            }

            return $resposta->json('token');
        });
    }

    private function http(): PendingRequest
    {
        return Http::acceptJson()->timeout(30);
    }

    private function chaveCache(): string
    {
        return "produto:{$this->chave}:token";
    }

    private function indisponivel(): HttpException
    {
        return new HttpException(502, "O sistema {$this->nome} não respondeu. Tente novamente em instantes.");
    }
}
