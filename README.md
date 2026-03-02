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
   bun run electron:dev
   ```

## 📦 Como Gerar Arquivos de Produção (Executáveis)

O projeto já está pré-configurado com a biblioteca `electron-builder` para gerar automaticamente os instaladores/executáveis.

### Para gerar o `.exe` (Windows)
> [!WARNING]
> Se você estiver rodando este comando a partir de uma máquina **Linux ou macOS**, é **obrigatório** ter o pacote `wine` instalado no seu sistema previamente para que o compilador consiga gerar e assinar o código do Windows sem erros. (ex: `sudo apt install wine` no Ubuntu).

No terminal do Windows, ou em um Linux/Mac com o Wine configurado, rode:
```bash
bun run dist:win
```

### Para gerar o `.AppImage` / `.deb` (Linux)
```bash
bun run dist:linux
```

Após a compilação, o pacote final compilado e pronto para o cliente final estará disponível dentro da pasta `/dist_electron`!
