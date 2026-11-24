# Começando com Codex no VS Code

1. Se já usa a v1.1, pare o servidor, faça backup de `data/` e copie os arquivos atualizados desta versão (documentação, `package.json`, `server.mjs` e `public/index.html`) para o repositório existente. Não substitua `.git/`, `data/` ou alterações locais. Se estiver começando do zero, extraia o ZIP e abra a pasta playervault.
2. Instale a extensão oficial Codex da OpenAI no VS Code: https://marketplace.visualstudio.com/items?itemname=openai.chatgpt. Abra o painel e entre com sua conta ChatGPT. Conceda acesso ao workspace, sem acesso irrestrito ao computador.
3. Abra uma conversa no Codex com a pasta do projeto aberta. Envie o prompt inicial abaixo.
4. Execute `npm start`, visite http://localhost:3000 e teste mudanças. Use `npm test` para validar a API.

## Primeiro prompt (copie para o Codex)

> Este é o PlayerVault, meu projeto pessoal de perfil gamer universal. Estamos na versão 1.1.1. Leia AGENTS.md, README.md, REQUIREMENTS.md, ARCHITECTURE.md, ROADMAP.md e CHANGELOG.md. Inspecione o código existente, compare com a documentação e execute os testes automatizados. Não modifique arquivos por enquanto. Resuma a arquitetura, as funcionalidades implementadas, as limitações e como dar continuidade ao projeto. Aguarde minha próxima solicitação antes de implementar funcionalidades. Preserve meu banco de dados e minhas alterações locais.

## Fluxo para cada funcionalidade

- Descreva a mudança desejada e os critérios de aceitação no painel do Codex.
- Solicite que preserve o restante do projeto e rode os testes. Revise o diff e teste visualmente.
- Antes de publicar no GitHub, use `git status` e `git diff`. Adicione somente arquivos desejados, faça commit e push após revisão. Nunca envie `data/`, `.env` ou bancos reais.
- Para uma mudança maior, crie uma branch (`git switch -c feat/nome-da-melhoria`). Se houver alterações remotas, sincronize antes de começar sem sobrescrever trabalho local.
- Use uma nova conversa quando necessário: o contexto permanente está nos arquivos versionados, não depende de recuperar o histórico desta conversa.
