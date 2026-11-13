# Portal Admin — ABianchi Tech

Área única do administrador para todos os SaaS da ABianchi Tech: `https://app.abianchitech.com/saas/admin`.
Um login só; no menu aparece cada produto (Barbearia, e depois Clínica etc.) com os clientes, contratos e prazos de acesso.

| Pasta | O que é |
|---|---|
| `api/` | Laravel 13: login dos administradores e repasse para a área de administrador de cada produto |
| `web/` | Angular 22: telas do portal (início, e as telas de cada produto em `src/app/paginas/<produto>/`) |
| `servidor/` | `index.php` e `.htaccess` da pasta pública na HostGator (enviados pela publicação automática) |

## Onde paramos

- **13/11/2026 — primeira versão.** Portal com login próprio, tela inicial (números de cada produto e lista
  "Pedem atenção" com vencendo, carência, bloqueados e suspensos de todos os produtos) e a Barbearia completa
  (lista, nova barbearia com contrato, detalhe, renovar, suspender, reativar, nova senha do dono, baixar contrato).
  Nenhuma mudança no sistema da Barbearia. Testes: 12 da API e 3 do painel.
- Testado de ponta a ponta no PC, com a Barbearia local: cadastro com contrato anexado, senha provisória do dono,
  download do contrato e erros de validação vindos da Barbearia.

- **13/11/2026 — no ar** em `https://app.abianchitech.com/saas/admin`, publicado pelo GitHub Actions
  (repositório `AdrianoBianchiCros/saas-admin`). A primeira publicação revelou que o workflow da Barbearia supunha o
  sistema já instalado; aqui ele cria `bootstrap/cache` e `storage` e tolera o `artisan` ausente na primeira vez.

## O que falta

- ⬜ Criar o seu administrador no servidor (`admin:criar`, passo 6 abaixo) e testar a Barbearia pelo portal no navegador.
- ⬜ Deixar o repositório `saas-admin` privado (está público).
- ⬜ Clínica: quando o SaaS existir, incluir em `api/config/produtos.php`, criar `web/src/app/paginas/clinica/`,
  as rotas em `app.routes.ts` e a linha em `clientesPorProduto` (`paginas/inicio.ts`).
- ⬜ Desativar o `/painel/admin` antigo da Barbearia (redirecionar para o portal) quando o portal estiver no ar.
- ⬜ Tela para ver o registro de ações (`registros`): hoje só fica gravado no banco.

## Como funciona

```
Navegador ──► /saas/admin/api/produtos/barbearia/barbearias ──► Portal (confere o login do administrador)
                                                                  │  entra com a conta de serviço
                                                                  ▼
                                    /saas/barbearia/api/admin/barbearias  (API que a Barbearia já tem)
```

- Os **dados ficam em cada produto** (banco e regras de prazo e bloqueio da Barbearia continuam na Barbearia).
  O portal guarda só os administradores, o token das contas de serviço (em cache) e o registro de ações.
- **Conta de serviço:** em cada produto existe um administrador criado para o portal (`php artisan admin:criar` no
  produto). O e-mail e a senha dela ficam no `.env` do portal. O portal entra com ela, guarda o token e entra de novo
  sozinho quando o token expira.
- No produto, as ações aparecem como feitas pela conta de serviço ("Registrado por" na Barbearia). Quem foi de fato
  fica na tabela `registros` do portal (administrador, produto, ação e resultado).
- O portal só repassa para `/api/admin/...` do produto e nunca para `auth/` (o login do produto é só dele).

### Incluir um produto novo (ex.: Clínica)

1. No produto: ter a API de administrador em `/api/admin/...` (mesmo modelo da Barbearia) e criar a conta de serviço:
   `php artisan admin:criar portal@abianchitech.com "Portal Admin"`.
2. `api/config/produtos.php`: novo bloco com `nome`, `url`, `email`, `senha` lendo do `.env` (`CLINICA_URL`,
   `CLINICA_ADMIN_EMAIL`, `CLINICA_ADMIN_SENHA`). Produto sem `url` não aparece no menu.
3. `web/src/app/paginas/clinica/`: serviço apontando para `${environment.apiUrl}/produtos/clinica` e as telas.
4. Rotas em `web/src/app/app.routes.ts` (caminho = chave do produto) e a linha em `clientesPorProduto` de `paginas/inicio.ts`.

## Rodar no PC

