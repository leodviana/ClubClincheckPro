# Documentação Técnica de Páginas - ClubClincheck

## 1. Arquitetura de Rotas (Next.js App Router)
- Stack: Next.js (App Router) + React Client Components para telas interativas.
- Padrão de pastas: `app/**/page.tsx` para páginas e `app/api/**/route.ts` para rotas internas de API.
- Quase todas as páginas são `"use client"` por dependerem de estado local, `useEffect`, navegação e autenticação em runtime.

## 2. Fluxo de Autenticação

### 2.1 Provider e estado global
Arquivo: `components/AuthProvider.tsx`
- Contexto global de auth com:
  - `status`: `loading | authenticated | unauthenticated`
  - `accessToken` em memória
  - `user` normalizado (`id`, `nome`, `email`, `profile`)
- Ao montar, executa `refreshSession()` (chama `/api/Login/refresh`) para recuperar sessão via cookie HttpOnly.

### 2.2 Gate de rotas protegidas
Arquivo: `components/AuthGate.tsx`
- Rotas públicas: `/login`, `/recuperar`.
- Demais rotas exigem sessão válida.
- Se usuário não autenticado após tentativa de refresh, redireciona para `/login?next=<rota>`.

### 2.3 Hook de consumo
Arquivo: `hooks/useAuth.ts`
- Exposição simplificada de auth (`isAuthenticated`, `user`, `signIn`, `signOut`, `refreshSession`).

## 3. Camada de API (cliente)

### 3.1 Wrapper autenticado
Arquivo: `lib/api-fetch.ts`
- Injeta `Authorization: Bearer <token>` quando disponível.
- Usa `credentials: include` para envio de cookies (refresh token).
- Retry automático em 401: tenta refresh e repete requisição uma vez.

### 3.2 Hook de chamadas JSON
Arquivo: `hooks/useApi.ts`
- Método principal: `fetchJson<T>(path, options)`.
- Monta URL com base em `NEXT_PUBLIC_API_URL`.
- Evita duplicação de `/api` no path final.

### 3.3 Endpoints de autenticação
Arquivo: `lib/auth-client.ts`
- Login: `POST /api/Login/login`
- Refresh: `POST /api/Login/refresh`
- Logout: `POST /api/Login/logout`
- Esqueci senha: `POST /api/Login/forgot-password`

## 4. Layout e navegação global

### 4.1 `app/layout.tsx`
- Estrutura padrão:
  - Header com logo + `NavAuth`
  - Main com `AuthGate`
  - Footer
- Todo conteúdo da aplicação roda dentro de `AuthProvider`.

### 4.2 `components/NavAuth.tsx`
- Não autenticado: link para login.
- Autenticado:
  - Se admin (`user.id === 3` ou `user.profile === 1`): link `Admin`.
  - Caso contrário: link `Início`.
- Ações: trocar senha e logout.

## 5. Documentação Técnica por Página

### 5.1 Home `/` (`app/page.tsx`)
Responsabilidade:
- Tela de entrada de usuário comum com listagem de créditos/chats.

Dependências principais:
- `AdminRedirect`
- `UserCredits`

Fluxo:
1. Renderiza estrutura da página.
2. `AdminRedirect` verifica perfil e redireciona admins para `/admin/chats`.
3. `UserCredits` busca dados remotos e monta cards.

### 5.2 Login `/login` (`app/login/page.tsx`)
Responsabilidade:
- Autenticar usuário e redirecionar para rota de destino.

Estado local:
- `login`, `password`, `manterLogado`, `loading`, `error`, `nextUrl`.

Fluxo:
1. Lê query param `next` no cliente.
2. Submete credenciais via `signIn(login, senha, manterLogado)`.
3. Em sucesso: `router.replace(nextUrl)`.
4. Em falha: mostra erro amigável.

Integrações:
- `useAuth().signIn` -> `POST /api/Login/login`.

### 5.3 Recuperar senha `/recuperar` (`app/recuperar/page.tsx`)
Responsabilidade:
- Iniciar recuperação de senha por e-mail.

Estado local:
- `email`, `loading`, `error`, `okMessage`.

Fluxo:
1. Usuário informa e-mail.
2. Chama `requestPasswordReset(email)`.
3. Exibe retorno de sucesso ou erro.

