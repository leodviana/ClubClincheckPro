export type Credit = {
  id: string;
  title?: string | null;
  remaining?: number;
  status?: string | null;
  createdAt?: string | null;
  openAt?: string | null;
  closeAt?: string | null;
  treatmentPlan?: string | null;
  caseCreatedAt?: string | null;
  caseUpdatedAt?: string | null;
};

export type CreditStatus = {
  key: "aberto" | "encerrado" | "nao_iniciado";
  label: string;
  className: string;
};

function findPatientName(obj: any, depth = 2): string | null {
  if (!obj || depth < 0) return null;
  if (typeof obj === "string") return obj.trim() || null;
  if (typeof obj !== "object") return null;

  const keys = Object.keys(obj || {});
  const re = /patient.*name|patient_name|patientname|patient|nome|name$/i;
  
  // 1. Scan imediato por chaves diretas
  for (const k of keys) {
    try {
      const v = obj[k];
      if (v == null) continue;
      if (typeof v === "string" && String(v).trim() !== "" && re.test(k)) return String(v).trim();
    } catch (e) {}
  }

  // 2. Scan raso em valores
  for (const k of keys) {
    try {
      const v = obj[k];
      if (typeof v === "string" && String(v).trim() !== "" && re.test(k)) return String(v).trim();
    } catch (e) {}
  }

  // 3. Recursão limitada
  for (const k of keys) {
    try {
      const v = obj[k];
      const found = findPatientName(v, depth - 1);
      if (found) return found;
    } catch (e) {}
  }

  return null;
}

export function normalizeCredits(data: any): Credit[] {
  const rawList = Array.isArray(data) ? data : data?.data ?? [];

  return (rawList || []).map((it: any) => {
    const src = it.case ?? it.caseInfo ?? it.caseData ?? it.case_obj ?? it.case_info ?? it.case_info_camel ?? it;

    const idCandidate =
      it.id ?? it.chatId ?? it.chat_id ?? it.chatSessionId ?? it.chatSessionID ?? it.chat_session_id ?? it.uuid ?? it.uuid_chat ?? src?.chatSessionId ?? src?.chatSessionID ?? src?.chat_session_id ?? "";

    // try explicit common nested locations first then deep-find
    const explicitSrc = it.caseInfo ?? it.case_info ?? it.case ?? it.caseData ?? src;
    const foundExplicit =
      explicitSrc?.patientName ?? explicitSrc?.PatientName ?? explicitSrc?.patient_name ?? explicitSrc?.name ?? null;

    const foundPatient = foundExplicit ?? findPatientName(it) ?? findPatientName(src);
    const titleCandidate =
      foundPatient ?? src?.patientName ?? src?.PatientName ?? src?.patient_name ?? it.patientName ?? it.PatientName ?? it.patient_name ?? it.title ?? it.nome ?? it.caseTitle ?? it.title_chat ?? null;

    let title: string | null = titleCandidate && String(titleCandidate).trim() ? String(titleCandidate).trim() : null;

    // Filter out values that are just the chat id or a generated "Chat <id>" label
    if (title) {
      try {
        const idStr = String(idCandidate || "").trim();
        const compactId = idStr.replace(/-/g, "").toLowerCase();
        const tLower = title.toLowerCase();

        const isExactId = title === idStr;
        const containsId = idStr && title.includes(idStr);
        const containsCompactId = compactId && tLower.includes(compactId);
        const looksLikeChatLabel = /^chat\s*[:\-]?\s*[0-9a-f\-]{6,}/i.test(title);

        if (isExactId || containsId || containsCompactId || looksLikeChatLabel) {
          title = null;
        }
      } catch (e) {}
    }

    const mappedObj = {
      id: String(idCandidate),
      title,
      remaining: it.remaining ?? it.creditos ?? it.messagesRemaining ?? 0,
      status: it.status ?? it.state ?? it.status_text ?? undefined,
      createdAt: src?.createdAt ?? src?.created_at ?? it.createdAt ?? it.created_at ?? it.dt_criacao ?? null,
      openAt: it.openedAt ?? it.openAt ?? it.open_at ?? it.dt_abertura ?? src?.openAt ?? src?.open_at ?? null,
      closeAt: it.closedAt ?? it.closeAt ?? it.closed_at ?? it.dt_encerramento ?? src?.closedAt ?? src?.closed_at ?? null,
      treatmentPlan: src?.treatmentPlan ?? src?.treatment_plan ?? src?.TreatmentPlan ?? it.treatmentPlan ?? it.treatment_plan ?? it.plano ?? null,
      caseCreatedAt: src?.createdAt ?? src?.created_at ?? null,
      caseUpdatedAt: src?.updatedAt ?? src?.updated_at ?? null,
    } as Credit;

    // Normalize empty strings to null
    if (!mappedObj.title || String(mappedObj.title).trim() === "") mappedObj.title = null;
    if (!mappedObj.treatmentPlan || String(mappedObj.treatmentPlan).trim() === "") mappedObj.treatmentPlan = null;
    if (!mappedObj.createdAt || String(mappedObj.createdAt).trim() === "") mappedObj.createdAt = null;
    if (!mappedObj.openAt || String(mappedObj.openAt).trim() === "") mappedObj.openAt = null;
    if (!mappedObj.closeAt || String(mappedObj.closeAt).trim() === "") mappedObj.closeAt = null;
    if (!mappedObj.caseCreatedAt || String(mappedObj.caseCreatedAt).trim() === "") mappedObj.caseCreatedAt = null;
    if (!mappedObj.caseUpdatedAt || String(mappedObj.caseUpdatedAt).trim() === "") mappedObj.caseUpdatedAt = null;

    return mappedObj;
  });
}

export function normalizeStatus(raw: any): CreditStatus {
  if (raw == null) return { key: "nao_iniciado", label: "Não iniciado", className: "bg-slate-100 text-slate-600" };
  
  if (typeof raw === "number" || /^\d+$/.test(String(raw))) {
    const n = Number(raw);
    if (n === 1) return { key: "aberto", label: "Aberto", className: "bg-green-100 text-green-700" };
    if (n === 2) return { key: "encerrado", label: "Encerrado", className: "bg-slate-100 text-slate-600" };
    return { key: "nao_iniciado", label: "Não iniciado", className: "bg-slate-100 text-slate-600" };
  }

  const s = String(raw).toLowerCase();
  // Status 'aberto' variations
  if (s.includes("open") || s.includes("abert")) {
    return { key: "aberto", label: "Em aberto", className: "bg-green-100 text-green-700" };
  }
  // Status 'encerrado' variations
  if (s.includes("clos") || s.includes("fech") || s.includes("encerr") || s.includes("lock") || s.includes("bloq") || s.includes("final")) {
    return { key: "encerrado", label: "Encerrado", className: "bg-slate-100 text-slate-600" };
  }

  return { key: "nao_iniciado", label: String(raw), className: "bg-slate-100 text-slate-600" };
}

export function formatDate(v?: string | null) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(v);
  }
}
