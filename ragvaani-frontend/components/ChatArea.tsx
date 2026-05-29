'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MessageBubble } from '@/components/MessageBubble';
import { EmptyState } from '@/components/EmptyState';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  language: 'en' | 'hi';
  onSuggestionClick: (text: string) => void;
  hasFiles: boolean;
  onSpeak: (text: string) => void;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className="flex gap-3 px-4 py-3"
    >
      {/* Assistant avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 0 16px rgba(99,102,241,0.5)',
        }}
      >
        <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
      </div>

      {/* Dot bubble */}
      <div
        className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-none"
        style={{
          background: 'rgba(13, 17, 23, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: '#6366f1' }}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatArea({
  messages,
  isLoading,
  language,
  onSuggestionClick,
  hasFiles,
  onSpeak,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}
    >
      {!hasMessages ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            language={language}
            onSuggestionClick={onSuggestionClick}
            hasFiles={hasFiles}
          />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={msg.id ?? `msg-${index}`}
                message={msg}
                onSpeak={onSpeak}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isLoading && <TypingIndicator />}
          </AnimatePresence>

          <div ref={bottomRef} className="h-4" />
        </div>
      )}
    </div>
  );
}

export default ChatArea;
