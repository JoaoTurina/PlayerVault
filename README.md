
# PlayerVault — v1.3.1

Perfil gamer universal, com biblioteca manual, conquistas e estatísticas. Interface responsiva em português, tema escuro e cor personalizável.

## Executar no Windows, Linux ou macOS

1. Instale Node.js 22.13 ou superior (preferencialmente uma versão LTS atual).
2. Extraia o ZIP e abra a pasta `playervault` no VS Code.
3. No terminal, execute `npm start`.
4. Acesse http://localhost:3000 e crie uma conta.

Não é necessário `npm install`: o projeto usa apenas módulos nativos do Node, incluindo `node:sqlite`. Em algumas versões do Node aparece um aviso de recurso experimental do SQLite; isso não impede o funcionamento.
O banco é criado automaticamente em `data/gamefolio.sqlite`. O nome interno do banco foi mantido para preservar a compatibilidade com instalações anteriores do PlayerVault (antigo nome do projeto: Gamefolio). Para fazer backup, pare o servidor e copie a pasta data. Para parar, pressione Ctrl+C.

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

Futuro: catálogo normalizado, importação de capas, agente desktop autorizado para medir sessões, vitrines reorganizáveis e temas avançados.

## Detalhes do jogo

Cada jogo tem uma visão geral com descrição, análise, nota de 0 a 10 e nome da versão, além das abas Conquistas e Capturas. O dono pode duplicar uma versão, copiar a lista de conquistas como bloqueada e excluir versões individualmente. Ao criar uma conquista, é possível escolher as versões que receberão uma cópia independente. O botão **Desbloquear** preenche a data local de hoje, que pode ser alterada depois. Capturas são recortadas em 16:9 e aparecem conforme a visibilidade do perfil.

## Importação da Steam

Obtenha uma [chave da Steam Web API](https://steamcommunity.com/dev/apikey) para esta instalação e configure `STEAM_API_KEY` no ambiente do servidor antes de executar `npm start`. Mantenha a chave fora do Git e do navegador. Consulte os [termos da Valve](https://steamcommunity.com/dev/apiterms). A consulta é para o perfil Steam do próprio usuário, mediante confirmação, e depende de detalhes de jogos e conquistas visíveis para a API.

No perfil PlayerVault, abra **Importar da Steam**, informe o SteamID64 ou o link da Comunidade Steam e consulte a biblioteca. Use **Adicionar todos** ou marque os jogos para **Adicionar somente os que eu escolher**. São gravados jogos, tempo, conquistas retornadas e identificadores de origem no SQLite local. Os dados seguem a visibilidade do perfil PlayerVault. A página **Conquistas** de cada jogo indica quais vieram da Steam. A prévia e a biblioteca mostram a capa da Steam quando disponível. As conquistas importam a imagem e a data quando fornecidas pela Steam. Imagens personalizadas ganham prioridade. Para preencher imagens e datas de jogos já importados, consulte o mesmo perfil novamente e selecione os jogos marcados para atualização. Na página de conquistas, as desbloqueadas aparecem primeiro, da data mais antiga para a mais recente. As desbloqueadas sem data ficam no fim desse grupo. A data é opcional e editável.

A importação é manual. Um AppID já importado na sua conta não é duplicado nem atualizado, e registros manuais são preservados, mesmo se tiverem o mesmo nome. Jogos cujas conquistas estiverem indisponíveis podem ser consultados novamente na importação. Jogos com conquistas indisponíveis ou sem suporte pela Steam podem aparecer sem conquistas. Os dados Steam são fornecidos como estão, sem garantias.

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

## Desenvolvimento com Codex

Abra esta pasta no VS Code e use a extensão oficial Codex (OpenAI). O arquivo `AGENTS.md` contém as instruções do agente; consulte também `REQUIREMENTS.md`, `ROADMAP.md`, `ARCHITECTURE.md` e `CHANGELOG.md`. Veja `CODEX-QUICKSTART.md` para o primeiro prompt e fluxo Git. A versão 1.1.1 altera somente a documentação e a versão do pacote.
