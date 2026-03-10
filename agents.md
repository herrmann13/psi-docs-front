# Documentacao do Sistema - psi-docs-front

## 1. Visao geral

O `psi-docs-front` e uma aplicacao web React para gestao de pacientes, agenda de consultas e financeiro (cobrancas e pagamentos) para clinica psicologica.

Principais modulos:

- Autenticacao com Google
- Cadastro e gestao de pacientes
- Agenda de consultas
- Financeiro vinculado a consultas

## 2. Stack tecnica

- React 19
- React Router DOM 7
- Vite (`rolldown-vite`)
- Tailwind CSS 4
- API REST via `fetch`
- Persistencia local de sessao via `localStorage`

## 3. Requisitos de ambiente

- Node.js: **20.19+** (ou 22.12+), devido ao Vite atual
- Bun pode ser usado para executar scripts (`bun run dev`, `bun run build`)

Variaveis de ambiente principais:

- `VITE_API_URL`: URL base da API backend
- `VITE_GOOGLE_CLIENT_ID`: Client ID do Google Identity

## 4. Scripts

Definidos em `package.json`:

- `dev`: sobe ambiente local (`vite`)
- `build`: build de producao
- `lint`: lint do projeto
- `preview`: preview da build

## 5. Estrutura principal

- `src/main.jsx`: bootstrap da app, `AuthProvider`, registro de service worker em producao
- `src/App.jsx`: roteamento, protecao de rotas, topbar/menu mobile e modal de configuracoes
- `src/contexts/AuthContext.jsx`: estado global de autenticacao
- `src/services/api/*`: camada de acesso HTTP
- `src/hooks/usePatients.js`: estado e operacoes de pacientes
- `src/pages/*`: telas da aplicacao

## 6. Autenticacao e sessao

Fluxo:

1. Login via Google Identity (`src/pages/Login.jsx`)
2. Envio do `idToken` para `POST /auth/google`
3. Backend retorna `token` (JWT) e `user`
4. Front salva em `localStorage` e no `AuthContext`

Envio de token:

- Todo request autenticado envia `Authorization: Bearer <token>` em `src/services/api/client.js`.

Tratamento de 401:

- Remove token/user do `localStorage`
- Dispara evento global de logout (`auth:logout`)
- Redirecionamento ocorre pela protecao de rotas

## 7. Roteamento e acesso

Rotas principais (`src/App.jsx`):

- `/login`
- `/` (lista de pacientes)
- `/patient/register`
- `/patient/:id`
- `/patient/:id/edit`
- `/appointments`
- `/finance`

Todas as rotas de negocio usam `RequireAuth`.

## 8. Navegacao e UX global

- Desktop: topbar horizontal com acesso a Pacientes, Agenda e Financeiro
- Mobile: topbar com botao `Menu` e drawer lateral
- Configuracoes do usuario: modal interno (sem `window.prompt`)

## 9. Modulo de pacientes

Arquivos principais:

- `src/pages/PatientListView.jsx`
- `src/pages/PatientRegistrationView.jsx`
- `src/pages/PatientDetailView.jsx`
- `src/hooks/usePatients.js`
- `src/services/api/patients.js`

Funcionalidades:

- Listar pacientes
- Cadastrar e editar paciente
- Importar/exportar pacientes em JSON
- Endereco e contatos de emergencia
- Acoes rapidas de telefone e WhatsApp no detalhe

Observacao:

- Existe cache local de pacientes para suporte a experiencia offline basica (`storage/patients`).

## 10. Modulo de agenda (consultas)

Arquivo principal: `src/pages/AppointmentsView.jsx`

Funcionalidades:

- Calendario mensal
- Listagem de consultas do dia selecionado
- Criacao/edicao via formulario interno
- Atualizacao de status por seletor unico
- Menu de acoes por consulta (editar, reagendar, gerar cobranca, remover)

Formulario de consulta:

- Campos: paciente, data, inicio, fim, valor da sessao
- `fim` e auto preenchido com +1h ao definir `inicio` (editavel)
- `sessionValue` e obrigatorio
- `psychologistId` e preenchido com usuario logado

Status de consulta (constante):

