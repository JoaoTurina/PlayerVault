# Roadmap — planejamento evolutivo

Versões futuras são propostas, não compromissos de prazo. Priorizar a solicitação atual do usuário e não implementar etapas antecipadamente.

| Versão | Objetivo | Estado |
|---|---|---|
| 1.0 | Perfil, biblioteca manual, conquistas, estatísticas | Implementado |
| 1.1 | Recorte, ícones padrão/personalizados, banner sem sobreposição | Implementado |
| 1.1.1 | Documentação para Codex e continuidade | Atual |
| 1.2 | Vitrines, temas, organização do perfil e refinamento visual | Proposto |
| 1.3 | Catálogo de jogos e importação de capas/metadados | Proposto |
| 2.0 | Steam: importação de biblioteca, tempo e conquistas disponíveis | Importação manual implementada |
| 2.1 | Outras plataformas conforme APIs e permissões | Proposto |
| 3.0 | Agente desktop opt-in para sessões de jogo | Proposto |
| 4.0 | Amigos, comparação e atividades sociais | Proposto |

## Backlog técnico
- Testes de autorização entre duas contas, migração de banco legado e testes visuais automatizados.
- Melhorias de acessibilidade, desempenho e consistência de estatísticas (backlog vs. jogos realmente jogados, registros duplicados e jogos multiplataforma).
- Definir identidade estável de jogo e origem dos dados antes de integrar serviços externos. Prevenir duplicação e sobrescrita de edições manuais; sincronização idempotente.
- Antes de publicar: aplicar as proteções descritas em ARCHITECTURE.md.
- Considerar React/TypeScript, Express e PostgreSQL apenas quando houver motivo concreto e plano de migração; não são a stack atual.

## Automação futura
Steam depende das APIs disponíveis, privacidade da conta e termos de uso; não prometer acesso a todos os dados. Chaves só no servidor. Navegador não pode monitorar arbitrariamente executáveis locais: criar cliente desktop autorizado, com seleção explícita dos jogos, opção de desativar, registro de início/fim, fila offline e sincronização segura. Não coletar processos não relacionados. Distinguir tempo manual e automático para evitar dupla contagem.
