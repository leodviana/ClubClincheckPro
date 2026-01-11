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

type ChatStatus = "aberto" | "bloqueado" | "fechado";

type CaseData = {
  patientName: string;
  diagnostic: string;
  treatmentPlan: string;
  doubts: string;

  objective: string;
  patientConcerns: string;
  doctorComments: string;
  clinicalNotes: string;
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
  patientName: "Maria Paiva",
  diagnostic: "Classe II",
  treatmentPlan: "Distalização / Mesialização",
  doubts: "Periodonto e necessidade de ancoragem esquelética",

  objective: "",
  patientConcerns: "",
  doctorComments: "",
  clinicalNotes: "",
};

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId as string;

  const [status, setStatus] = useState<ChatStatus>("aberto"); // altere para "bloqueado" para testar o fluxo
  const [unlockFormDone, setUnlockFormDone] = useState(false);
  const isBlocked = status === "bloqueado" && !unlockFormDone;

  const [caseData, setCaseData] = useState<CaseData>(initialCaseData);

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
  const { user } = useAuth();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const typing = text.length > 0;

  const statusLabel = useMemo(() => {
    if (status === "aberto") return "Em aberto";
    if (status === "fechado") return "Encerrado";
    return "Bloqueado";
  }, [status]);

  function addMessage(type: Message["type"], content: string) {
    if (isBlocked) return;

    const isCurrentUserAdmin = (() => {
      const p = user?.profile;
      if (p != null && FROM_ADMIN_VALUES.includes(Number(p))) return true;
      const uid = user?.id;
      if (uid != null) {
        const n = Number(uid as any);
        if (!Number.isNaN(n) && FROM_ADMIN_VALUES.includes(n)) return true;
      }
      return false;
    })();

    const isCurrentUserPalette = (() => {
      const p = user?.profile;
      if (p != null && Number(p) === 3) return true;
      const uid = user?.id;
      if (uid != null) {
        const n = Number(uid as any);
        if (!Number.isNaN(n) && n === 3) return true;
      }
      return false;
    })();

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
    if (isBlocked) return;
    if (!text.trim()) return;

    const tempId = crypto.randomUUID();
    const isCurrentUserAdmin = (() => {
      const p = user?.profile;
      if (p != null && FROM_ADMIN_VALUES.includes(Number(p))) return true;
      const uid = user?.id;
      if (uid != null) {
        const n = Number(uid as any);
        if (!Number.isNaN(n) && FROM_ADMIN_VALUES.includes(n)) return true;
      }
      return false;
    })();

    const isCurrentUserPalette = (() => {
      const p = user?.profile;
      if (p != null && Number(p) === 3) return true;
      const uid = user?.id;
      if (uid != null) {
        const n = Number(uid as any);
        if (!Number.isNaN(n) && n === 3) return true;
      }
      return false;
    })();

    const tempMsg: Message = {
      id: tempId,
      from: isCurrentUserAdmin ? "admin" : "user",
      type: "text",
      content: text,
      createdAt: new Date().toISOString(),
      pending: true,
      senderId: user?.id,
      isPalette: isCurrentUserPalette,
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
        const createdAt = createdAtRaw ? normalizeCreatedAt(createdAtRaw) : msg.createdAt;

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
        // marque como não pendente (falha) para o usuário ver
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false } : m)));
      }
    })();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video" | "audio") {
    if (isBlocked) return;

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
    if (isBlocked) return;

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

    let mounted = true;
    async function loadMessages() {
      setLoadingMessages(true);
      setMessagesError(null);
      // limpa mensagens anteriores
      setMessages([]);

      try {
        // Tenta primeiro o endpoint canônico `/api/chats/{chatId}` que pode
        // retornar o chat com um array `messages`. Se não houver, tenta o
        // endpoint `/api/chats/{chatId}/messages` como fallback.
        // Try canonical messages endpoint first, but fall back to other
        // chat endpoints if the server exposes a different shape.
        const candidates = [
          `/api/chats/${chatId}/messages`
          
        ];

        let data: any = null;
        let lastErr: any = null;
        for (const path of candidates) {
          try {
            data = await fetchJson<any>(path);
            break;
          } catch (err) {
            lastErr = err;
          }
        }

        if (data == null) throw lastErr ?? new Error("failed to load messages");

        if (!mounted) return;

        // Normaliza resposta: aceita array direto, { messages: [...] } ou { data: [...] }
        let list = Array.isArray(data) ? data : data?.messages ?? data?.data ?? [];

        const mapped: Message[] = (list || []).map((it: any) => {
          const id = (it.id ?? it.message_id ?? it.isn_mensagem ?? it.uuid ?? crypto.randomUUID()).toString();

          // from: numeric code or actual sender id from backend
          let from: Message["from"] = "admin";
          const rawFrom = it.from ?? it.sender ?? it.from_user ?? it.user_id ?? null;
          let senderId: string | number | undefined = undefined;
          let isPalette = false;

          if (typeof rawFrom === "number") {
            // se rawFrom coincide com os códigos de role, trate como role
            if (rawFrom === FROM_USER_VALUE) {
              from = "user";
            } else if (FROM_ADMIN_VALUES.includes(rawFrom)) {
              from = "admin";
              if (rawFrom === 3) isPalette = true;
            } else {
              // caso seja um id numérico do usuário, armazene como senderId
              senderId = rawFrom;
              if (user?.id && rawFrom.toString() === user.id.toString()) from = "user";
            }
          } else if (typeof rawFrom === "string") {
            senderId = rawFrom;
            if (user?.id && rawFrom === user.id.toString()) from = "user";
            // tentativa simples: se rawFrom for 'user'/'admin'
            if (!senderId) {
              const r = rawFrom.toLowerCase();
              if (r === "user" || r === "paciente" || r === "cliente") from = "user";
              else if (r === "admin" || r === "especialista" || r === "staff") from = "admin";
            }
          }

          const content = it.content ?? it.text ?? it.message ?? it.body ?? it.url ?? "";

          // type: backend may use numeric codes; map to local types
          const rawType = it.type ?? it.tipo ?? it.message_type ?? null;
          let type: Message["type"] = "text";
          if (typeof rawType === "number") {
            type = TYPE_MAP_IN[rawType] ?? "text";
          } else if (typeof rawType === "string") {
            // tentar inferir por mimetype ou palavras-chave
            if (rawType.includes("image") || rawType === "image") type = "image";
            else if (rawType.includes("audio") || rawType === "audio") type = "audio";
            else if (rawType.includes("video") || rawType === "video") type = "video";
            else type = "text";
          }

          const createdAt = normalizeCreatedAt(it.createdAt ?? it.created_at ?? it.timestamp ?? it.dt_criacao ?? null);

          return { id, from, type, content, createdAt, senderId, isPalette } as Message;
        });

        setMessages(mapped);
      } catch (err: any) {
        console.error("failed to load messages", err);
        setMessagesError(err?.message ?? "Erro ao carregar mensagens");
        setMessages([]);
      } finally {
        if (mounted) setLoadingMessages(false);
        // pequena espera para rolar após render
        requestAnimationFrame(scrollToBottom);
      }
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [chatId, user?.id]);

  function onScroll() {
    if (!listRef.current) return;
    const nearBottom = listRef.current.scrollHeight - listRef.current.scrollTop - listRef.current.clientHeight < 120;
    setShowScrollBtn(!nearBottom);
  }

  function handleCaseChange(field: keyof CaseData, value: string) {
    setCaseData((prev) => ({ ...prev, [field]: value }));
  }

  function submitUnlock(e: React.FormEvent) {
    e.preventDefault();

    // validação mínima
    if (!caseData.objective.trim()) return alert("Informe o objetivo geral do tratamento.");
    if (!caseData.patientConcerns.trim()) return alert("Informe as queixas do paciente.");
    if (!caseData.doctorComments.trim()) return alert("Informe os comentários do dentista.");

    setUnlockFormDone(true);
    setStatus("aberto");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-3 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name="Especialista" />
            <div>
              <h2 className="font-semibold leading-tight">Chat: {chatId}</h2>
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
                : status === "fechado"
                ? "bg-slate-100 text-slate-600"
                : "bg-red-100 text-red-700"
            }`}
          >
            {statusLabel}
          </span>
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
                <span className="text-[10px] opacity-70 block mt-1">
                  {m.pending
                    ? "Enviando..."
                    : new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
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
          <label className={`text-xs px-3 py-2 bg-slate-100 rounded-md cursor-pointer ${isBlocked ? "opacity-60" : ""}`}>
            Img
            <input
              type="file"
              className="hidden"
              accept="image/*"
              disabled={isBlocked}
              onChange={(e) => handleFile(e, "image")}
            />
          </label>

          <label className={`text-xs px-3 py-2 bg-slate-100 rounded-md cursor-pointer ${isBlocked ? "opacity-60" : ""}`}>
            Vídeo
            <input
              type="file"
              className="hidden"
              accept="video/*"
              disabled={isBlocked}
              onChange={(e) => handleFile(e, "video")}
            />
          </label>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className={`text-xs px-3 py-2 bg-slate-100 rounded-md ${isBlocked ? "opacity-60" : ""}`}
              type="button"
              disabled={isBlocked}
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
            placeholder={isBlocked ? "Preencha o formulário para liberar o chat..." : "Escreva sua mensagem..."}
            disabled={isBlocked}
            className="flex-1"
          />

          <Button onClick={handleSendText} disabled={isBlocked} className="px-5 py-2">
            Enviar
          </Button>
        </div>
      </div>

      {/* ASIDE */}
      <aside className="w-80 border-l bg-white p-4 hidden lg:block">
        <h3 className="font-semibold mb-2">Dados do caso</h3>
        <p className="text-sm text-muted mb-4">Informações rápidas do caso.</p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Paciente:</span>
            <span className="font-medium">{caseData.patientName}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted">Diagnóstico:</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">{caseData.diagnostic}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted">Plano:</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
              {caseData.treatmentPlan}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted">Dúvidas:</span>
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">{caseData.doubts}</span>
          </div>
        </div>

        {/* Botão de teste para ver o bloqueio */}
        <div className="mt-5">
          <Button
            type="button"
            className="w-full justify-center"
            onClick={() => {
              setUnlockFormDone(false);
              setStatus("bloqueado");
            }}
          >
            Testar bloqueio
          </Button>
        </div>
      </aside>

      {/* MODAL (bloqueado) */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" />

          <Card className="relative w-full max-w-3xl bg-white border p-0 overflow-hidden rounded-2xl">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Formulário obrigatório</h3>
                <p className="text-sm text-muted">Preencha para liberar o chat.</p>
              </div>

              <button
                className="text-sm text-muted hover:text-text"
                onClick={() => alert("Este chat está bloqueado. Preencha o formulário para liberar.")}
                type="button"
              >
                Ajuda
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Informações (lado esquerdo) */}
              <div className="p-5 bg-slate-50 border-b md:border-b-0 md:border-r">
                <h4 className="font-medium mb-3">Dados do caso</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Paciente:</span>
                    <span className="font-medium">{caseData.patientName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Diagnóstico:</span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                      {caseData.diagnostic}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Plano:</span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                      {caseData.treatmentPlan}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Dúvidas:</span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                      {caseData.doubts}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted">
                  Observação: após envio do formulário, este chat será liberado automaticamente.
                </div>
              </div>

              {/* Formulário (lado direito) */}
              <form onSubmit={submitUnlock} className="p-5 space-y-3">
                <div>
                  <label className="text-xs text-muted">Objetivo geral do tratamento</label>
                  <Input
                    value={caseData.objective}
                    onChange={(e) => handleCaseChange("objective", e.target.value)}
                    placeholder="Descreva o objetivo geral do tratamento"
                    className="mt-1 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted">Queixas do paciente</label>
                  <Input
                    value={caseData.patientConcerns}
                    onChange={(e) => handleCaseChange("patientConcerns", e.target.value)}
                    placeholder="Ex: arco estreito, apinhamento, estética..."
                    className="mt-1 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted">Comentários do dentista</label>
                  <Input
                    value={caseData.doctorComments}
                    onChange={(e) => handleCaseChange("doctorComments", e.target.value)}
                    placeholder="Ex: prioridade em distalização, ancoragem..."
                    className="mt-1 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted">Observações clínicas (opcional)</label>
                  <Input
                    value={caseData.clinicalNotes}
                    onChange={(e) => handleCaseChange("clinicalNotes", e.target.value)}
                    placeholder="Ex: periodonto, perda óssea, gengiva fina..."
                    className="mt-1 w-full"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-2xl border bg-white hover:bg-slate-50"
                    onClick={() => alert("Este chat está bloqueado. Você precisa enviar o formulário para liberar.")}
                  >
                    Cancelar
                  </button>
                  <Button type="submit">Liberar chat</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
