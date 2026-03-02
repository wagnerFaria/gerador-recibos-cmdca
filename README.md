# 📄 Gerador de Recibos CMDCA

Um aplicativo desktop focado em facilitar e automatizar a geração de recibos de doações para o **Conselho Municipal dos Direitos da Criança e do Adolescente (CMDCA)** de Cuiabá.

## 🚀 Funcionalidades

- **Importação de Planilhas de Doação**: Suporte a arraste e solte para arquivos Excel (`.xls`, `.xlsx`).
- **Agrupamento Inteligente de Doadores**: Detecta doadores repetidos baseando-se no CPF/CNPJ e Nome, consolidando as doações mensais e o valor total em um único recibo.
- **Configurações Flexíveis**: Permite alterar facilmente na interface o nome do Presidente do CMDCA, da Secretária da SMSocial, município e a data de assinatura.
- **Impressão Profissional (A4)**: Pré-visualização exata de como o arquivo será impresso, com suporte para impressão individual por doador ou impressão em lote de todos os recibos gerados de uma vez.
- **Interface Segura e Offline**: Os dados nunca saem da máquina do usuário, pois o processamento completo das planilhas é feito localmente usando Electron.

## 🛠️ Tecnologias Utilizadas

- **Interface / Frontend**: [Next.js](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Wrapper Desktop**: [Electron](https://www.electronjs.org/)
- **Processamento de Excel**: [`xlsx`](https://docs.sheetjs.com/)
- **Gestão de Datas e Ícones**: `date-fns` e `lucide-react`
- **Gerenciador de Pacotes**: `bun` e `npm`

## 💻 Como Rodar o Projeto

1. Certifique-se de ter o [Node.js](https://nodejs.org/) e o [Bun](https://bun.sh/) (opcional, mas recomendado) instalados.
2. Acesse a pasta do projeto e instale as dependências:
   ```bash
   npm install
   # ou
   bun install
   ```
3. Inicie o ambiente de desenvolvimento. O projeto usa o pacote `concurrently` para subir o Next.js e injetá-lo no Electron automaticamente:
   ```bash
   npm run electron:dev
   ```

## 📦 Como Gerar Arquivos de Produção

Para gerar a versão estática e finalizada da aplicação (sem o servidor Next.js de desenvolvimento):

1. Rode o script de build do Next.js:
   ```bash
   npm run build
   ```
2. O front-end otimizado será construído dentro da pasta `out/`.
3. O `main.js` configurado no Electron passará a ler diretamente o `out/index.html` em modo de produção (`app.isPackaged`). Para gerar arquivos `.exe`, `.dmg` ou equivalentes, recomenda-se adicionar e configurar a ferramenta `electron-builder` amarrada a este projeto.
