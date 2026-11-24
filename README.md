# Gamefolio — MVP 1.1.0

Perfil gamer universal, com biblioteca manual, conquistas e estatísticas. Interface responsiva em português, tema escuro e cor personalizável.

## Executar no Windows, Linux ou macOS

1. Instale Node.js 22.13 ou superior (preferencialmente uma versão LTS atual).
2. Extraia o ZIP e abra a pasta `gamefolio` no VS Code.
3. No terminal, execute `npm start`.
4. Acesse http://localhost:3000 e crie uma conta.

Não é necessário `npm install`: o projeto usa apenas módulos nativos do Node, incluindo `node:sqlite`. Em algumas versões do Node aparece um aviso de recurso experimental do SQLite; isso não impede o funcionamento.
O banco é criado automaticamente em `data/gamefolio.sqlite`. Para fazer backup, pare o servidor e copie a pasta data. Para parar, pressione Ctrl+C.

## Recursos

- Cadastro, login, logout, sessões persistentes e senhas com salt + scrypt.
- Perfil com nome, biografia, avatar, banner, cor, visibilidade pública/privada e link `/u/usuario`.
- CRUD de jogos: nome, plataforma, serviço, capa, horas/minutos, status e favorito.
- CRUD de conquistas: nome, descrição, desbloqueio, cinco ícones padrão ou imagem própria.
- Biblioteca com filtros de nome, plataforma e status.
- Estatísticas automáticas: jogos únicos (nome normalizado), tempo total, plataformas por número de registros, conquistas e percentual global.
- Upload de imagens PNG, JPEG, GIF e WebP até 1 MB por imagem; armazenamento em SQLite para simplificar o MVP.

## Decisões técnicas

Frontend HTML/CSS/JavaScript modular, API REST em Node HTTP e SQLite. A stack é propositalmente mais leve que React/Express/PostgreSQL para permitir execução imediata sem dependências externas. A API separa a interface da persistência e pode receber futuramente um frontend React e um banco PostgreSQL.

Cada registro de jogo representa uma plataforma; o mesmo jogo em duas plataformas pode ter dois registros. O total de jogos únicos agrupa pelo nome normalizado (não é um catálogo global). A lista de plataformas conta registros; horas somam todos os registros. A porcentagem divide conquistas desbloqueadas pelo total de conquistas cadastradas; sem conquistas, exibe um traço. A exclusão de um jogo apaga suas conquistas por chave estrangeira.

## Organização

- `server.mjs`: API, autenticação, regras e persistência.
- `public/index.html`: estrutura HTML.
- `public/app.js`: interface e chamadas REST.
- `public/style.css`: layout e estilos responsivos.
- `test/api.test.mjs`: testes de integração da API com banco em memória.

## Testes

Execute `npm test` em outro terminal ou com o servidor parado. Os testes iniciam um servidor isolado e não alteram o banco pessoal.

## Limitações e próximas etapas

Esta é uma versão local de desenvolvimento, não uma implantação de produção. Antes de expor à internet, implementar HTTPS (com `SECURE_COOKIE=1`), limitação de tentativas de login, validação de conteúdo real de imagens, quotas, paginação, recuperação de senha, logs e backups. O servidor escuta apenas 127.0.0.1 por padrão. `HOST`, `PORT` e `DB_PATH` podem ser configurados por variáveis de ambiente.

Futuro: catálogo normalizado, integrações Steam conforme permissões, importação de capas, agente desktop autorizado para medir sessões, vitrines reorganizáveis e temas avançados. Nenhum monitoramento de executáveis ou integração externa ocorre nesta versão.

## Atualização 1.1.0

- Editor de imagens integrado: selecione um arquivo de até 15 MB, arraste a imagem e ajuste o zoom (1x–4x) e a posição horizontal/vertical. A prévia mostra o enquadramento salvo. O resultado é comprimido no navegador e limitado a aproximadamente 1 MB. GIFs são convertidos para imagem estática. O recorte salva somente a área selecionada; para recuperar partes descartadas, envie novamente o original.
- Proporções: avatar e conquistas 1:1, banner 5:1, capas 3:4, ícones 1:1. A opção de recortar a imagem atual reutiliza apenas os pixels já armazenados.
- Ícones padrão vetoriais para plataformas e ambientes, com sugestões de ambientes no formulário. Os ícones personalizados são opcionais e armazenados por registro de jogo; remover o personalizado restaura o ícone padrão. O resumo por plataforma utiliza o primeiro ícone personalizado encontrado nessa plataforma, se houver.
- Cabeçalho sem sobreposição: avatar, nome, biografia e ações ficam abaixo do banner.

### Atualizar uma instalação existente

1. Encerre o servidor (`Ctrl+C`). Faça backup da pasta `data` (incluindo `gamefolio.sqlite`).
2. Extraia o ZIP e substitua os arquivos do projeto, mantendo a pasta `data` original. Não há banco de dados no ZIP.
3. Execute `npm start`. A migração adiciona duas colunas à tabela `games` automaticamente, sem excluir os dados existentes.
4. Se necessário, atualize o navegador com `Ctrl+F5`.

### Validação

`npm test` cobre o fluxo anterior e a persistência/remoção/validação dos ícones personalizados. O teste de sintaxe do frontend também foi executado. O teste interativo do navegador não pôde ser concluído neste ambiente devido ao bloqueio de navegação local do Chromium; valide o recorte e a apresentação visual localmente.
