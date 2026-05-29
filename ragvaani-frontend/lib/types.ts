// ─── Types ──────────────────────────────────────────────────────────────────

export type Message = {
  id?: number;
  role: 'user' | 'assistant';
  ui_markdown: string;
  voice_prose: string;
  is_voice_turn: boolean;
  created_at?: string;
  route_used?: string;
  latency_ms?: number;
  sources?: string[];
};

export type Session = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type UploadedFile = {
  id: number;
  document_id: string;
  original_name: string;
  file_type: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
};

export type Language = {
  code: 'en' | 'hi';
  label: string;
  locale: string;
  placeholder: string;
};

export const LANGUAGES: Language[] = [
  {
    code: 'en',
    label: 'EN',
    locale: 'en-US',
    placeholder: 'Ask anything about your documents...',
  },
  {
    code: 'hi',
    label: 'हिं',
    locale: 'hi-IN',
    placeholder: 'अपने दस्तावेज़ के बारे में पूछें...',
  },
];

// ─── API Response Types ──────────────────────────────────────────────────────

export type ChatResponse = {
  ui_markdown: string;
  voice_prose: string;
  route_used: string;
  latency_ms: number;
  sources: string[];
  is_voice: boolean;
};

export type UploadResponse = {
  file_id: number;
  document_id: string;
  filename: string;
  status: string;
};

export type CreateSessionResponse = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};
