# Psi-Docs

> Sistema de registro e acompanhamento clínico para psicólogos.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

## 📖 Sobre o Projeto

**Psi-Docs** é uma aplicação web focada em facilitar a rotina de psicólogos clínicos. O objetivo é substituir prontuários de papel e planilhas desconexas por uma interface unificada, segura e ágil para o cadastro de pacientes e registro de evoluções terapêuticas.

Atualmente, o projeto foca na construção de uma experiência de usuário (Front-end) fluida e intuitiva, preparando o terreno para futuras integrações com serviços de backend.

### Funcionalidades Principais (Atuais e Planejadas)

- [ ] **Cadastro de Pacientes:** Interface para registro de dados pessoais e de contato.
- [ ] **Listagem de Pacientes:** Visualização rápida e busca de pacientes ativos.
- [ ] **Registro de Sessão:** Editor para anotações de evolução clínica (anamnese e diário).
- [ ] **Histórico:** Linha do tempo com as sessões anteriores.
- [ ] **Responsividade:** Acesso via desktop e tablets.

## Tecnologias Utilizadas

Este projeto foi desenvolvido utilizando as seguintes tecnologias:

* **[React](https://reactjs.org/)** - Biblioteca para construção da interface.
* **[Vite](https://vitejs.dev/)** - Build tool para desenvolvimento rápido.

## Como Executar (Bun)

```bash
bun install
bun run dev
```

## Autenticação (Em Andamento)

- O estado de autenticação é centralizado em `src/contexts/AuthContext.jsx`.
- O token da aplicação será persistido em `localStorage` após o login via backend.
