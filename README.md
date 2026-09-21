# GSA Coop · escritório virtual

Primeira implementação do escritório pixel art da **Guimarães Segurança e Automação**. Interface em português, nove salas, dois sócios humanos e treze agentes de IA. Frontend sem framework, API Node.js na Vercel, PostgreSQL no Neon e versionamento/CI preparados para GitHub.

## Estado desta entrega

**Implementado e testado localmente:** mapa com colisões e rotas; autenticação por senha e convites individuais; sessões HttpOnly; presença por WebSocket entre duas instâncias; agenda compartilhada com exclusão de horários sobrepostos no PostgreSQL; tarefas; registros; histórico de agentes; ferramentas de consulta e propostas de tarefas; regras de áudio por zona; personalização da sala dos sócios.

**Ainda não publicado:** não foi criado repositório novo, projeto Vercel ou banco Neon de produção. O conector Vercel retornou `Tool deploy_to_vercel not found`; o navegador solicitou login para criar um repositório no GitHub. As contas e projetos existentes foram somente consultados.

**Ainda não validado em produção:** áudio WebRTC com microfones reais em redes diferentes, roteamento WebSocket da implantação Vercel, respostas de um provedor de IA ativo e renderização/interação em um navegador completo. O navegador de validação não permitiu abrir o arquivo local. O mapa foi renderizado e inspecionado com uma biblioteca Canvas; os fluxos de backend foram testados por HTTP/WebSocket usando PostgreSQL embarcado PGlite.

A prévia `GSA-Coop-Previa.html` funciona separadamente: abra no navegador. Permite explorar o mapa, agenda, tarefas, registros e personalização. Os dados da prévia ficam apenas no armazenamento desse navegador. **Ela não fornece login real, simultaneidade entre dispositivos, áudio ou respostas de IA.** Não há colegas falsos simulando presença nem respostas prontas se passando por IA.

## Ambientes e equipe

| Sala | Ocupantes / agentes | Áudio |
|---|---|---|
| Reunião | Sócios e agenda compartilhada | Todos que entraram no áudio dentro da sala |
| Comercial | Lucas: vendas; Clara: marketing; Lia: redes sociais; Rafael: gerência comercial | Compartilhado na sala |
| Financeiro | Helena: contabilidade; Bruno: análise financeira | Isolado do corredor |
| Executivo | Atlas: assessoria de diretoria; EVA: secretaria executiva | Isolado do corredor |
| Sócios | Vitor e Fabio | Privado na sala; mesas silenciosas |
| Supply Chain | Caio: logística e fornecimento | Compartilhado na sala |
| Operacional | Diego: operação/projetos/técnicos; Nina: manutenção/suporte | Compartilhado na sala |
| RH | Marina: pessoas, folha, benefícios e contratação | Isolado do corredor |
| Segurança do Trabalho | Pedro: apoio preventivo, EPIs e fontes de NRs | Compartilhado na sala |

Os nomes dos agentes são propostas de identidade, não funcionários reais da empresa. Os papéis são agentes de IA com ferramentas limitadas. Não há funcionários ou dados de negócio fictícios pré-cadastrados.

No lounge o áudio depende de proximidade (180 unidades do mapa). Em qualquer sala, uma conversa nunca é encaminhada a outra zona. “Privado” descreve o isolamento do áudio; ambos os sócios podem entrar em todas as salas. As mesas de foco pausam transmissão e escuta. O aplicativo não grava áudio.

## Arquitetura

- `public/`: interface, canvas pixel art, presença e WebRTC no navegador.
- `shared/world.mjs`: mapa, personagens, colisões, rotas e política de áudio, compartilhados com o servidor.
- `api/server.mjs`: servidor HTTP exportado para Vercel Functions; WebSocket em `/api/ws`.
- `server/`: autenticação, repositório PostgreSQL, API, sincronização e execução de agentes.
- `server/schema.sql`: tabelas, índices, restrições e exclusão de reservas concorrentes.
- `tests/`: testes de domínio, segurança e integração de duas instâncias com PostgreSQL compartilhado.
- `.github/workflows/ci.yml`: instalação, sintaxe, testes e build.

Posições são validadas no servidor e persistidas em PostgreSQL. Cada instância consulta o estado compartilhado a cada 200 ms enquanto houver usuários. Isso funciona com duas pessoas conectadas em instâncias Vercel diferentes, sem depender de um `Map` local para a presença global. O cliente suaviza os movimentos e reconecta com espera progressiva. A última aba de um usuário substitui a anterior.

