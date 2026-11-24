# Requisitos do PlayerVault

## Visão
Aplicação web para reunir a trajetória gamer do usuário em um perfil visual, independentemente de Steam, consoles, celulares ou emuladores. Cadastro manual primeiro; automação em versões posteriores.

## Escopo implementado (1.1.x)
| ID | Requisito / critério de aceitação |
|---|---|
| RF01 | Cadastro, login e logout; nome de usuário único, 3–24 caracteres; senha de 8–128 caracteres. |
| RF02 | Perfil em `/u/usuario`, público ou privado, com nome de exibição, biografia, avatar, banner e cor; visitantes não podem editar. |
| RF03 | Criar, editar e remover registros de jogos: nome, plataforma, ambiente opcional, capa, tempo em horas/minutos, status e favorito. |
| RF04 | Plataformas padrão: Computador, Mobile, PlayStation, Xbox, Nintendo, Emulador, Outra. Ambiente em texto livre com sugestões e ícones padrão; ícones próprios opcionais por registro. |
| RF05 | Conquistas opcionais por jogo: nome, descrição, estado bloqueado/desbloqueado, imagem própria ou cinco ícones padrão (troféu, medalha, estrela, diamante, coroa). CRUD de conquistas. |
| RF06 | Estatísticas calculadas a partir da biblioteca: jogos únicos, horas, plataformas ordenadas por contagem, total e proporção de conquistas desbloqueadas. |
| RF07 | Biblioteca com pesquisa por nome, filtros de plataforma e status, favoritos. |
| RF08 | Recorte de avatar, banner, capa, conquista e ícones: zoom 1–4x, arraste, posição, prévia, centralização e recorte da imagem atual. |
| RF09 | Cabeçalho com nome, avatar e biografia inteiramente abaixo do banner. |

## Regras de negócio atuais
- Um registro corresponde a um jogo em uma plataforma; total de jogos únicos usa nome normalizado. Contagem por plataforma usa registros, não necessariamente jogos únicos. Tempo total soma minutos de todos os registros.
- Percentual global = conquistas desbloqueadas / conquistas cadastradas × 100. Jogos sem conquistas não entram no denominador. Sem conquistas cadastradas, mostrar traço, não 0%.
- Status: Jogando, Concluído, Completado 100%, Pausado, Abandonado, Pretendo jogar. Status é manual, independente da porcentagem de conquistas. A contagem atual inclui registros de backlog; separar jogos jogados dos planejados é uma decisão futura.
- Excluir jogo remove suas conquistas. Ícone próprio substitui o padrão; removê-lo restaura o padrão. Resumo por plataforma usa o primeiro ícone personalizado encontrado, se houver.
- Recorte salva apenas a região final. Proporções: banner 5:1, capa 3:4, demais 1:1. Arquivo original até 15 MB no frontend, resultado aproximadamente 1 MB; GIF vira imagem estática.

## Requisitos não funcionais
- Interface responsiva, acessível, em pt-BR; cadastro e edição simples; perfil personalizável.
- Persistência SQLite, migrações não destrutivas, testes isolados, código modular e documentado.
- Segurança: hash scrypt com salt, sessão em cookie HttpOnly, consultas parametrizadas, autorização por proprietário, proteção de perfil privado e validação de uploads. Segurança de produção ainda não concluída.
- Desempenho: evitar carregar imagens desnecessariamente; paginação e armazenamento externo são melhorias futuras.

## Fora do MVP / ideias ainda não aprovadas para implementação imediata
Vitrines reorganizáveis, cores secundárias, temas, avaliação pessoal, comentários, datas de início/fim, raridade de conquistas, plataforma de nome livre, catálogo global e integrações externas. Agente desktop para tempo de execução, recursos sociais e sincronização são etapas futuras. Ver ROADMAP.md.