- `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

Mapeamento de exibicao:

- Agendado, Confirmado, Completado, Cancelado, Falta

Reagendamento:

- Motivo via modal interno (sem `window.prompt`)

## 11. Modulo financeiro

Arquivo principal: `src/pages/FinanceView.jsx`

### 11.1 Modelo de operacao

O front esta orientado a `charge` (cobranca vinculada a consulta):

- Listagem de cobrancas
- Inclusao de pagamento por cobranca
- Edicao de valor da cobranca
- Exclusao de cobranca (com regra no backend)

### 11.2 Referencia mensal

- Totais e listagem usam o **mes selecionado**
- Referencia baseada na data do atendimento (`appointment.startTime`)

### 11.3 Criacao de cobranca manual

- Sem digitar ID manualmente
- Seletor de consulta amigavel: `Atendimento DD/MM/AAAA - HH:mm • Nome`
- Nao exibe IDs para usuario final
- Elegibilidade no seletor:
  - inclui consultas com `NO_SHOW`
  - exclui consultas `CANCELLED`
  - bloqueia consultas que ja possuem cobranca ativa (permite se cobranca anterior estiver `CANCELLED`)

### 11.4 Pagamento de cobranca

- Endpoint: `POST /charges/:id/payments`
- Suporta pagamento parcial
- Atualiza status/saldo na UI apos retorno do backend

### 11.5 Edicao e exclusao de cobranca

- Edicao via modal `Editar`
- Campo principal: `originalAmount`
- Botao `Excluir cobranca` no mesmo modal
- Exclusao depende das regras do backend (ex.: nao permitir se houver pagamentos associados)

Status de cobranca (constante):

- `PENDING`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`

## 12. Regras de negocio integradas com backend

### 12.1 Criar consulta

- `POST /appointments`
- Backend cria automaticamente cobranca vinculada
- Front nao precisa chamar `/charges` apos criar consulta

### 12.2 Criar cobranca manual

- `POST /charges`
- Sempre vincula por `appointmentId`
- `originalAmount` opcional

### 12.3 Pagamento de cobranca

- `POST /charges/:id/payments`
- Backend valida saldo e status
- Backend atualiza `outstandingAmount` e status (`PARTIALLY_PAID`/`PAID`)

### 12.4 Editar valor de cobranca

- `PUT /charges/:id` com `originalAmount`
- Backend recalcula saldo e status automaticamente

## 13. Camada de API (resumo)

- `authService.loginWithGoogle(idToken)` -> `POST /auth/google`
- `usersService.updateDefaultSessionValue(id, value)` -> `PATCH /users/:id`
- `patientsService` -> CRUD em `/patients`
- `appointmentsService` -> CRUD em `/appointments`
- `chargesService` -> list/create/update/delete em `/charges`
- `chargesService.addPayment(id, payload)` -> `POST /charges/:id/payments`

## 14. Tratamento de erros e feedback

Padrao atual:

- Extrai `message` e `fieldErrors` do backend
- Exibe popup global interno do sistema com mensagem consolidada
- Lancamento de erro para telas atualizarem estado local quando necessario

Eventos globais de feedback:

- `ui:alert`: abre modal interno de aviso
- `ui:confirm`: abre modal interno de confirmacao

## 15. Service Worker

Em producao (`src/main.jsx`):

- Registra `/sw.js`
- Solicita ativacao imediata de nova versao
- Recarrega pagina ao trocar controller

## 16. Decisoes e convencoes atuais

- Interface em portugues
- Uso de modais internos para fluxos de configuracao/reagendamento
- IDs tecnicos devem ser ocultados para usuario final quando possivel

## 17. Limitacoes conhecidas

- Nao existe sistema central de notificacoes (toast) com fila/variantes
- Alguns endpoints antigos de pagamento/vinculo/anexo permanecem no codigo, mas o fluxo principal atual usa `charges/:id/payments`

## 18. Sugestoes de evolucao

- Criar componente global de `Modal/Confirm/Toast` e remover APIs nativas do browser
- Extrair componentes reutilizaveis de formulario (campos monetarios, data/hora)
- Adicionar testes de integracao para fluxos criticos (consulta -> cobranca -> pagamento)
- Documentar contrato de API com OpenAPI/Swagger para sincronismo front/back

