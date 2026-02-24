# Documentação de Páginas - ClubClincheck

Este documento resume cada página/rota da aplicação e seu papel funcional.

## Estrutura global

### `app/layout.tsx`
- Define o layout base de todas as páginas.
- Renderiza cabeçalho com logo e navegação (`NavAuth`).
- Envolve o conteúdo com `AuthProvider` e `AuthGate`.
- Exibe rodapé padrão.

## Páginas

### `/` - `app/page.tsx`
- Página inicial para usuários comuns.
- Exibe o título "Meus créditos".
- Renderiza os cards de chats/créditos via `UserCredits`.
- Usa `AdminRedirect` para enviar administradores para `/admin/chats`.

### `/login` - `app/login/page.tsx`
- Tela de autenticação.
- Permite login com usuário/e-mail e senha.
- Opção "manter logado".
- Respeita parâmetro `next` para redirecionar após login.
- Link para recuperação de senha (`/recuperar`).

### `/recuperar` - `app/recuperar/page.tsx`
- Tela de recuperação de senha.
- Recebe e-mail e dispara solicitação de reset.
- Exibe mensagens de sucesso ou erro.
- Links para voltar ao login e início.

### `/admin/chats` - `app/admin/chats/page.tsx`
- Tela administrativa de filtro por intervalo de datas.
- Protegida por perfil (admin).
- Atualmente possui ação de filtro em modo placeholder (sem listagem final implementada).

### `/chat/[chatId]` - `app/chat/[chatId]/page.tsx`
- Tela principal de conversa de um caso específico.
- Carrega mensagens e dados clínicos do caso.
- Envio de mensagens de texto e, para admin, anexos (imagem/vídeo/áudio).
- Controle de status do chat (aberto/encerrado).
- Admin pode encerrar e reabrir chat.
- Trata mensagens pendentes/falhadas com opção de tentativa novamente.
- Exibe painel lateral com dados do caso.
- Pode exibir formulário obrigatório para liberar o chat quando bloqueado.

## Componentes de suporte às páginas

### `components/AuthGate.tsx`
- Define quais rotas são públicas (`/login`, `/recuperar`).
- Para rotas protegidas, valida sessão.
- Se não autenticado, redireciona para `/login?next=...`.

### `components/NavAuth.tsx`
- Navegação contextual por autenticação/perfil.
- Exibe avatar/nome, acesso admin ou início, troca de senha e logout.

### `components/UserCredits.tsx`
- Busca chats/créditos do usuário autenticado.
- Normaliza dados de status e datas.
- Renderiza cards clicáveis que abrem `/chat/[chatId]`.

### `components/AdminRedirect.tsx`
- Se usuário autenticado for admin, redireciona da home para `/admin/chats`.

## Rotas de API existentes no projeto (não são páginas)

### `app/api/Login/resetPassword/route.ts`
- Endpoint `POST` para reset de senha.
- Implementação atual simulada (retorna sucesso para teste quando payload está válido).
