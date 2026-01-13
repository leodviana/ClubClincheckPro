"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Message = {
  id: string;
  from: "user" | "admin";
  type: "text" | "image" | "video" | "audio";
  content: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean; // true when last send attempt failed
  senderId?: string | number;
  isPalette?: boolean; // when true, render with palette color instead of white
};

// Mapeamentos configuráveis para o formato do backend
const FROM_USER_VALUE = 1; // backend: 1 = usuário
const FROM_ADMIN_VALUES = [2, 3]; // backend: 2 or 3 = administrador

const TYPE_MAP_IN: Record<number, Message["type"]> = {
  1: "image",
  2: "text",
  3: "video",
  4: "audio",
};

const TYPE_MAP_OUT: Record<Message["type"], number> = {
  image: 1,
  text: 2,
  video: 3,
  audio: 4,
};

type ChatStatus = "aberto" | "finalizado" | "encerrado" | "nao_iniciado";

type CaseData = {
  patientName: string;
  diagnostic: string;
  treatmentPlan: string;
  doubts: string;

  objective: string;
  patientConcerns: string;
  doctorComments: string;
  clinicalNotes: string;
  treatmentLimitations?: string;
};

function normalizeCreatedAt(raw: any): string {
  if (raw == null) return new Date().toISOString();
  // numeric timestamps may be seconds or milliseconds
  if (typeof raw === "number") {
    const n = raw;
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof raw === "string") {
    // numeric string?
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      const ms = n > 1e12 ? n : n * 1000;
      return new Date(ms).toISOString();
    }

    // If string already contains timezone info (Z or +/-offset), parse normally
    if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw)) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    // Handle common DB formats without timezone like "YYYY-MM-DD HH:MM:SS"
    // Treat them as UTC to avoid accidental local-shift (+/- hours).
    const sqlLike = raw.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/);
    if (sqlLike) {
      const asUtc = raw.replace(" ", "T") + "Z";
      const d = new Date(asUtc);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    // Fallback to Date parsing (may be local), then fallback to now
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return new Date().toISOString();
  }
  return new Date().toISOString();
}

const initialCaseData: CaseData = {
  patientName: "",
  diagnostic: "",
  treatmentPlan: "",
  doubts: "",

  objective: "",
  patientConcerns: "",
  doctorComments: "",
  clinicalNotes: "",
  treatmentLimitations: "",
};