## 19. Regras funcionais obrigatorias (consolidadas)

Esta secao consolida as regras definidas durante os ajustes recentes e deve ser seguida em novos prompts.

### 19.1 Regras globais de UX

- Nao usar `window.prompt` para fluxos do sistema; usar modal interno.
- Nao usar `window.alert` e `window.confirm`; usar popup/modal interno.
- Em mobile, a navegacao principal deve ser drawer lateral (menu interno), nao barra horizontal comprimida.
- Erros vindos do backend devem aparecer em popup com mensagem do backend (incluindo `fieldErrors` quando existir).

### 19.2 Pacientes

- Detalhe do paciente deve exibir data de nascimento somente como data (sem trecho `T00:00:00.000Z`).
- Contatos de emergencia devem listar os contatos associados ao paciente (dinamico), com telefone.
- Cada contato de emergencia deve ter acao rapida de `Ligar` e `WhatsApp` no mesmo padrao do telefone principal.

### 19.3 Agenda

- Botao `Criar consulta` apenas abre formulario; nao pode criar consulta imediatamente.
- Criacao ocorre somente ao salvar formulario.
- Campos obrigatorios de consulta: paciente, data, hora de inicio, hora de fim, valor da sessao.
- Valor da sessao deve iniciar com `user.defaultSessionValue`, podendo ser alterado.
- Ao definir inicio, fim deve ser sugerido automaticamente com +1h (editavel).
- Card da consulta:
  - titulo: `HH:mm - DD/MM/AAAA PrimeiroNome`
  - subtitulo com nome real do paciente
- Consulta no calendario deve mostrar `HH:mm - PrimeiroNome` (nao mostrar `Paciente ID`).
- Listagem abaixo do calendario deve exibir somente consultas do dia selecionado.
- Status devem aparecer em unico seletor no canto esquerdo inferior do card.
- Acoes `Editar`, `Reagendar`, `Gerar cobranca`, `Remover` devem ficar no menu `Opcoes` a direita.
- Cores por status (calendario e card):
  - `SCHEDULED`: branco
  - `CONFIRMED`: verde claro
  - `COMPLETED`: verde mais escuro
  - `CANCELLED`: vermelho
  - `NO_SHOW`: vermelho escuro
- Labels de status exibidos em PT-BR:
  - `SCHEDULED` -> `Agendado`
  - `CONFIRMED` -> `Confirmado`
  - `COMPLETED` -> `Completado`
  - `CANCELLED` -> `Cancelado`
  - `NO_SHOW` -> `Falta`

### 19.4 Financeiro

- Totais e listagem de cobrancas devem considerar o mes selecionado.
- Mes de referencia e definido pela data do atendimento (`appointment.startTime`).
- Card da cobranca:
  - titulo: `Atendimento DD/MM/AAAA - HH:mm`
  - nao exibir IDs tecnicos para usuario final
- Criacao de cobranca manual:
  - nao permitir digitacao manual de `appointmentId`
  - usar seletor de consulta no padrao do sistema (autocomplete/lista interna)
  - opcoes amigaveis: `Atendimento DD/MM/AAAA - HH:mm • Nome`
  - incluir consultas `NO_SHOW`
  - excluir consultas `CANCELLED`
  - ocultar consultas que ja possuem cobranca ativa (permitir quando cobranca anterior estiver `CANCELLED`)
- Edicao de cobranca:
  - acao no card com nome `Editar`
  - modal de edicao deve conter alteracao de valor e opcao de excluir cobranca
  - exclusao deve usar confirmacao em modal interno (nao `window.confirm`)

### 19.5 Integracao backend (fonte de verdade)

- Criar consulta (`POST /appointments`) gera cobranca automaticamente no backend.
- Criar cobranca manual (`POST /charges`) exige `appointmentId`; `originalAmount` opcional.
- Incluir pagamento (`POST /charges/:id/payments`) suporta parcial e atualiza saldo/status.
- Editar valor da cobranca (`PUT /charges/:id` com `originalAmount`) deve refletir recalc de saldo/status do backend.