Integrações:
- `POST /api/Login/forgot-password`.

### 5.4 Admin Chats `/admin/chats` (`app/admin/chats/page.tsx`)
Responsabilidade:
- Interface administrativa para filtrar chats por período.

Controle de acesso:
- Redireciona não-admin para `/`.
- Redireciona não autenticado para `/login?next=/admin/chats`.

Estado local:
- `startDate`, `endDate`, `message`.

Status funcional:
- Tela preparada, mas filtro ainda é placeholder local (sem query real de dados).

### 5.5 Chat `/chat/[chatId]` (`app/chat/[chatId]/page.tsx`)
Responsabilidade:
- Operação completa do atendimento por chat e dados clínicos do caso.

Entradas de rota:
- `chatId` obtido via `useParams()`.

Capacidades principais:
- Carregar mensagens do chat.
- Enviar mensagem textual (otimista com estado `pending`).
- Marcar falha e permitir retry (`failed`).
- Upload local para imagem/vídeo e gravação de áudio (admin).
- Encerrar chat e desfazer encerramento (admin).
- Exibir dados do caso na lateral.
- Exibir modal de formulário obrigatório para liberar chat quando bloqueado.

Estados relevantes:
- Operacionais: `messages`, `text`, `loadingMessages`, `messagesError`.
- Chat: `status`, `closingChat`, `showUndoBanner`, `undoCountdown`.
- Caso clínico: `caseData`, `formCaseData`, `caseExists`, `confirmChecked`, `submittingCase`.

Regras de negócio observáveis:
- Usuário admin: definido majoritariamente por `id === 3` (com alguns pontos usando `profile === 1`).
- Envio bloqueado quando status está encerrado para não-admin.
- Encerramento/reabertura atualiza UI e `sessionStorage` (`chat.meta.<chatId>`).

Endpoints consumidos nesta página:
- `POST /api/chats/{chatId}/messages` (envio de mensagem)
- `POST /api/chats/{chatId}` e `POST /api/chats` (fallback de envio)
- `POST /api/Chats/{chatId}/close` (encerrar chat)
- `POST /api/Chats/open-chat/{chatId}` (reabrir chat)
- `POST /api/chats/{chatId}/case` (envio de formulário do caso)
- Também há carregamento de estado/mensagens/caso em effects internos via `fetchJson`.

## 6. Componentes de domínio ligados às páginas

### 6.1 `components/UserCredits.tsx`
Responsabilidade:
- Buscar lista de chats do usuário e renderizar cards de navegação.

Fluxo de dados:
1. Resolve `tokenId` por `user.id` ou decode de JWT (`accessToken`).
2. Chama `GET /api/chats/by-user/{tokenId}`.
3. Normaliza payload heterogêneo com `normalizeCredits()`.
4. Ao clicar no card, navega para `/chat/{id}` e salva metadados de status em `sessionStorage`.

Observação:
- Para admin (`profile === 1`), o componente não renderiza conteúdo.

### 6.2 `components/AdminRedirect.tsx`
- Redirect client-side simples para manter admins fora da home comum.

## 7. Adaptadores e normalização

### 7.1 `lib/utils/credits-adapter.ts`
- `normalizeCredits(data)`: tolera múltiplos formatos de payload backend.
- `normalizeStatus(raw)`: converte status numérico/textual em chave semântica:
  - `aberto`
  - `encerrado`
  - `nao_iniciado`
- `formatDate(v)`: padroniza exibição de datas em `pt-BR`.

## 8. Rotas API internas do projeto

### 8.1 `app/api/Login/resetPassword/route.ts`
- Endpoint local (`POST`) com validação mínima de `email` e `newpassword`.
- Implementação atual simulada para sucesso (não integrada ao backend real).

## 9. Limitações técnicas atuais
- Regra de admin aparece em formatos diferentes (`profile === 1` e `id === 3`), o que pode gerar comportamento inconsistente se o backend mudar.
- Página `/admin/chats` ainda sem integração real de listagem.
- Fluxo de chat concentra muita responsabilidade em um único componente extenso (`app/chat/[chatId]/page.tsx`), dificultando manutenção e testes.
- Endpoint local `resetPassword` é mock e não representa fluxo real de produção.