A implementação prioriza uma equipe de **dois sócios**. Atualizações em PostgreSQL têm custo; para uma equipe maior, substitua a distribuição das posições por um broker de pub/sub e mantenha no banco os registros duráveis. Não há garantia de uma taxa específica de quadros ou latência em produção.

WebRTC transporta a voz diretamente entre os participantes. A sinalização passa pelo servidor autenticado e só é aceita para participantes que habilitaram o áudio e estão na mesma zona. A troca de zona fecha as conexões antigas. TURN autenticado é necessário para cobertura confiável de redes restritivas.

## Implantação: GitHub → Vercel → Neon

Pré-requisito: Node.js 22 ou superior, Git e acesso às três contas. Não coloque segredos no Git.

1. Crie um repositório **privado** `gsa-coop` no GitHub e envie esta pasta.
2. Importe o repositório na Vercel. Configuração: framework **Other**, build `npm run build`, saída `dist`, raiz do repositório. Mantenha Fluid Compute ativo para WebSockets. O `vercel.json` já define a função e a região `gru1`.
3. Vincule o projeto local usando `vercel link`. Instale/vincule Neon pelo Marketplace da Vercel, em um projeto exclusivo para este aplicativo. Prefira região São Paulo para acompanhar a função.
4. Configure as variáveis abaixo na Vercel e obtenha-as localmente com `vercel env pull .env.local`. `APP_ORIGIN` precisa ser exatamente a origem HTTPS do aplicativo (sem barra final). Não use domínio curinga nem copie o banco de produção para previews não confiáveis.
5. Gere os convites com `npm run setup:invites`. O arquivo local `.env.invites` recebe modo de acesso restrito, não é versionado e não é sobrescrito pelo comando. Copie cada valor para a variável correspondente na Vercel. Entregue cada convite apenas ao respectivo sócio.
6. Com o projeto vinculado e as variáveis verificadas, execute `npm ci`, `npm run db:migrate`, `npm test` e `npm run build`. As migrações não são executadas a cada requisição nem automaticamente no build.
7. Publique/republique pela integração GitHub–Vercel ou `vercel --prod`. Use a URL HTTPS final.
8. Cada sócio escolhe a própria conta, clica em **Primeiro acesso? Ativar minha conta**, informa seu convite e define uma senha com pelo menos 12 caracteres. Não existe senha padrão. O convite não permite redefinir uma conta já ativada.
9. Depois da ativação dos dois, remova `INVITE_VITOR` e `INVITE_FABIO` da Vercel e do arquivo local de convites. As contas existentes continuam funcionando.

```sh
npm ci
vercel link
vercel env pull .env.local
# Confira os nomes das variáveis sem imprimir valores secretos.
npm run db:migrate
npm test
npm run build
vercel --prod
```

Para desenvolvimento, use uma **branch separada do Neon**, `APP_ORIGIN=http://localhost:3000` e `npm start` após vincular o projeto, verificar as variáveis e migrar esse banco de desenvolvimento.

### Variáveis

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL Neon com TLS, preferencialmente pooled |
| `APP_ORIGIN` | Origem exata para validação de CSRF e WebSocket |
| `INVITE_VITOR`, `INVITE_FABIO` | Convites aleatórios para ativação inicial das duas contas |
| `AI_API_KEY` | Chave privada do provedor de IA compatível com Chat Completions |
| `AI_BASE_URL` | Base HTTPS; padrão `https://api.openai.com/v1` |
| `AI_MODEL` | Modelo com suporte a ferramentas; padrão configurável `gpt-4.1-mini` |
| `TURN_URL` | URLs `turn:`/`turns:` separadas por vírgula, fornecidas pelo seu serviço |
| `TURN_SHARED_SECRET` | Segredo do serviço TURN compatível com credenciais HMAC REST |
| `PORT` | Somente no servidor local; padrão 3000 |

As chaves nunca são expostas no frontend. Para TURN, o backend fornece credenciais temporárias (uma hora) apenas a usuários autenticados. O TURN deve aceitar o formato REST HMAC-SHA1 usado por coturn e outros serviços compatíveis. Um serviço que fornece apenas usuário/senha estáticos exige adaptar `iceConfig`.

