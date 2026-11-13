<?php

namespace App\Http\Controllers;

use App\Models\Registro;
use App\Services\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Produtos gerenciados pelo portal. As telas de cada produto chamam /api/produtos/{produto}/...
 * e o portal repassa para a API de administrador do produto.
 */
class ProdutoController extends Controller
{
    /** Cabeçalhos da resposta do produto que seguem para o navegador (ex.: download do contrato). */
    private const CABECALHOS = ['Content-Type', 'Content-Disposition'];

    public function index(): JsonResponse
    {
        return response()->json([
            'produtos' => collect(Produto::todos())
                ->map(fn (Produto $p) => ['chave' => $p->chave, 'nome' => $p->nome])
                ->values(),
        ]);
    }

    public function repassar(Request $request, string $produto, string $caminho): Response
    {
        $sistema = Produto::encontrar($produto);
        abort_if(! $sistema, 404, 'Produto não encontrado.');

        // Só a área de administrador do produto; o login dele é feito pelo próprio portal.
        abort_unless(preg_match('#^[a-z0-9-]+(/[a-z0-9-]+)*$#', $caminho) && ! str_starts_with($caminho, 'auth/'), 404);

        $resposta = $sistema->repassar($request, $caminho);

        if (! $request->isMethod('GET')) {
            Registro::create([
                'administrador_id' => $request->user()->id,
                'produto' => $sistema->chave,
                'metodo' => $request->method(),
                'caminho' => $caminho,
                'status' => $resposta->status(),
            ]);
        }

        return response($resposta->body(), $resposta->status(), collect(self::CABECALHOS)
            ->mapWithKeys(fn (string $nome) => [$nome => $resposta->header($nome)])
            ->filter()
            ->all());
    }
}
