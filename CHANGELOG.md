# Changelog

## Em desenvolvimento

- Detalhes por jogo com descrição, análise, nota, versões independentes e capturas. Desbloquear registra a data local de hoje.

- Capas Steam na consulta e na biblioteca, imagens de conquistas e datas editáveis, com ordenação cronológica das conquistas desbloqueadas.

- Importação opcional da biblioteca e conquistas Steam, com seleção individual ou em massa e preservação das edições locais.
- Página de conquistas por jogo com indicação da origem Steam.

## 1.1.1
- Renomeia o projeto para PlayerVault na interface, pacote e documentação; mantém o nome interno do banco para compatibilidade.
- Adiciona AGENTS.md, REQUIREMENTS.md, ARCHITECTURE.md, ROADMAP.md e CODEX-QUICKSTART.md.
- Atualiza README e versão do pacote. Nenhuma alteração de lógica ou schema em relação a 1.1.0.

## 1.1.0
- Recorte de imagens no navegador, zoom e arraste, proporções específicas e compressão.
- Ícones padrão e personalizados para plataforma e ambiente, sugestões de ambiente.
- Migração aditiva de `platform_icon` e `service_icon`.
- Nome, avatar e demais informações abaixo do banner.
- Teste de API estendido para persistência, remoção e validação dos ícones.

## 1.0.0
- MVP local com cadastro, login, perfis, jogos, conquistas e estatísticas.
- SQLite, API REST, frontend HTML/CSS/JS e testes de integração.
