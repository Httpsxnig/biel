# Alta RJ • Lotus Group — Discord Bot

![Node](https://img.shields.io/badge/node-20%2B-339933)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)
![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)
![Status](https://img.shields.io/badge/status-active-success)

Bot oficial da **Alta RJ • Lotus Group**, escrito em **TypeScript** e estruturado para ser **modular, escalável e pronto para produção**.

Maintained by **@richthe**  
GitHub: https://github.com/Httpsxnig

---

## Overview

Este repositório contém a base técnica do bot Discord da Alta RJ • Lotus Group, com foco em:

- escalabilidade
- módulos desacoplados
- separação de responsabilidades
- testes futuros
- manutenção e evolução contínua

É recomendado para projetos de médio a grande porte com lógica avançada e integração com serviços externos.

---

## Features

- **Slash Commands** com tipagem forte
- Responders para botões, modais e selects
- Eventos desacoplados
- Organização por domínio
- Build otimizada para produção
- Hot reload em ambiente de desenvolvimento
- Infraestrutura para integração com APIs serviços externos

---

## Technical Requirements

- Node.js >= **20.12**
- npm / pnpm / yarn
- Discord app credentials

---
Framework original:  
https://github.com/rinckodev/constatic  

Documentação oficial:  
https://constatic-docs.vercel.app/docs/discord/start

## Installation & Setup

Clone o repositório:

```bash
git clone https://github.com/Httpsxnig/<repo-name>
cd <repo-name>
npm install
----------

DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
-------------------

npm run dev      # Desenvolvimento com hot reload
npm run build    # Compilação TypeScript
npm run watch    # Watch mode
npm run start    # Executar compilado
npm run lint     # Linter

## Framework Credits

Este projeto utiliza a arquitetura base fornecida pelo **Constant (Constatic CLI)** como estrutura fundamental.

Todos os créditos referentes à arquitetura base pertencem ao autor original.

Customizações, módulos internos e manutenção foram realizados por **@richthe** para a **Alta RJ • Lotus Group**.
