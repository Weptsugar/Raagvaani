'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Language } from '@/lib/types';
import { LANGUAGES } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LanguageToggleProps {
  language: Language['code'];
  onChange: (lang: Language['code']) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div
      className="relative flex items-center rounded-xl p-1 gap-1"
      style={{
        background: 'rgba(13, 17, 23, 0.9)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
      }}
    >
      {LANGUAGES.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => onChange(lang.code)}
            className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none"
            style={{
              color: isActive ? '#ffffff' : '#64748b',
              zIndex: 1,
            }}
            aria-label={`Switch to ${lang.label}`}
          >
            {isActive && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10">{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageToggle;