function looksLikeMessage(it: any): boolean {
  if (!it) return false;
  if (it.content || it.text || it.message || it.body || it.url) return true;
  if (it.type || it.message_type || it.tipo) return true;
  if (it.createdAt || it.created_at || it.timestamp || it.dt_criacao) return true;
  return false;
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId as string;

  const [status, setStatus] = useState<ChatStatus | null>(null); // carregado do backend
  const [unlockFormDone, setUnlockFormDone] = useState(false);
  // null = not yet checked, true = case exists, false = no case (blocked)
  const [caseExists, setCaseExists] = useState<boolean | null>(null);
  const isBlocked = caseExists === false;

  // cannotSend is computed later after `user` is available

  
  const [closingChat, setClosingChat] = useState(false);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const undoTimerRef = useRef<number | null>(null);

  const [caseData, setCaseData] = useState<CaseData>(initialCaseData);
  const emptyFormCaseData: CaseData = {
    patientName: "",
    diagnostic: "",
    treatmentPlan: "",
    doubts: "",

    objective: "",
    patientConcerns: "",
    doctorComments: "",
    clinicalNotes: "",
    treatmentLimitations: "",
  };
  const [formCaseData, setFormCaseData] = useState<CaseData>(emptyFormCaseData);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  // Ignore route-level params passed from cards; rely only on `chatId`.
  const routedKey: string | null = null;
  const routedChatNo: string | null = null;
  const routedStatusKey: string | null = null;
  const routedStatusLabel: string | null = null;
  const [routedStatusLabelState, setRoutedStatusLabelState] = useState<string | null>(null);

  // No optimistic route-derived status is used; rely on backend/status state only.

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "admin",
      type: "text",
      content: "Olá, pode verificar o estagiamento da distalização?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [text, setText] = useState("");
  const { fetchJson } = useApi();
  const { user, status: authStatus, accessToken } = useAuth();
  
  function isAdminUser(u: any) {
    if (!u) return false;
    const idn = Number(u.id as any);
    if (!Number.isNaN(idn) && idn === 3) return true; // only id 3 is admin
    return false;
  }

  function isPaletteUser(u: any) {
    if (!u) return false;
    const p = u.profile ?? u.Profile ?? null;
    if (p != null && Number(p) === 3) return true;
    const idn = Number(u.id as any);
    return !Number.isNaN(idn) && idn === 3;
  }

  const isCurrentUserAdmin = isAdminUser(user);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const typing = text.length > 0;
  const [refreshKey, setRefreshKey] = useState(0);

  const statusLabel = useMemo(() => {
    // Prefer a label explicitly passed via route or session when available.
    if (routedStatusLabelState) {
      const low = String(routedStatusLabelState).toLowerCase();
      if (low.includes("encerr") || low.includes("fech") || low.includes("final")) return "Encerrado";
      if (low.includes("abert")) return "Aberto";
      return String(routedStatusLabelState);
    }
    if (status === null) return "Carregando...";
    if (status === "aberto") return "Aberto";
    if (status === "encerrado") return "Encerrado";
    return "Encerrado";
  }, [status, routedStatusLabelState]);

  function isLabelEncerrado() {
    try {
      const low = String(statusLabel ?? "").toLowerCase();
      return low.includes("encerr") || low.includes("fech") || low.includes("final");
    } catch (e) {
      return false;
    }
  }

  const cannotSend = useMemo(() => {
    const isAdmin = isAdminUser(user);
    try {
      const lbl = String(statusLabel ?? "").toLowerCase();
      if (lbl.includes("encerr") || lbl.includes("fech") || lbl.includes("final")) return !isAdmin;
    } catch (e) {
      // ignore
    }
    return false;
  }, [statusLabel, user?.id]);

  const showSendControls = !isLabelEncerrado();

  // No session/query metadata applied — rely on chatId and backend for status.

  // No route-provided statusKey is consumed; status comes from backend.

  function isSendBlocked() {
    const isAdmin = isAdminUser(user);
    try {
      const lbl = String(statusLabel ?? "").toLowerCase();
      if (lbl.includes("encerr") || lbl.includes("fech") || lbl.includes("final")) return !isAdmin;
    } catch (e) {
      // ignore
    }
    return false;
  }

  function addMessage(type: Message["type"], content: string) {
    if (isSendBlocked()) return;

    const isCurrentUserPalette = isPaletteUser(user);

    const msg: Message = {
      id: crypto.randomUUID(),
      from: isCurrentUserAdmin ? "admin" : "user",
      type,
      content,
      createdAt: new Date().toISOString(),
      senderId: user?.id,
      isPalette: isCurrentUserPalette,
    };

    // Apenas adiciona localmente; envio será feito explicitamente no botão "Enviar"
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  }

  function handleSendText() {
    if (isSendBlocked()) return;
    if (!text.trim()) return;

    const tempId = crypto.randomUUID();
    const isAdmin = isCurrentUserAdmin;
    const isPalette = isPaletteUser(user);

    const tempMsg: Message = {
      id: tempId,
      from: isAdmin ? "admin" : "user",
      type: "text",
      content: text,
      createdAt: new Date().toISOString(),
      pending: true,
      failed: false,
      senderId: user?.id,
      isPalette: isPalette,
    };

    // Otimista: adiciona na UI imediatamente
    setMessages((prev) => [...prev, tempMsg]);
    setText("");
    scrollToBottom();

    // Envia especificamente para /api/chats/{chatId}/messages
    (async () => {
      try {
        const senderVal = (() => {
          if (!user?.id) return null;
          // tenta converter para number quando possível
          const n = Number(user.id as any);
          return !Number.isNaN(n) ? n : user.id;
        })();

        const res = await fetchJson<any>(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: TYPE_MAP_OUT["text"], content: tempMsg.content, from: senderVal, createdAt: tempMsg.createdAt }),
        });

        const item = Array.isArray(res) ? res[0] : res?.data ?? res;
        const id = (item?.id ?? item?.message_id ?? crypto.randomUUID()).toString();
        const content = item?.content ?? item?.text ?? tempMsg.content;

        const rawType = item?.type ?? item?.message_type ?? null;
        let type: Message["type"] = "text";
        if (typeof rawType === "number") type = TYPE_MAP_IN[rawType] ?? "text";
        else if (typeof rawType === "string") {
          if (rawType.includes("image") || rawType === "image") type = "image";
          else if (rawType.includes("audio") || rawType === "audio") type = "audio";
          else if (rawType.includes("video") || rawType === "video") type = "video";
          else type = "text";
        }

        const createdAtRaw = item?.createdAt ?? item?.created_at ?? null;
        const createdAt = createdAtRaw ? normalizeCreatedAt(createdAtRaw) : tempMsg.createdAt;

        const rawFrom = item?.from ?? item?.sender ?? item?.from_user ?? item?.user_id ?? null;
        let from: Message["from"] = "admin";
        let senderId: string | number | undefined = undefined;
        let isPalette = false;
        if (typeof rawFrom === "number") {
          if (rawFrom === FROM_USER_VALUE) from = "user";
          else if (FROM_ADMIN_VALUES.includes(rawFrom)) {
            from = "admin";
            if (rawFrom === 3) isPalette = true;
          } else {
            senderId = rawFrom;
            if (user?.id && rawFrom.toString() === user.id.toString()) from = "user";
          }
        } else if (typeof rawFrom === "string") {
          senderId = rawFrom;
          if (user?.id && rawFrom === user.id.toString()) from = "user";
        }

        const serverMsg: Message = { id, from, type, content, createdAt, senderId, isPalette };

        // Substitui mensagem temporária pela versão do servidor, preservando flags locais (isPalette, pending)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  ...serverMsg,
                  // preserve optimistic createdAt to avoid visible timestamp jump
                  createdAt: m.createdAt || serverMsg.createdAt,
                  isPalette: m.isPalette || serverMsg.isPalette,
                  pending: false,
                }
              : m
          )
        );
      } catch (err) {
        console.error("failed to send message to /api/chats/{chatId}/messages", err);
        // marque como falhada e não pendente para o usuário ver
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      }
    })();

        
  }

  // Retry sending a failed message
  async function retrySend(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    // mark as pending and clear failed
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pending: true, failed: false } : m)));

    try {
      const serverMsg = await sendToBackend(msg);
      // replace with server message, preserve isPalette
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...serverMsg, pending: false, failed: false, isPalette: m.isPalette || serverMsg.isPalette } : m)));
    } catch (err) {
      console.error("retry failed", err);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pending: false, failed: true } : m)));
    }
  }

  // Close chat on the server and update UI
  async function closeChat() {
    if (!chatId) return;
    setClosingChat(true);
    setMessagesError(null);
    try {
      await fetchJson<any>(`/api/Chats/${chatId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setStatus("encerrado");
      // write session meta so navigations (and other pages) immediately reflect the closed state
      try {
        if (typeof window !== "undefined" && chatId) {
          const meta = {
            chatNo: routedChatNo ?? null,
            statusKey: "encerrado",
            statusLabel: "Encerrado",
            expiresAt: Date.now() + 30_000,
          };
          sessionStorage.setItem(`chat.meta.${chatId}`, JSON.stringify(meta));
        }
      } catch (e) {
        // ignore storage errors
      }
      // show undo banner for 10s
      setShowUndoBanner(true);
      setUndoCountdown(10);
      // start countdown
      if (undoTimerRef.current) window.clearInterval(undoTimerRef.current);
      undoTimerRef.current = window.setInterval(() => {
        setUndoCountdown((c) => {
          if (c <= 1) {
            // stop timer and hide banner
            if (undoTimerRef.current) {
              window.clearInterval(undoTimerRef.current);
              undoTimerRef.current = null;
            }
            setShowUndoBanner(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000) as unknown as number;
    } catch (err: any) {
      console.error("failed to close chat", err);
      setMessagesError(err?.message ?? "Erro ao encerrar chat");
      alert("Não foi possível encerrar o chat: " + (err?.message ?? err));
    } finally {
      setClosingChat(false);
    }
  }

  async function undoClose() {
    if (!chatId) return;
    // cancel timer
    if (undoTimerRef.current) {
      window.clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setShowUndoBanner(false);
    setUndoCountdown(0);
      try {
        await fetchJson<any>(`/api/Chats/open-chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      // clear any optimistic/session meta so UI reflects backend
      try {
        if (typeof window !== "undefined" && chatId) sessionStorage.removeItem(`chat.meta.${chatId}`);
      } catch (e) {
        // ignore
      }
      // update label and status to reflect opened chat
      setRoutedStatusLabelState("Em aberto");
      setStatus("aberto");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      // if server doesn't support open, revert UI and show message
      console.error("undo close failed", err);
        alert("Não foi possível reabrir o chat no servidor. O chat permanecerá encerrado.");
    }
  }

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        window.clearInterval(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video" | "audio") {
    if (isSendBlocked()) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    addMessage(kind, url);
  }

  async function sendToBackend(msg: Message): Promise<Message> {
    const candidates = [
      `/api/chats/${chatId}/messages`,
      `/api/chats/${chatId}`,
      `/api/chats`,
    ];

    const payload = ((): any => {
      const base: any = { type: TYPE_MAP_OUT[msg.type], content: msg.content, createdAt: msg.createdAt };
      const senderVal = (() => {
        if (!user?.id) return null;
        const n = Number(user.id as any);
        return !Number.isNaN(n) ? n : user.id;
      })();
      if (senderVal != null) base.from = senderVal;
      return base;
    })();

    let lastErr: any = null;
    for (const path of candidates) {
      try {
        const res = await fetchJson<any>(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const item = Array.isArray(res) ? res[0] : res?.data ?? res;
        const id = (item?.id ?? item?.message_id ?? crypto.randomUUID()).toString();
        const content = item?.content ?? item?.text ?? payload.content;

        // type pode vir numérico ou string; normalize
        const rawType = item?.type ?? item?.message_type ?? null;
        let type: Message["type"] = "text";
        if (typeof rawType === "number") type = TYPE_MAP_IN[rawType] ?? "text";
        else if (typeof rawType === "string") {
          if (rawType.includes("image") || rawType === "image") type = "image";
          else if (rawType.includes("audio") || rawType === "audio") type = "audio";
          else if (rawType.includes("video") || rawType === "video") type = "video";
          else type = "text";
        }

        const createdAtRaw = item?.createdAt ?? item?.created_at ?? null;
        const normalizedServer = createdAtRaw ? normalizeCreatedAt(createdAtRaw) : null;
        let createdAt: string;
        if (msg?.createdAt && normalizedServer) {
          const diff = Math.abs(Date.parse(normalizedServer) - Date.parse(msg.createdAt));
          // if server time differs significantly (>5s) prefer client's optimistic timestamp
          createdAt = diff > 5000 ? msg.createdAt : normalizedServer;
        } else if (normalizedServer) {
          createdAt = normalizedServer;
        } else {
          createdAt = msg?.createdAt ?? new Date().toISOString();
        }

        // from pode ser numérico (1=user,2|3=admin) ou pode ser o id do remetente
        const rawFrom = item?.from ?? item?.sender ?? item?.from_user ?? item?.user_id ?? null;
        let from: Message["from"] = "admin";
        let senderId: string | number | undefined = undefined;
        let isPalette = false;
        if (typeof rawFrom === "number") {
          if (rawFrom === FROM_USER_VALUE) from = "user";
          else if (FROM_ADMIN_VALUES.includes(rawFrom)) {
            from = "admin";
            if (rawFrom === 3) isPalette = true;
          } else {
            senderId = rawFrom;
            if (user?.id && rawFrom.toString() === user.id.toString()) from = "user";
          }
        } else if (typeof rawFrom === "string") {
          senderId = rawFrom;
          if (user?.id && rawFrom === user.id.toString()) from = "user";
        }

        return { id, from, type, content, createdAt, senderId, isPalette } as Message;
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr ?? new Error("Nenhum endpoint disponível para envio de mensagens");
  }

  async function startRecording() {
    if (isSendBlocked()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioURL = URL.createObjectURL(blob);
        addMessage("audio", audioURL);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("mic error", err);
      alert("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, []);

  // Carrega mensagens do backend ao entrar na tela / ao mudar de chatId
  useEffect(() => {
    if (!chatId) return;
    // Wait until auth initialization completes to avoid duplicate runs
    if (authStatus === "loading") return;
    let mounted = true;

    async function loadMessages() {
      setLoadingMessages(true);
      setMessagesError(null);
      setMessages([]);

      try {
        // fetch chat meta
        let data: any = null;
        try {
          data = await fetchJson<any>(`/api/chats/${chatId}`);
          
        } catch (e) {
          data = null;
          
        }

        // prefer messages endpoint if available
        let forcedMsgs: any[] | null = null;
        try {
          const forced = await fetchJson<any>(`/api/chats/${chatId}/messages`);
          forcedMsgs = Array.isArray(forced) ? forced : forced?.messages ?? forced?.data ?? null;
          
        } catch (e) {
          forcedMsgs = null;
          
        }

        // determine chat meta
        let chatMeta: any = null;
        if (!data) chatMeta = null;
        else if (Array.isArray(data) && data.length > 0) chatMeta = data[0];
        else if (data?.data && Array.isArray(data.data) && data.data.length > 0) chatMeta = data.data[0];
        else chatMeta = data;

        // set title
        if (chatMeta) {
          const titleCandidate = chatMeta?.title ?? chatMeta?.name ?? chatMeta?.caseTitle ?? chatMeta?.title_chat ?? chatMeta?.subject ?? chatMeta?.chatTitle ?? chatMeta?.titulo ?? null;
          if (titleCandidate) setChatTitle(String(titleCandidate));
        }

        // parse status
        const parseStatus = (raw: any): ChatStatus | null => {
          if (raw == null) return null;
          if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
            const n = Number(raw);
            if (n === 1) return "aberto";
            if (n === 2) return "encerrado";
            return null;
          }
          const s = String(raw).toLowerCase();
          if (s.includes("open") || s.includes("abert")) return "aberto";
          if (s.includes("clos") || s.includes("fech") || s.includes("encerr")) return "encerrado";
          if (s.includes("lock") || s.includes("bloq") || s.includes("final")) return "encerrado";
          return null;
        };

        const rawStatus = chatMeta?.status ?? chatMeta?.Status ?? chatMeta?.state ?? null;
        const chatStatus = parseStatus(rawStatus);
        if (chatStatus) setStatus(chatStatus);

        // assemble message list
        // Prefer `forcedMsgs` when the dedicated messages endpoint returned data —
        // some backends return an object-shaped `data` from `/api/chats/{id}` that
        // superficially looks like a message (e.g. contains `content`/`createdAt`)
        // and can incorrectly be treated as the messages array. Use the explicit
        // messages endpoint first to avoid mapping chat meta as a message.
        let list: any[] = [];

        const looksLikeMessage = (it: any) => {
          if (!it) return false;
          if (it.content || it.text || it.message || it.body || it.url) return true;
          if (it.type || it.message_type || it.tipo) return true;
          if (it.createdAt || it.created_at || it.timestamp || it.dt_criacao) return true;
          return false;
        };

        // 1) prefer explicit forced messages from the dedicated endpoint
        if (forcedMsgs && Array.isArray(forcedMsgs) && forcedMsgs.length > 0) {
          list = forcedMsgs;
        } else {
          // 2) try candidate arrays from `/api/chats/{id}` response
          const candidateFromData = Array.isArray(data) ? data : data?.messages ?? data?.data ?? [];
          if (Array.isArray(candidateFromData) && candidateFromData.length > 0 && looksLikeMessage(candidateFromData[0])) {
            list = candidateFromData;
          }

          // 3) try arrays nested in chatMeta
          if ((!list || list.length === 0) && chatMeta && typeof chatMeta === "object") {
            for (const k of Object.keys(chatMeta)) {
              const v = (chatMeta as any)[k];
              if (Array.isArray(v) && v.length > 0 && looksLikeMessage(v[0])) {
                list = v;
                break;
              }
            }
          }
        }

        // No extra fallback fetch: prefer `forcedMsgs` (messages endpoint) and
        // fall back to arrays found in `/api/chats/{id}` meta only when empty.

        if (!mounted) return;

        const mapped: Message[] = (list || []).map((it: any) => {
          const id = (it.id ?? it.message_id ?? it.isn_mensagem ?? it.uuid ?? crypto.randomUUID()).toString();
          let from: Message["from"] = "admin";
          const rawFrom = it.from ?? it.sender ?? it.from_user ?? it.user_id ?? null;
          let senderId: string | number | undefined = undefined;
          let isPalette = false;

          if (typeof rawFrom === "number") {
            if (rawFrom === FROM_USER_VALUE) from = "user";
            else if (FROM_ADMIN_VALUES.includes(rawFrom)) {
              from = "admin";
              if (rawFrom === 3) isPalette = true;
            } else {
              senderId = rawFrom;
              if (user?.id && rawFrom.toString() === user.id.toString()) from = "user";
            }
          } else if (typeof rawFrom === "string") {
            senderId = rawFrom;
            if (user?.id && rawFrom === user.id.toString()) from = "user";
            if (!senderId) {
              const r = rawFrom.toLowerCase();
              if (r === "user" || r === "paciente" || r === "cliente") from = "user";
              else if (r === "admin" || r === "especialista" || r === "staff") from = "admin";
            }
          }

          // Additional palette detection: some backends return flags like
          // `isPalette`, `is_palette`, `profile`, `sender_profile`, `admin_color` etc.
          // Preserve style rule: messages from users are white; admin messages may use palette.
          if (from === "user") {
            isPalette = false;
          } else if (from === "admin") {
            const paletteCandidates = [
              it.isPalette,
              it.is_palette,
              it.palette,
              it.sender_profile,
              it.profile,
              it.profile_id,
              it.admin_color,
              it.color,
            ];
            for (const cand of paletteCandidates) {
              if (cand == null) continue;
              // numeric 3 -> palette (keeps existing behavior)
              if (typeof cand === "number" && cand === 3) {
                isPalette = true;
                break;
              }
              const s = String(cand).toLowerCase();
              if (s === "3" || s === "true" || s.includes("palette") || s.includes("pink") || s.includes("magenta") || s.includes("brand")) {
                isPalette = true;
                break;
              }
            }
          }

          const content = it.content ?? it.text ?? it.message ?? it.body ?? it.url ?? "";

          const rawType = it.type ?? it.tipo ?? it.message_type ?? null;
          let type: Message["type"] = "text";
          if (typeof rawType === "number") type = TYPE_MAP_IN[rawType] ?? "text";
          else if (typeof rawType === "string") {
            if (rawType.includes("image") || rawType === "image") type = "image";
            else if (rawType.includes("audio") || rawType === "audio") type = "audio";
            else if (rawType.includes("video") || rawType === "video") type = "video";
            else type = "text";
          }

          const createdAt = normalizeCreatedAt(it.createdAt ?? it.created_at ?? it.timestamp ?? it.dt_criacao ?? null);

          return { id, from, type, content, createdAt, senderId, isPalette } as Message;
        });

        
        setMessages(mapped);

        // try load case data
        try {
          if (chatId) {
            const caseRes = await fetchJson<any>(`/api/chats/${chatId}/case`);
            const caseObj = Array.isArray(caseRes) ? caseRes[0] : caseRes?.data ?? caseRes;
            const hasAnyCaseField = (obj: any) => {
              if (!obj) return false;
              const keys = [
                "patientName",
                "patient_name",
                "name",
                "PatientName",
                "Patient_Name",
                "diagnostic",
                "Diagnosis",
                "diagnose",
                "diagnostico",
                "treatmentPlan",
                "treatment_plan",
                "TreatmentPlan",
                "doubts",
                "duvidas",
                "questions",
                "objective",
                "ObjectiveGeneral",
                "Objective",
                "objectiveGeneral",
                "objective_general",
                "mainConcerns",
                "MainConcerns",
                "patientConcerns",
                "doctorComments",
                "DoctorComments",
                "clinicalNotes",
                "ClinicalConsiderations",
                "clinical_considerations",
                "treatmentLimitations",
                "TreatmentLimitations",
              ];
              for (const k of keys) {
                const v = obj[k];
                if (v != null && String(v).trim() !== "") return true;
              }
              return false;
            };

            if (caseObj && hasAnyCaseField(caseObj)) {
              const pickNonEmpty = (obj: any, keys: string[], fallback: string) => {
                for (const k of keys) {
                  const v = obj?.[k];
                  if (v != null && String(v).trim() !== "") return String(v);
                }
                return fallback;
              };

              const mapped: CaseData = {
                patientName:
                  caseObj.patientName ?? caseObj.PatientName ?? caseObj.patient_name ?? caseObj.name ?? caseData.patientName,
                diagnostic:
                  caseObj.diagnostic ?? caseObj.Diagnosis ?? caseObj.diagnose ?? caseObj.diagnostico ?? caseData.diagnostic,
                treatmentPlan:
                  caseObj.treatmentPlan ?? caseObj.TreatmentPlan ?? caseObj.treatment_plan ?? caseObj.plano ?? caseData.treatmentPlan,
                doubts: caseObj.doubts ?? caseObj.duvidas ?? caseObj.questions ?? caseData.doubts,
                objective: pickNonEmpty(caseObj, [
                  "objective",
                  "ObjectiveGeneral",
                  "Objective",
                  "objectiveGeneral",
                  "objective_general",
                  "Objective_General",
                  "objetivo",
                  "ObjectiveText",
                ], caseData.objective),
                patientConcerns:
                  caseObj.patientConcerns ?? caseObj.MainConcerns ?? caseObj.mainConcerns ?? caseObj.patient_concerns ?? caseData.patientConcerns,
                doctorComments:
                  caseObj.doctorComments ?? caseObj.DoctorComments ?? caseObj.doctor_comments ?? caseData.doctorComments,
                clinicalNotes: pickNonEmpty(caseObj, [
                  "clinicalNotes",
                  "ClinicalConsiderations",
                  "clinical_considerations",
                  "Clinical_Considerations",
                  "clinical_notes",
                  "ClinicalConsideration",
                  "clinicalConsiderations",
                  "clinical_consideration",
                  "clinical_note",
                  "ClinicalNote",
                  "ClinicalNotes",
                  "clinicalObservation",
                  "clinical_observations",
                ], caseData.clinicalNotes),
                treatmentLimitations:
                  caseObj.treatmentLimitations ?? caseObj.TreatmentLimitations ?? caseObj.treatment_limitations ?? caseData.treatmentLimitations,
              };

              setCaseData(mapped);
              setCaseExists(true);

              if (!mapped.objective || String(mapped.objective).trim() === "") {
                try {
                  // eslint-disable-next-line no-console
                  console.warn("caseObj keys:", Object.keys(caseObj));
                } catch (e) {}
              }

              if (!mapped.clinicalNotes || String(mapped.clinicalNotes).trim() === "") {
                try {
                  // eslint-disable-next-line no-console
                  console.warn("caseObj keys (clinical missing):", Object.keys(caseObj));
                } catch (e) {}
              }
            } else {
              // explicit null/no-case response -> block chat until case submitted
              setCaseExists(false);
            }
          }
        } catch (e: any) {
          // If the case fetch fails (404 / no data / other), treat as "no case" so the
          // required form is shown and the chat remains blocked until submission.
          // Keep a console warning for debugging.
          // eslint-disable-next-line no-console
          console.warn("/case fetch failed, treating as no-case:", e?.message ?? e);
          setCaseExists(false);
        }
      } catch (err: any) {
        console.error("failed to load messages", err);
        setMessagesError(err?.message ?? "Erro ao carregar mensagens");
        setMessages([]);
      } finally {
        if (mounted) setLoadingMessages(false);
        requestAnimationFrame(scrollToBottom);
      }
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [chatId, authStatus, refreshKey]);

  // (case auto-load removed — revert to previous behavior)

  function onScroll() {
    if (!listRef.current) return;
    const nearBottom = listRef.current.scrollHeight - listRef.current.scrollTop - listRef.current.clientHeight < 120;
    setShowScrollBtn(!nearBottom);
  }

  function handleCaseChange(field: keyof CaseData, value: string) {
    setCaseData((prev) => ({ ...prev, [field]: value }));
  }

  function handleFormChange(field: keyof CaseData, value: string) {
    setFormCaseData((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    // when the modal is shown (blocked), present an empty form
    if (isBlocked) setFormCaseData(emptyFormCaseData);
  }, [isBlocked]);

  async function submitUnlock(e: React.FormEvent) {
    e.preventDefault();

    // validação mínima
    if (!confirmChecked) return alert("Confirme que as informações estão corretas.");
    if (!formCaseData.patientName.trim()) return alert("Informe o nome do paciente.");
    if (!formCaseData.objective.trim()) return alert("Informe o objetivo geral do tratamento.");
    if (!formCaseData.patientConcerns.trim()) return alert("Informe as queixas do paciente.");
    if (!formCaseData.doctorComments.trim()) return alert("Informe os comentários do dentista.");

    if (!chatId) return alert("Chat inválido");

    setMessagesError(null);
    try {
      setSubmittingCase(true);

      // Build payload with PascalCase keys expected by backend C# model.
      const payload: any = {
        ChatSessionId: chatId,
        PatientName: formCaseData.patientName ?? null,
        Diagnosis: formCaseData.diagnostic ?? null,
        TreatmentPlan: formCaseData.treatmentPlan ?? null,
        MainConcerns: formCaseData.patientConcerns ?? null,
        DoctorComments: formCaseData.doctorComments ?? null,
        ClinicalConsiderations: formCaseData.clinicalNotes ?? null,
        TreatmentLimitations: formCaseData.treatmentLimitations ?? null,
        ObjectiveGeneral: formCaseData.objective ?? null,
        Confirmed: !!confirmChecked,
        // optional: who confirmed (not in original model but useful)
        ConfirmedBy: user?.id ?? null,
        // session token if backend needs it
        SessionToken: accessToken ?? null,
        // timestamps (server may override)
        CreatedAt: new Date().toISOString(),
        UpdatedAt: null,
      };

      // Debug: print payload before sending so you can verify ChatSessionId and keys
      try {
        // eslint-disable-next-line no-console
        console.log("[submitUnlock] PascalCase payload:", payload);
      } catch (e) {}

      await fetchJson<any>(`/api/chats/${chatId}/case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // On success, mark as unlocked locally and update status to aberto
      setUnlockFormDone(true);
      setCaseExists(true);
      setStatus("aberto");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error("failed to submit case", err);
      alert("Não foi possível enviar os dados do caso: " + (err?.message ?? err));
    } finally {
      setSubmittingCase(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-3 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name="Especialista" />
                <div>
                  <h2 className="font-semibold leading-tight">
                    {routedChatNo ? (
                      <>
                        Chat No: <span className="font-semibold">#{routedChatNo}</span>
                        {" — "}
                        {chatTitle ?? chatId}
                      </>
                    ) : (
                      chatTitle ?? `Chat: ${chatId}`
                    )}
                  </h2>
                  <div className="text-xs text-muted mt-1">
                    <span>ID: <b title={chatId} className="break-all">{chatId}</b></span>
                  </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="relative inline-flex">
                  <span className="h-2 w-2 rounded-full bg-brand-blue animate-ping-slow absolute opacity-70" />
                  <span className="h-2 w-2 rounded-full bg-brand-blue relative" />
                </span>
                Online {typing && <span className="text-muted">• digitando…</span>}
              </div>
            </div>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full ${
              status === "aberto"
                ? "bg-amber-100 text-amber-700"
                : status === "encerrado"
                ? "bg-slate-100 text-slate-600"
                : "bg-red-100 text-red-700"
            }`}
          >
            {statusLabel}
          </span>
          {/* debug panel removed */}
          {showUndoBanner && (
            <div className="ml-3 px-3 py-1 text-sm bg-yellow-50 text-yellow-800 rounded-md flex items-center gap-3">
              <span>Chat encerrado</span>
              <button onClick={undoClose} className="underline">
                Desfazer
              </button>
              <span className="text-xs text-muted">({undoCountdown}s)</span>
            </div>
          )}

          
        </div>

        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(255,42,149,0.04) 0%, rgba(243,244,246,1) 35%), radial-gradient(circle at 90% 80%, rgba(59,130,246,0.06) 0%, rgba(243,244,246,1) 45%)",
          }}
        >
            {messagesError && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-700">
                Erro ao carregar mensagens: {messagesError}
              </div>
            )}

            
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-sm rounded-2xl px-4 py-3 shadow-sm ${
                  m.isPalette
                    ? "bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue text-white"
                    : "bg-white"
                } ${m.pending ? "opacity-70 italic" : ""}`}
              >
                {m.type === "text" && <p className="text-sm">{m.content}</p>}
                {m.type === "image" && <img src={m.content} alt="imagem enviada" className="rounded-md max-h-60" />}
                {m.type === "video" && (
                  <video controls className="rounded-md max-h-60">
                    <source src={m.content} />
                  </video>
                )}
                {m.type === "audio" && (
                  <audio controls className="w-full">
                    <source src={m.content} />
                  </audio>
                )}
                <div className="mt-1">
                  <span className="text-[10px] opacity-70 block">
                    {m.pending
                      ? "Enviando..."
                      : new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {m.failed && (
                    <div className="text-[11px] text-red-600 mt-1 flex items-center gap-2">
                      <span>Falha ao enviar</span>
                      <button onClick={() => retrySend(m.id)} className="underline text-red-600 text-[11px]">
                        Tentar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-28 right-6 text-xs px-3 py-2 rounded-full bg-white shadow-soft border"
            >
              ↓ Novas mensagens
            </button>
          )}
        </div>

        <div className="border-t bg-white px-4 py-3 flex gap-2 items-center">
          {showSendControls ? (
            <>
              <label className={`text-xs px-3 py-2 bg-slate-100 rounded-md cursor-pointer ${cannotSend ? "opacity-60" : ""}`}>
                Img
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  disabled={cannotSend}
                  onChange={(e) => handleFile(e, "image")}
                />
              </label>

              <label className={`text-xs px-3 py-2 bg-slate-100 rounded-md cursor-pointer ${cannotSend ? "opacity-60" : ""}`}>
                Vídeo
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  disabled={cannotSend}
                  onChange={(e) => handleFile(e, "video")}
                />
              </label>

              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className={`text-xs px-3 py-2 bg-slate-100 rounded-md ${cannotSend ? "opacity-60" : ""}`}
                  type="button"
                  disabled={cannotSend}
                >
                  🎙️ Áudio
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 text-xs px-3 py-2 bg-red-100 text-red-700 rounded-md"
                  type="button"
                >
                  ⏹️ Gravando {formatTime(recordTime)}
                </button>
              )}

              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                placeholder={cannotSend ? "Chat encerrado" : isBlocked ? "Preencha o formulário para liberar o chat..." : "Escreva sua mensagem..."}
                disabled={cannotSend}
                className="flex-1"
              />

              <div className="flex items-center gap-2">
                {(isCurrentUserAdmin || !cannotSend) && (
                  <Button onClick={handleSendText} className="px-5 py-2">
                    Enviar
                  </Button>
                )}

                {isCurrentUserAdmin && !isLabelEncerrado() && (
                  <Button
                    type="button"
                    onClick={closeChat}
                    disabled={closingChat}
                    className="px-3 py-2 text-sm"
                  >
                    {closingChat ? "Encerrando..." : "Encerrar chat"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-muted">{cannotSend ? "Chat encerrado" : null}</div>
              <div className="flex items-center gap-2">
                {isCurrentUserAdmin && (
                  isLabelEncerrado() ? (
                    <Button type="button" onClick={undoClose} disabled={closingChat} className="px-3 py-2 text-sm">
                      {closingChat ? "Abrindo..." : "Reabrir chat"}
                    </Button>
                  ) : (
                    <Button type="button" onClick={closeChat} disabled={closingChat} className="px-3 py-2 text-sm">
                      {closingChat ? "Encerrando..." : "Encerrar chat"}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ASIDE */}
      <aside className="w-80 border-l bg-white p-4 hidden lg:block">
        <h3 className="font-semibold mb-2">Dados do caso</h3>
        <p className="text-sm text-muted mb-4">Informações rápidas do caso.</p>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted">Paciente:</div>
            <div className="font-medium mt-1 break-words">{caseData.patientName || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Diagnóstico:</div>
            <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs mt-1 break-words">{caseData.diagnostic || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Plano:</div>
            <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs mt-1 break-words">{caseData.treatmentPlan || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Dúvidas:</div>
            <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs mt-1 break-words">{caseData.doubts || "—"}</div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted">Objetivo geral</div>
            <div className="font-medium text-sm mt-1 break-words">{caseData.objective || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Principais preocupações do paciente</div>
            <div className="font-medium text-sm mt-1 break-words">{caseData.patientConcerns || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Comentários do doutor</div>
            <div className="font-medium text-sm mt-1 break-words">{caseData.doctorComments || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Considerações clínicas</div>
            <div className="font-medium text-sm mt-1 break-words">{caseData.clinicalNotes || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted">Limitações do plano de tratamento</div>
            <div className="font-medium text-sm mt-1 break-words">{caseData.treatmentLimitations || "—"}</div>
          </div>
        </div>

        {/* test button removed */}
      </aside>

      {/* MODAL (finalizado) */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" />

          <Card className="relative w-full max-w-5xl bg-white border p-0 overflow-hidden rounded-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Formulário obrigatório</h3>
                <p className="text-sm text-muted">Preencha para liberar o chat.</p>
              </div>

 
            </div>

            <div className="p-5 overflow-y-auto max-h-[80vh]">
              {/* Formulário (full-width) - rolável e campos horizontais */}
              <form onSubmit={submitUnlock} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted">Paciente</label>
                    <Input
                      defaultValue={formCaseData.patientName}
                      onChange={(e) => handleFormChange("patientName", e.target.value)}
                      placeholder="Nome do paciente"
                      className="mt-1 w-full text-sm py-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted">Diagnóstico</label>
                    <Input
                      defaultValue={formCaseData.diagnostic}
                      onChange={(e) => handleFormChange("diagnostic", e.target.value)}
                      placeholder="Diagnóstico"
                      className="mt-1 w-full text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted">Plano de tratamento</label>
                    <Input
                      defaultValue={formCaseData.treatmentPlan}
                      onChange={(e) => handleFormChange("treatmentPlan", e.target.value)}
                      placeholder="Ex: Distalização / Mesialização"
                      className="mt-1 w-full text-sm py-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted">Dúvidas principais</label>
                    <Input
                      defaultValue={formCaseData.doubts}
                      onChange={(e) => handleFormChange("doubts", e.target.value)}
                      placeholder="Ex: periodonto, ancoragem..."
                      className="mt-1 w-full text-sm py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted">Objetivo geral do tratamento</label>
                  <textarea
                    defaultValue={formCaseData.objective}
                    onChange={(e) => handleFormChange("objective", e.target.value)}
                    placeholder="Descreva o objetivo geral do tratamento..."
                    className="mt-1 w-full rounded-lg border p-3 h-36 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted">Principais preocupações do paciente</label>
                    <textarea
                      defaultValue={formCaseData.patientConcerns}
                      onChange={(e) => handleFormChange("patientConcerns", e.target.value)}
                      placeholder="Ex: Arco estreito, apinhamento, outros..."
                      className="mt-1 w-full rounded-lg border p-3 h-28 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted">Comentários do doutor</label>
                    <textarea
                      defaultValue={formCaseData.doctorComments}
                      onChange={(e) => handleFormChange("doctorComments", e.target.value)}
                      placeholder="Ex: a queixa da paciente é..."
                      className="mt-1 w-full rounded-lg border p-3 h-28 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted">Considerações clínicas (opcional)</label>
                    <textarea
                      defaultValue={formCaseData.clinicalNotes}
                      onChange={(e) => handleFormChange("clinicalNotes", e.target.value)}
                      placeholder="Ex: periodonto, perda óssea, gengiva fina..."
                      className="mt-1 w-full rounded-lg border p-3 h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted">Limitações do plano de tratamento (opcional)</label>
                    <textarea
                      defaultValue={formCaseData.treatmentLimitations}
                      onChange={(e) => handleFormChange("treatmentLimitations", e.target.value)}
                      placeholder="Ex: tempo, cooperação do paciente..."
                      className="mt-1 w-full rounded-lg border p-3 h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm">Confirmo que as informações estão corretas.</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={!confirmChecked || submittingCase} className="bg-brand-blue text-white px-6 py-2">
                      {submittingCase ? "Enviando..." : "Enviar e liberar chat"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
