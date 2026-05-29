import type {
  Session,
  Message,
  UploadedFile,
  ChatResponse,
  UploadResponse,
  CreateSessionResponse,
} from './types';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8001';

const USER_ID = 'demo-user';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers(extra?: Record<string, string>): HeadersInit {
  return {
    'X-User-ID': USER_ID,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<Session[]> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    headers: headers(),
    cache: 'no-store',
  });
  return handleResponse<Session[]>(res);
}

export async function createSession(title: string): Promise<CreateSessionResponse> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title }),
  });
  return handleResponse<CreateSessionResponse>(res);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API Error ${res.status}: ${text}`);
  }
}

export async function renameSession(
  sessionId: string,
  title: string,
): Promise<Session> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/title`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Session>(res);
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`, {
    headers: headers(),
    cache: 'no-store',
  });
  return handleResponse<Message[]>(res);
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatPayload {
  question: string;
  session_id: string;
  target_language: 'en' | 'hi';
  is_voice: boolean;
  file_id?: number | null;
  document_id?: string | null;
}

export async function sendChat(payload: ChatPayload): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return handleResponse<ChatResponse>(res);
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function getFiles(): Promise<UploadedFile[]> {
  const res = await fetch(`${BASE_URL}/files`, {
    headers: { 'X-User-ID': USER_ID },
    cache: 'no-store',
  });
  return handleResponse<UploadedFile[]>(res);
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'X-User-ID': USER_ID },
    body: formData,
  });
  return handleResponse<UploadResponse>(res);
}

export async function deleteFile(fileId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API Error ${res.status}: ${text}`);
  }
}

