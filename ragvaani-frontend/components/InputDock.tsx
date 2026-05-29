'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Paperclip, X, FileText } from 'lucide-react';
import type { Language } from '@/lib/types';
import { LANGUAGES } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface InputDockProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle: () => void;
  isListening: boolean;
  isSending: boolean;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onRemoveFile: () => void;
  language: Language['code'];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InputDock({
  value,
  onChange,
  onSubmit,
  onMicToggle,
  isListening,
  isSending,
  onFileSelect,
  selectedFile,
  onRemoveFile,
  language,
}: InputDockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const placeholder =
    LANGUAGES.find((l) => l.code === language)?.placeholder ??
    'Ask anything about your documents...';

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 6 + 32;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  // ── Global drag-over detection ────────────────────────────────────────────
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null || !(e.relatedTarget as Node).nodeType) {
        setIsDragOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFileSelect(file);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [onFileSelect]);

  // ── Key handler ───────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isSending) {
          onSubmit();
        }
      }
    },
    [value, isSending, onSubmit],
  );

  // ── File input handler ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
    }
  };

  const canSend = value.trim().length > 0 && !isSending;

  return (
    <div className="relative px-4 pb-4 pt-2">
      {/* Drag-over overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-20 rounded-2xl m-2 flex items-center justify-center pointer-events-none"
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '2px dashed rgba(99, 102, 241, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <Paperclip className="w-8 h-8 text-indigo-400" />
              <p className="text-indigo-300 font-semibold text-sm">Drop file to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main dock */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Focus glow ring - always present but animates with css */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.0)',
          }}
        />

        {/* Selected file chip */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pt-3 pb-0"
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#a5b4fc',
                }}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                <button
                  onClick={onRemoveFile}
                  className="ml-1 text-[#6b7280] hover:text-[#f43f5e] transition-colors duration-150"
                  aria-label="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-3">
          {/* Mic button */}
          <button
            onClick={onMicToggle}
            className="relative flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              background: isListening
                ? 'rgba(244, 63, 94, 0.15)'
                : 'rgba(255, 255, 255, 0.04)',
              border: isListening
                ? '1px solid rgba(244, 63, 94, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.06)',
              color: isListening ? '#f43f5e' : '#64748b',
            }}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {/* Pulse ring when listening */}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(244,63,94,0.4)',
                    '0 0 0 6px rgba(244,63,94,0)',
                  ],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Paperclip button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: '#64748b',
            }}
            aria-label="Attach file"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xlsx,.csv,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-6 py-1.5 placeholder:text-[#3d4a5c] text-[#e2e8f0] scrollbar-hide"
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              minHeight: '38px',
              maxHeight: '168px',
            }}
            aria-label="Chat input"
          />

          {/* Send button */}
          <motion.button
            onClick={() => canSend && onSubmit()}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : {}}
            whileTap={canSend ? { scale: 0.95 } : {}}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none"
            style={{
              background: canSend
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.05)',
              border: canSend
                ? 'none'
                : '1px solid rgba(255,255,255,0.06)',
              color: canSend ? '#ffffff' : '#374151',
              boxShadow: canSend
                ? '0 0 20px rgba(99,102,241,0.4)'
                : 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
            aria-label="Send message"
          >
            {isSending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Bottom hint */}
        <div className="px-4 pb-2.5">
          <p className="text-[10px] text-[#2d3a4a] text-center">
            Enter to send · Shift+Enter for new line · Drag & drop files
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default InputDock;