Sem IA configurada, os agentes aparecem como **A ativar** e o backend recusa a conversa com erro explícito. Sem TURN, a interface informa a limitação e tenta STUN; isso não garante áudio em redes diferentes. Custos e limites dos serviços externos não foram estimados nem contratados nesta entrega.

## Agentes e dados reais

Os agentes dispõem de:

- `list_records`: consulta de registros do próprio setor; assessoria executiva pode consultar todos.
- `list_tasks`: tarefas do setor, ou da empresa para o executivo.
- `list_meetings`: calendário do coop.
- `analyze_costs`: receitas e despesas registradas, restrito ao financeiro/executivo.
- `propose_task`: proposta para revisão; só o botão de confirmação grava a tarefa.
- `list_safety_sources`: link oficial do Ministério do Trabalho para as NRs.

O histórico é compartilhado pelos sócios por agente. Cada usuário tem limite de 15 solicitações de IA por hora; cada solicitação tem até quatro etapas de modelo. Não há agendamento autônomo de trabalho, navegação web, publicação externa, pagamentos, contratação, envio de e-mail ou integração automática com os outros sistemas da GSA. Essas integrações exigem uma próxima etapa.

A análise financeira é baseada exclusivamente nos valores cadastrados, guardados em centavos. Não presume acesso a bancos, ERP ou contabilidade externa. Registros usados pelo agente são enviados ao provedor de IA configurado.

O agente de segurança apoia planejamento; não certifica ausência de risco nem autoriza serviços. O link oficial não equivale à leitura do texto vigente da NR. Avaliações de campo e validações profissionais continuam necessárias.

## Verificação executada

`npm test` passou com **10 testes**, incluindo uma integração com dois servidores HTTP/WebSocket distintos e o mesmo PostgreSQL embarcado:

- Contas separadas, senhas scrypt, convites, cookies de sessão, logout e origem CSRF.
- Duas sessões presentes e movimento refletido na outra instância.
- Rejeição de teleporte, paredes e coordenadas inválidas.
- Recusa da sinalização WebRTC entre salas diferentes.
- Duas reservas concorrentes: uma criada, outra recusada pela restrição do banco.
- Tarefas compartilhadas e atualização de status por outro sócio.
- Registros financeiros, soma em centavos e ferramentas dos agentes.
- Negação de ferramentas não autorizadas; tarefas propostas sem escrita automática.
- Nove salas alcançáveis; zonas privadas, proximidade e silêncio nas mesas.

Sintaxe e build passaram. A prévia HTML foi verificada sintaticamente; não foi validada em navegador completo nesta sessão. Não execute testes de criação de contas no banco de produção: os testes embarcados são isolados e não usam `DATABASE_URL`.

### Aceite final após publicação

1. Entrar como Vitor e Fabio em dispositivos/redes diferentes; observar deslocamento e reconexão.
2. Habilitar os dois microfones no lounge, afastar-se, entrar na mesma sala e depois em salas distintas. Confirmar silêncio nas mesas de foco e ausência de voz após sair do áudio.
3. Forçar transporte por relay em um ambiente de teste para validar TURN, além do caminho STUN.
4. Reservar o mesmo horário simultaneamente, verificar a recusa de uma reserva e a exibição no outro dispositivo.
5. Cadastrar um custo conhecido; pedir análise ao financeiro e conferir soma e referência aos registros.
6. Pedir uma tarefa à EVA: verificar que ela só aparece no quadro após confirmação.
7. Conferir logs sem senhas/tokens, HTTPS, duração da função e domínio/origem configurados.

## Referências de arquitetura

- [Vercel: WebSockets em Functions](https://vercel.com/docs/functions/websockets) — beta disponível em todos os planos na documentação consultada em 21/09/2026; conexões exigem reconexão e estado compartilhado entre instâncias.
- [Neon: documentação](https://neon.com/docs)
- [Ministério do Trabalho: Normas Regulamentadoras](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/ctpp-nrs/normas-regulamentadoras-nrs)

## Próximas extensões

Backups e recuperação de senha por fluxo verificado; permissões para convidados; acesso de técnicos; importação do catálogo GSA; integração com propostas/projetos; anexos de documentos; geração de relatórios; tarefas recorrentes; busca de documentação atualizada; compartilhamento de tela e salas adicionais. Não estão incluídos nesta versão.
