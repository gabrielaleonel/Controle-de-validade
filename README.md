# Validade - Controle de Validade de Produtos

Aplicativo mobile para controle de validade de produtos com leitura de código de barras, notificações e alertas por e-mail.

## Stack

- **React Native** com **Expo SDK 52**
- **Expo Router** para navegação (rotas baseadas em arquivos)
- **SQLite** (expo-sqlite) para armazenamento local
- **expo-camera** para leitura de código de barras
- **expo-image-picker** para captura/seleção de fotos
- **expo-notifications** para notificações locais
- **Open Food Facts API** para busca de produtos por código de barras

## Como instalar dependências

```bash
npm install
```

## Como rodar o app

```bash
# Iniciar o servidor de desenvolvimento
npx expo start

# Rodar no Android
npx expo start --android

# Rodar no iOS
npx expo start --ios
```

## Como testar o leitor de código de barras

1. Abra o app e clique no botão **+** (FAB) ou toque em "Adicionar produto"
2. Na tela de cadastro, clique no botão do leitor de código de barras (ícone de scanner ao lado do campo de código)
3. Aponte a câmera para um código de barras de produto
4. O app preencherá automaticamente o código e buscará o nome do produto na internet
5. Se preferir, digite o código manualmente no campo de texto

### Códigos de barras para teste

Para testar sem um produto físico, você pode imprimir ou exibir em outra tela códigos de barras conhecidos:

- **7891000111117** (Leite Integral - exemplo)
- **7891910000197** (Coca-Cola)
- **7896015268761** (Arroz)

> **Nota:** O leitor funciona apenas em dispositivos físicos. Não funciona no emulador/web.

## Como configurar notificações

1. Acesse a tela de **Configurações** (ícone de engrenagem no canto superior direito da tela inicial)
2. Ative "Notificações ativas" para receber alertas
3. Configure "Alerta por notificação" para notificações locais
4. Defina quantos dias antes do vencimento deseja ser alertado (padrão: 7 dias)
5. Ao cadastrar ou editar um produto, uma notificação é automaticamente agendada
6. As notificações são disparadas às 9h da manhã na data configurada

### Permissões

O app solicitará permissão de notificações na primeira execução. Caso negue, você pode ativar manualmente nas configurações do sistema.

## Como configurar envio de e-mail

### Configuração no app

1. Nas **Configurações**, ative "Alerta por e-mail"
2. Informe seu e-mail no campo exibido
3. Salve as configurações

### Configuração do backend

O app não envia e-mails diretamente por segurança. É necessário configurar um serviço de envio.

#### Opção 1: Firebase Cloud Function

1. Crie uma função Firebase que recebe POST com `{ to, subject, text }`
2. Use o Firebase Extension ou Nodemailer para enviar o e-mail
3. Configure a URL no arquivo `src/services/emailService.ts`:

```typescript
configureEmailService({
  apiUrl: "https://sua-funcao.cloudfunctions.net/send-email",
  apiKey: "seu-token-aqui",
});
```

#### Opção 2: Resend / SendGrid

1. Crie uma API endpoint simples (pode ser um Vercel serverless function ou similar)
2. Use as APIs do Resend ou SendGrid para disparar o e-mail
3. Proteja a rota com uma chave de API e configure no app

Exemplo de endpoint com Resend:

```typescript
// Exemplo: api/resend.ts (Vercel Serverless Function)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { to, subject, text } = await request.json();
  await resend.emails.send({
    from: 'Validade <noreply@seudominio.com>',
    to,
    subject,
    text,
  });
  return Response.json({ success: true });
}
```

### Importante

- **Nunca coloque chaves de API no código do app**
- As chaves devem ficar no backend ou em variáveis de ambiente
- O app apenas faz uma requisição HTTP para o seu backend, que é responsável pelo envio

## Estrutura do projeto

```
Validade/
├── app/                          # Telas (Expo Router)
│   ├── _layout.tsx               # Layout principal
│   ├── index.tsx                 # Lista de produtos
│   ├── add-product.tsx           # Cadastro de produto
│   ├── edit-product/[id].tsx     # Edição de produto
│   ├── details/[id].tsx          # Detalhes do produto
│   └── settings.tsx              # Configurações
├── src/
│   ├── components/               # Componentes reutilizáveis
│   │   ├── ProductCard.tsx       # Card do produto na lista
│   │   ├── FilterBar.tsx         # Filtros (Todos/Próximos/Vencidos)
│   │   ├── BarcodeScanner.tsx    # Leitor de código de barras
│   │   └── PhotoPicker.tsx       # Seletor de foto
│   ├── services/                 # Serviços
│   │   ├── database.ts           # SQLite (CRUD)
│   │   ├── notifications.ts      # Notificações locais
│   │   ├── productLookup.ts      # Busca de produto por código
│   │   └── emailService.ts       # Serviço de e-mail
│   ├── types/index.ts            # Tipos TypeScript
│   ├── utils/index.ts            # Utilitários
│   └── constants/index.ts        # Constantes
├── assets/                       # Imagens do app
├── package.json
├── app.json
└── tsconfig.json
```

## Funcionalidades

### Cadastro de produtos
- Leitura de código de barras pela câmera
- Digitação manual do código de barras
- Busca automática do nome do produto pela internet (Open Food Facts)
- Cadastro manual (sem código de barras) para produtos caseiros
- Foto do produto (câmera ou galeria)
- Validação de campos obrigatórios
- Prevenção de duplicidade por código de barras

### Lista de produtos
- Ordenação por data de vencimento (mais próximo primeiro)
- Vencidos em destaque com fundo vermelho
- Produtos próximos (7 dias) com alerta visual
- Filtros: Todos / Próximos / Vencidos
- Busca por nome ou código de barras
- Status visual em cada produto

### Notificações
- Agendamento automático ao cadastrar/editar
- Cancelamento ao excluir
- Atualização ao editar
- Configuração de dias de antecedência
- Notificação local às 9h da manhã

### Configurações
- Ativar/desativar notificações
- Alerta por notificação local
- Alerta por e-mail (precisa de backend)
- Configurar dias de antecedência
- Configurar e-mail de destino

## Licença

MIT
