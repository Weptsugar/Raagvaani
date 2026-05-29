'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Language } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  language: Language['code'];
  onSuggestionClick: (text: string) => void;
  hasFiles: boolean;
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS_EN = [
  { icon: '📊', text: 'Analyze a spreadsheet' },
  { icon: '📄', text: 'Summarize this document' },
  { icon: '🔢', text: 'Explain a formula' },
  { icon: '💬', text: 'Ask in Hindi' },
];

const SUGGESTIONS_HI = [
  { icon: '📊', text: 'स्प्रेडशीट का विश्लेषण करें' },
  { icon: '📄', text: 'इस दस्तावेज़ का सारांश बनाएं' },
  { icon: '🔢', text: 'एक सूत्र समझाएं' },
  { icon: '💬', text: 'Ask in English' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function EmptyState({
  language,
  onSuggestionClick,
  hasFiles,
}: EmptyStateProps) {
  const suggestions = language === 'hi' ? SUGGESTIONS_HI : SUGGESTIONS_EN;
  const headline =
    language === 'hi'
      ? 'आज क्या जानना चाहते हैं?'
      : 'What would you like to know?';
  const subline =
    language === 'hi'
      ? 'अपने दस्तावेज़ों के बारे में कुछ भी पूछें'
      : 'Ask anything about your uploaded documents';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
    },
  } as const;

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-6 py-12 select-none"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Icon with glow */}
      <motion.div
        variants={itemVariants}
        className="relative mb-8"
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)',
            transform: 'scale(2.5)',
          }}
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.3)',
          }}
        >
          <Sparkles className="w-10 h-10 text-white" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold text-center mb-3"
        style={{
          background: 'linear-gradient(135deg, #e2e8f0, #c4b5fd)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {headline}
      </motion.h1>

      {/* Subline */}
      <motion.p
        variants={itemVariants}
        className="text-[#64748b] text-base text-center mb-10 max-w-sm"
      >
        {subline}
      </motion.p>

      {/* Suggestion chips grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3 w-full max-w-md"
      >
        {suggestions.map((s) => (
          <motion.button
            key={s.text}
            onClick={() => onSuggestionClick(s.text)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-200 group"
            style={{
              background: 'rgba(17, 24, 39, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99, 102, 241, 0.15)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(17, 24, 39, 0.8)';
            }}
          >
            <span className="text-xl flex-shrink-0">{s.icon}</span>
            <span className="leading-snug">{s.text}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Upload hint */}
      <AnimatePresence>
        {!hasFiles && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-xs text-[#475569] flex items-center gap-1.5"
          >
            <span>Upload a file to get started</span>
            <span className="text-[#6366f1]">→</span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EmptyState;
