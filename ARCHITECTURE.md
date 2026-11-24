# Arquitetura atual

Monólito leve: navegador (HTML/CSS/JS) → API REST JSON no Node HTTP → SQLite (`node:sqlite`). Sem dependências npm. Node >=22.13. O servidor oferece os arquivos estáticos e a página única para rotas de perfil/login. A interface usa renderização DOM e eventos delegados; não usa React. A API pode servir clientes futuros.

## Arquivos
- `server.mjs`: inicialização do banco, migrações, autenticação, validações, rotas e acesso SQL.
- `public/index.html`: estrutura da página, navegação e diálogo.
- `public/app.js`: chamadas API, renderização, formulários, estatísticas, filtros, editor canvas e ícones SVG.
- `public/style.css`: tema, layout, responsividade e recorte.
- `test/api.test.mjs`: teste de integração com servidor filho, porta dinâmica e banco `:memory:`.

## Modelo real de dados
- `users`: id, username, password (salt:hash), display, bio, avatar, banner, color, private.
- `sessions`: token (hash SHA-256), user_id, expires (timestamp).
- `games`: id, user_id, name, platform, service, minutes, status, cover, favorite, platform_icon, service_icon.
- `achievements`: id, game_id, name, description, icon, image, unlocked.
- Usuário 1:N jogos e sessões; jogo 1:N conquistas. Chaves estrangeiras com exclusão em cascata. Não há tabelas de catálogo, perfis separados ou sessões de jogo ainda.
- Imagens armazenadas como data URLs em TEXT; migração 1.1 adiciona os dois campos de ícones com default vazio.

## Contrato API
| Método | Rota | Acesso / função |
|---|---|---|
| POST | /api/register | Público: cria usuário e sessão |
| POST | /api/login | Público: autentica e cria sessão |
| GET | /api/me | Usuário atual ou null |
| POST | /api/logout | Autenticado: encerra sessão |
| GET | /api/profile/:username | Perfil e jogos públicos ou do dono |
| PUT | /api/profile | Autenticado: atualiza próprio perfil |
| GET, POST | /api/games | Autenticado: lista/cria jogos próprios |
| PUT, DELETE | /api/games/:id | Dono: edita/remove registro |
| POST | /api/games/:id/achievements | Dono: cria conquista |
| PUT, DELETE | /api/games/:id/achievements/:aid | Dono: edita/remove conquista |

Erros JSON `{error: mensagem}`; respostas de mutação geralmente `{ok:true}`. PUT recebe os campos completos; preservar campos não alterados ao editar. Sessões duram sete dias. Configuração: HOST (default 127.0.0.1), PORT (3000), DB_PATH (data/gamefolio.sqlite), SECURE_COOKIE (1 para HTTPS).

## Limitações a tratar antes de produção
Sem rate limiting, recuperação de senha, quotas por usuário, paginação ou validação de assinatura real das imagens. Validação de tamanho/formato data URL não equivale a validar conteúdo. Corpo de requisição limitado a 4.500.000 caracteres; múltiplas imagens grandes podem atingir esse limite. Revisar CSRF, HTTPS, privacidade, backups, logs, expiração/limpeza de sessões e autorização. Não expor o servidor atual diretamente à internet.
