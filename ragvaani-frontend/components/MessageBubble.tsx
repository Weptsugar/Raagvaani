'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  User,
  Sparkles,
  Copy,
  Check,
  Volume2,
  Zap,
  Brain,
  Database,
} from 'lucide-react';
import type { Message } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  onSpeak: (text: string) => void;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UserAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <User className="w-4 h-4 text-[#94a3b8]" />
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        boxShadow: '0 0 16px rgba(99,102,241,0.5)',
      }}
    >
      <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
    </div>
  );
}

// ─── Route badge ──────────────────────────────────────────────────────────────

function RouteBadge({ route, latency }: { route: string; latency?: number }) {
  const lower = route.toLowerCase();
  let icon = <Zap className="w-3 h-3" />;
  let label = 'Direct';
  let color = '#10b981';

  if (lower.includes('cache') || lower.includes('cached')) {
    icon = <Database className="w-3 h-3" />;
    label = 'Cached';
    color = '#06b6d4';
  } else if (
    lower.includes('ai') ||
    lower.includes('rag') ||
    lower.includes('llm') ||
    lower.includes('core')
  ) {
    icon = <Brain className="w-3 h-3" />;
    label = 'AI Core';
    color = '#a78bfa';
  }

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}30`,
        color,
      }}
    >
      {icon}
      <span>
        {label}
        {latency !== undefined && ` (${latency}ms)`}
      </span>
    </div>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative my-3 rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(99,102,241,0.2)',
        background: '#1a1f2e',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(99,102,241,0.08)',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: '#7c6bf8', fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-150"
          style={{ color: copied ? '#10b981' : '#64748b' }}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          background: 'transparent',
          fontSize: '13px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          lineHeight: '1.6',
        }}
        showLineNumbers={value.split('\n').length > 4}
        lineNumberStyle={{
          color: '#374151',
          userSelect: 'none',
          paddingRight: '16px',
          minWidth: '2em',
        }}
        wrapLongLines={false}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MessageBubble({ message, onSpeak }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    const text = message.ui_markdown;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.ui_markdown]);

  const handleSpeak = useCallback(() => {
    onSpeak(message.voice_prose || message.ui_markdown);
  }, [message.voice_prose, message.ui_markdown, onSpeak]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className={`flex gap-3 px-4 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      {/* Bubble content */}
      <div
        className={`flex flex-col gap-2 max-w-[78%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Message bubble */}
        {isUser ? (
          <div
            className="px-4 py-3 rounded-2xl rounded-br-none text-sm leading-relaxed text-[#e2e8f0]"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(71,85,105,0.35))',
              border: '1px solid rgba(99,102,241,0.25)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="whitespace-pre-wrap break-words">{message.ui_markdown}</p>
          </div>
        ) : (
          <div
            className="px-4 py-4 rounded-2xl rounded-bl-none"
            style={{
              background: 'rgba(13, 17, 23, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="prose-ragvaani text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeValue = String(children).replace(/\n$/, '');
                    const isBlock = codeValue.includes('\n') || match;

                    if (isBlock) {
                      return (
                        <CodeBlock
                          language={match ? match[1] : 'text'}
                          value={codeValue}
                        />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {message.ui_markdown}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Assistant-only: meta row */}
        {!isUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-2 px-1"
          >
            {/* Source chips */}
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#64748b',
                    }}
                  >
                    <span>📄</span>
                    <span className="max-w-[120px] truncate">{src}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Route badge */}
            {message.route_used && (
              <RouteBadge route={message.route_used} latency={message.latency_ms} />
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleSpeak}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150"
                style={{ color: '#4b5563' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#818cf8';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#4b5563';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                aria-label="Speak response"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150"
                style={{ color: copied ? '#10b981' : '#4b5563' }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#818cf8';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copied) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#4b5563';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
                aria-label="Copy response"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default MessageBubble;