```powershell
# API do portal (porta 8001)
cd api
composer.ps1 install
copy .env.example .env      # BARBEARIA_URL=http://localhost:8000 e a conta de serviço da Barbearia local
php artisan key:generate
php artisan migrate --seed  # administrador admin@demo.test / demo1234
php artisan serve --port=8001

# Barbearia (porta 8000), na pasta dela: php artisan serve
# Na Barbearia local a conta de serviço pode ser o admin@demo.test / demo1234 dela.

# Painel do portal (porta 4201)
cd web
npm ci
npx ng serve                # http://localhost:4201
```

Testes: `cd api; php artisan test` e `cd web; npx ng test --watch=false`.

## Publicação (HostGator)

| Endereço | O que é |
|---|---|
| `app.abianchitech.com/saas/admin` | Telas do portal (Angular) |
| `app.abianchitech.com/saas/admin/api` | API do portal |
| `app.abianchitech.com/saas/admin/up` | Conferência de que está no ar |

| Pasta no servidor (`/home4/adri0667`) | Conteúdo |
|---|---|
| `saas/admin` | Laravel (código, `vendor`, `.env`), fora da pasta pública |
| `app.abianchitech.com/saas/admin` | Painel compilado + `servidor/index.php` + `servidor/.htaccess` |

O `.htaccess` manda `/api` e `/up` para o Laravel e o resto para o painel. Não precisa de link `storage`
(o portal não guarda arquivos: o contrato vai direto para a Barbearia) nem de cron (não há tarefas agendadas nem fila).

### Publicação automática (GitHub Actions)

`.github/workflows/publicar.yml` é o mesmo da Barbearia, com os caminhos de `/saas/admin`: a cada push na `main` roda os
testes, monta o Laravel e o painel, põe em manutenção, envia por rsync, roda as migrations e confere `/up`.
Enquanto a variável `PUBLICAR_AUTOMATICO` não for `true`, o push só roda os testes.

**Secrets do repositório** (Settings › Secrets and variables › Actions), **os mesmos valores da Barbearia**:
`SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`. **Variable:** `PUBLICAR_AUTOMATICO` = `true`.
O workflow usa o environment `producao` (é criado sozinho na primeira execução).

### Primeira instalação no servidor (uma vez)

1. **Banco MySQL** (cPanel › Bancos de dados MySQL): criar `adri0667_admin` e dar ao usuário `adri0667_abianchi`
   todos os privilégios nele.
2. **Pastas:** criar `/home4/adri0667/saas/admin` e `/home4/adri0667/app.abianchitech.com/saas/admin`.
3. **Conta de serviço na Barbearia** (Terminal do cPanel ou SSH), anotando a senha que digitar:
   ```
   cd /home4/adri0667/saas/barbearia && /opt/cpanel/ea-php83/root/usr/bin/php artisan admin:criar portal@abianchitech.com "Portal Admin"
   ```
4. **`.env`** em `/home4/adri0667/saas/admin` (a partir do `api/.env.example`):
   - `APP_NAME="Portal Admin"`, `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://app.abianchitech.com/saas/admin`;
   - `APP_KEY`: gerar no PC com `php artisan key:generate --show` e colar;
   - `DB_CONNECTION=mysql`, `DB_HOST=localhost`, `DB_DATABASE=adri0667_admin`, `DB_USERNAME=adri0667_abianchi`,
     `DB_PASSWORD="..."` (**entre aspas**, lição da Barbearia);
   - `FRONTEND_URL=https://app.abianchitech.com`;
   - `BARBEARIA_URL=https://app.abianchitech.com/saas/barbearia`, `BARBEARIA_ADMIN_EMAIL=portal@abianchitech.com`,
     `BARBEARIA_ADMIN_SENHA='...'` (a senha do passo 3, entre aspas simples).
5. **Primeira publicação:** rodar à mão em Actions › Publicar na HostGator › Run workflow. Ela envia o código, o
   `index.php` e o `.htaccess` e roda as migrations.
6. **Seu administrador no portal** (Terminal do cPanel ou SSH; a senha é pedida sem aparecer):
   ```
   cd /home4/adri0667/saas/admin && /opt/cpanel/ea-php83/root/usr/bin/php artisan admin:criar SEU@EMAIL "Seu Nome"
   ```
7. **Conferir:** `https://app.abianchitech.com/saas/admin/up` mostra "Application up"; entrar em
   `https://app.abianchitech.com/saas/admin` e abrir Barbearia.

PHP 8.3 e HTTPS já valem para todo o subdomínio `app` (configurados na Barbearia).
Se o GitHub "não conseguiu abrir conexão", é o firewall da HostGator: Re-run ou esperar 30–60 min.
Depois de mudar o `.env` no servidor, rodar `config:clear` e `config:cache`.
