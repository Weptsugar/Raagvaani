'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles } from 'lucide-react';
import type { Session, Message, UploadedFile } from '@/lib/types';
import { LANGUAGES } from '@/lib/types';
import {
  getSessions,
  createSession,
  deleteSession,
  renameSession,
  getMessages,
  sendChat,
  getFiles,
  uploadFile,
  deleteFile,
} from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { InputDock } from '@/components/InputDock';
import { LanguageToggle } from '@/components/LanguageToggle';

// ─── SpeechRecognition type augmentation ─────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionInstance = any;
type SpeechRecognitionEventInstance = any;


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Page() {
  // Core state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // UI state
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  // Keep ref in sync with state (for async callbacks)
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // ── Initialization ─────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    try {
      const fetchedFiles = await getFiles();
      setFiles(fetchedFiles);
    } catch {
      // silently fail — files are non-critical
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const msgs = await getMessages(sessionId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, []);

  const ensureActiveSession = useCallback(
    async (fetchedSessions: Session[]) => {
      if (fetchedSessions.length === 0) {
        // Create initial session
        const newSession = await createSession('New Chat');
        const session: Session = {
          id: newSession.id,
          title: newSession.title,
          created_at: newSession.created_at,
          updated_at: newSession.updated_at,
        };
        setSessions([session]);
        setActiveSessionId(session.id);
        setMessages([]);
      } else {
        setSessions(fetchedSessions);
        setActiveSessionId(fetchedSessions[0].id);
        await loadMessages(fetchedSessions[0].id);
      }
    },
    [loadMessages],
  );

  useEffect(() => {
    const init = async () => {
      try {
        const [fetchedSessions] = await Promise.all([
          getSessions(),
          loadFiles(),
        ]);
        await ensureActiveSession(fetchedSessions);
      } catch (err) {
        console.error('Init error:', err);
        // Create a fallback session if API is unreachable
        const now = new Date().toISOString();
        const fallback: Session = {
          id: 'local-' + Date.now(),
          title: 'New Chat',
          created_at: now,
          updated_at: now,
        };
        setSessions([fallback]);
        setActiveSessionId(fallback.id);
        setMessages([]);
      } finally {
        setIsInitialized(true);
      }
    };

    init();
  }, [ensureActiveSession, loadFiles]);

  // Load and persist active document ID per session
  useEffect(() => {
    if (activeSessionId) {
      const stored = localStorage.getItem(`ragvaani_active_doc_${activeSessionId}`);
      setActiveDocumentId(stored || null);
    } else {
      setActiveDocumentId(null);
    }
  }, [activeSessionId]);

  // Preload speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Trigger voice loading in Chrome/Edge
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleSelectFile = useCallback((docId: string | null) => {
    setActiveDocumentId(docId);
    if (activeSessionId) {
      if (docId !== null) {
        localStorage.setItem(`ragvaani_active_doc_${activeSessionId}`, docId);
      } else {
        localStorage.removeItem(`ragvaani_active_doc_${activeSessionId}`);
      }
    }
  }, [activeSessionId]);

  // ── Session change ─────────────────────────────────────────────────────────

  const handleSelectSession = useCallback(
    async (id: string) => {
      if (id === activeSessionId) return;
      setActiveSessionId(id);
      setMessages([]);
      setIsSidebarOpen(false);
      await loadMessages(id);
    },
    [activeSessionId, loadMessages],
  );

  // ── New chat ───────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    try {
      const newSession = await createSession('New Chat');
      const session: Session = {
        id: newSession.id,
        title: newSession.title,
        created_at: newSession.created_at,
        updated_at: newSession.updated_at,
      };
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, []);

  // ── Delete session ─────────────────────────────────────────────────────────

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setSessions((prev) => {
          const updated = prev.filter((s) => s.id !== id);
          if (activeSessionIdRef.current === id) {
            if (updated.length > 0) {
              setActiveSessionId(updated[0].id);
              loadMessages(updated[0].id);
            } else {
              // Create new session automatically
              createSession('New Chat').then((ns) => {
                const session: Session = {
                  id: ns.id,
                  title: ns.title,
                  created_at: ns.created_at,
                  updated_at: ns.updated_at,
                };
                setSessions([session]);
                setActiveSessionId(session.id);
                setMessages([]);
              });
            }
          }
          return updated;
        });
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    },
    [loadMessages],
  );

  // ── Rename session ─────────────────────────────────────────────────────────

  const handleRenameSession = useCallback(async (id: string, title: string) => {
    try {
      const updated = await renameSession(id, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)),
      );
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        const result = await uploadFile(file);
        // Refresh files list
        await loadFiles();
        if (result.document_id) {
          handleSelectFile(result.document_id);
        }
        console.log('Uploaded:', result.filename);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    },
    [loadFiles, handleSelectFile],
  );

  // ── Delete File ────────────────────────────────────────────────────────────

  const handleDeleteFile = useCallback(
    async (fileId: number) => {
      try {
        const fileToDelete = files.find(f => f.id === fileId);
        if (fileToDelete && fileToDelete.document_id === activeDocumentId) {
          handleSelectFile(null);
        }
        await deleteFile(fileId);
        await loadFiles();
      } catch (err) {
        console.error('Delete file failed:', err);
      }
    },
    [loadFiles, files, activeDocumentId, handleSelectFile],
  );

  // ── Polling Files ──────────────────────────────────────────────────────────

  useEffect(() => {
    const hasProcessing = files.some((f) => f.status === 'processing');
    if (!hasProcessing) return;

    const intervalId = setInterval(() => {
      loadFiles();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [files, loadFiles]);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (overrideText?: string, isVoice = false) => {
      const text = (overrideText ?? inputValue).trim();
      if (!text || isLoading || !activeSessionId) return;

      // If there's a file attached, upload it first
      if (selectedFile) {
        await handleUploadFile(selectedFile);
        setSelectedFile(null);
      }

      // Optimistic user message
      const userMsg: Message = {
        id: Date.now(),
        role: 'user',
        ui_markdown: text,
        voice_prose: text,
        is_voice_turn: isVoice,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);

      // Auto-title session on first message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId && s.title === 'New Chat') {
            const autoTitle =
              text.length > 40 ? text.slice(0, 38) + '…' : text;
            renameSession(activeSessionId, autoTitle).catch(() => {});
            return { ...s, title: autoTitle };
          }
          return s;
        }),
      );

      try {
        const response = await sendChat({
          question: text,
          session_id: activeSessionId,
          target_language: language,
          is_voice: isVoice,
          document_id: activeDocumentId,
        });

        const assistantMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          ui_markdown: response.ui_markdown,
          voice_prose: response.voice_prose,
          is_voice_turn: response.is_voice,
          created_at: new Date().toISOString(),
          route_used: response.route_used,
          latency_ms: response.latency_ms,
          sources: response.sources,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-speak if voice turn
        if (isVoice && response.voice_prose) {
          handleSpeak(response.voice_prose);
        }
      } catch (err) {
        console.error('Chat error:', err);
        const errorMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          ui_markdown:
            '⚠️ **Something went wrong.** Please check your connection and try again.',
          voice_prose: 'Something went wrong. Please try again.',
          is_voice_turn: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, activeSessionId, language, selectedFile, handleUploadFile],
  );

  // ── TTS ───────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.lang = targetLang;
    
    // Explicitly set the voice if available, which fixes issues where 
    // the OS/browser uses the default English voice for Hindi text.
    const voices = window.speechSynthesis.getVoices();
    let voice;
    
    if (language === 'hi') {
      // Prefer the Ananya Neural voice if available
      voice = voices.find(v => v.name.includes('Ananya') || v.voiceURI.includes('AnanyaNeural') || v.name.includes('hi-IN-AnanyaNeural'));
    }

    if (!voice) {
      voice = voices.find(v => v.lang === targetLang || v.lang.startsWith(language));
    }

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  // ── Voice input ───────────────────────────────────────────────────────────

  const handleMicToggle = useCallback(() => {
    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition: SpeechRecognitionInstance =
      new (SpeechRecognitionAPI as new () => SpeechRecognitionInstance)();
    recognitionRef.current = recognition;

    const currentLang = LANGUAGES.find((l) => l.code === language);
    recognition.lang = currentLang?.locale ?? 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: SpeechRecognitionEventInstance) => {
      const transcript = event.results[0][0].transcript as string;
      setInputValue(transcript);
      setIsListening(false);
      // Auto-submit voice
      setTimeout(() => {
        handleSubmit(transcript, true);
      }, 100);
    };

    recognition.start();
  }, [isListening, language, handleSubmit]);

  // ── Current session title ─────────────────────────────────────────────────

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const sessionTitle = activeSession?.title ?? 'RagVaani';

  // ── Loading splash ────────────────────────────────────────────────────────

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0e1a]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 40px rgba(99,102,241,0.6)',
            }}
            animate={{
              boxShadow: [
                '0 0 40px rgba(99,102,241,0.6)',
                '0 0 70px rgba(99,102,241,0.9)',
                '0 0 40px rgba(99,102,241,0.6)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
          </motion.div>
          <p
            className="text-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            RagVaani 2.0
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-500"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e1a]">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        files={files}
        activeDocumentId={activeDocumentId}
        onSelectFile={handleSelectFile}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onUploadFile={handleUploadFile}
        onDeleteFile={handleDeleteFile}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── TopBar ──────────────────────────────────────────────── */}
        <header
          className="flex-shrink-0 flex items-center h-14 px-4 gap-3"
          style={{
            background: 'rgba(10, 14, 26, 0.95)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Mobile hamburger */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#64748b',
            }}
            aria-label="Toggle sidebar"
          >
            <AnimatePresence mode="wait">
              {isSidebarOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Session title (center) */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
            <AnimatePresence mode="wait">
              <motion.h2
                key={sessionTitle}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold text-[#e2e8f0] truncate max-w-xs text-center"
              >
                {sessionTitle}
              </motion.h2>
            </AnimatePresence>
            {activeDocumentId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] text-indigo-400 font-semibold truncate max-w-xs flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20"
              >
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                Scoped to: {files.find(f => f.document_id === activeDocumentId)?.original_name || 'Loading...'}
              </motion.div>
            )}
          </div>

          {/* Language toggle (right) */}
          <div className="flex-shrink-0">
            <LanguageToggle
              language={language}
              onChange={setLanguage}
            />
          </div>
        </header>

        {/* ── Chat Area ───────────────────────────────────────────── */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          language={language}
          onSuggestionClick={(text) => {
            setInputValue(text);
          }}
          hasFiles={files.length > 0}
          onSpeak={handleSpeak}
        />

        {/* ── Input Dock ──────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <InputDock
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onMicToggle={handleMicToggle}
            isListening={isListening}
            isSending={isLoading}
            onFileSelect={(file) => setSelectedFile(file)}
            selectedFile={selectedFile}
            onRemoveFile={() => setSelectedFile(null)}
            language={language}
          />
        </div>
      </main>
    </div>
  );
}