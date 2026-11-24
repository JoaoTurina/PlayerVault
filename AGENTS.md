# PlayerVault — instruções para agentes de desenvolvimento

## Missão
Construir um perfil gamer universal, visualmente personalizável, que centraliza jogos, tempo e conquistas de várias plataformas. O perfil compartilhável é o produto principal; a biblioteca alimenta o perfil. Interface em português brasileiro. Preserve a identidade visual escura e a personalização escolhida pelo usuário.

## Antes de editar
- Leia README.md, REQUIREMENTS.md, ARCHITECTURE.md, ROADMAP.md e CHANGELOG.md; inspecione os arquivos reais. O código é a fonte de verdade sobre o comportamento atual. Não trate planos futuros como já implementados.
- Verifique `git status --short` se houver repositório; preserve alterações do usuário. Faça mudanças pequenas, focadas e compatíveis com a versão anterior. Não faça uma reescrita ou migração de stack sem solicitação explícita.
- Use Node.js >=22.13, módulos nativos, SQLite, HTML/CSS/JS e API REST. Não instale dependências sem justificativa e aprovação quando necessário.

## Regras de implementação
- Não apagar, substituir, publicar ou usar `data/` e bancos reais em testes. Migrações devem ser aditivas, idempotentes e preservar registros; para mudanças destrutivas, peça aprovação e recomende backup com servidor parado.
- Valide entradas no servidor, use parâmetros SQL, verifique propriedade dos registros em toda mutação e preserve a privacidade dos perfis. Nunca exponha senhas, hashes, tokens, chaves ou dados privados. Escape dados do usuário ao renderizar HTML; preserve CSP e cookies seguros. Não desative controles de segurança para contornar bugs.
- Mantenha a API compatível quando possível. Tempo em minutos inteiros não negativos. Imagens personalizadas devem continuar opcionais, com recorte apropriado e fallback. Banner separado do avatar, nome e biografia. Não introduza monitoramento de processos ou integração externa sem pedido e consentimento explícito.
- Preserve responsividade, navegação por teclado, rótulos acessíveis e mensagens de erro em português. Prefira funções pequenas, nomes claros, CSS reutilizável e comentários apenas onde explicam decisões.
- Não faça commit, push, merge, deploy ou altere configurações externas sem pedido explícito. Não inclua segredos ou arquivos pessoais no Git.

## Validação obrigatória
1. Execute `npm test` (banco em memória). Execute `node --check server.mjs` e `node --check public/app.js`.
2. Adicione testes de regressão para regras de negócio alteradas; verifique autorização com contas distintas quando pertinente.
3. Para mudanças visuais, valide no navegador com banco descartável, em desktop e mobile, incluindo estados vazios, erros e recorte. Se não houver navegador, indique claramente o que não foi testado.
4. Revise o diff e atualize documentação e changelog conforme o escopo. Só incremente a versão quando estiver preparando uma release.
5. Responda em português, indicando alterações, arquivos, testes efetivamente executados, limitações e passos manuais. Não alegue sucesso em testes não executados.
