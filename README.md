# Psi-Docs Front

Sistema web para gestão clínica de psicólogos, com foco em pacientes, agenda e financeiro.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

## O que já foi desenvolvido

### 1) Autenticação e sessão

- Login com Google (`/auth/google`) integrado ao backend.
- Controle de sessão com `AuthContext` e persistência de token/usuário no `localStorage`.
- Rotas protegidas com redirecionamento automático para `/login` quando não autenticado.
- Logout pelo menu e logout automático em respostas `401` da API.
- Configuração do valor padrão da sessão por usuário no topo da aplicação.
- Alternância de tema claro/escuro em Configurações (preferência salva localmente).

### 2) Gestão de pacientes

- Listagem de pacientes com busca por nome.
- Cadastro de paciente com validações e campos de identificação, contato, endereço e contatos de emergência.
- Edição e exclusão de paciente.
- Tela de detalhes com ações rápidas para ligação e WhatsApp.
- Importação e exportação de pacientes em arquivo JSON.
- Cache local dos pacientes para melhorar continuidade de uso quando offline.

### 3) Agenda de consultas

- Visualização em calendário mensal.
- Criação, edição e exclusão de consultas.
- Escolha entre cadastro de consulta única e plano de consultas.
- Criação de plano de consultas com quantidade de sessões e intervalo em dias.
- Pré-visualização automática das consultas do plano com edição individual por item.
- Seleção de paciente por busca (nome/CPF) dentro do formulário da consulta.
- Definição de data, horário inicial/final, status e valor da sessão.
- Reagendamento com registro de motivo.
- Atualização de status da consulta em tempo real (agendada, confirmada, concluída, cancelada, falta).
- Ação para gerar cobrança a partir de uma consulta.

### 4) Financeiro (cobranças e pagamentos)

- Listagem de cobranças por mês de referência.
- Indicadores de total recebido e total pendente no mês.
- Filtros por status e busca textual.
- Criação de cobrança manual a partir de consultas elegíveis.
- Registro de pagamento em cobrança (`chargesService.addPayment`) com método, data e observações.
- Registro de pagamento de plano: seleção de múltiplas cobranças do mesmo plano em um único fluxo visual com envio em lote para o backend.
- Edição do valor da cobrança e exclusão com confirmação.

### 5) Base técnica da aplicação

- Camada HTTP centralizada (`apiClient`) com:
  - injeção automática de Bearer token;
  - normalização de mensagens de erro e `fieldErrors`;
  - alertas globais de erro para o usuário.
- Sistema global de feedback de UI com modais próprios (`showAlert` e `showConfirm`).
- Service Worker e `manifest.webmanifest` para experiência PWA básica e cache de recursos/listagens.

## Stack

- React 19 + React Router DOM 7
- Tailwind CSS 4
- Vite (via `rolldown-vite`)
- JavaScript (sem TypeScript)
- Bun como gerenciador de pacotes e scripts

## Rotas atuais

- `/login` - autenticação
- `/` - lista de pacientes
- `/patient/register` - cadastro de paciente
- `/patient/:id` - detalhe do paciente
- `/patient/:id/edit` - edição do paciente
- `/appointments` - agenda de consultas
- `/finance` - financeiro

## Como executar localmente

```bash
bun install
bun run dev
```

Para validar build e lint:

```bash
bun run build
bun run lint
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```bash
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=seu_client_id_google
```

## Estrutura principal

```text
src/
  App.jsx                   # Rotas, layout e modais globais
  contexts/AuthContext.jsx  # Sessão/autenticação
  hooks/usePatients.js      # CRUD de pacientes + cache local
  pages/                    # Telas (login, pacientes, agenda, financeiro)
  services/api/             # Integração com backend
  storage/                  # Persistência local
  utils/uiFeedback.js       # Alert/confirm via evento customizado
```
