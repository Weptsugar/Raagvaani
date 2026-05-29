'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  Upload,
  ChevronDown,
  ChevronRight,
  Files,
  Clock,
  Calendar,
} from 'lucide-react';
import type { Session, UploadedFile } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  files: UploadedFile[];
  activeDocumentId: string | null;
  onSelectFile: (docId: string | null) => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteFile: (fileId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupSessionsByDate(sessions: Session[]): {
  today: Session[];
  thisWeek: Session[];
  earlier: Session[];
} {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  const today: Session[] = [];
  const thisWeek: Session[] = [];
  const earlier: Session[] = [];

  for (const s of sessions) {
    const d = new Date(s.updated_at || s.created_at);
    if (d >= startOfToday) {
      today.push(s);
    } else if (d >= startOfWeek) {
      thisWeek.push(s);
    } else {
      earlier.push(s);
    }
  }

  return { today, thisWeek, earlier };
}

function statusColor(status: UploadedFile['status']) {
  switch (status) {
    case 'ready': return '#10b981';
    case 'processing': return '#f59e0b';
    case 'error': return '#f43f5e';
    default: return '#64748b';
  }
}

function statusLabel(status: UploadedFile['status']) {
  switch (status) {
    case 'ready': return 'Ready';
    case 'processing': return 'Processing';
    case 'error': return 'Error';
    default: return 'Pending';
  }
}

function fileTypeIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('doc')) return '📘';
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return '📗';
  if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg')) return '🖼️';
  return '📄';
}

// ─── Session Item ─────────────────────────────────────────────────────────────

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(session.title);
    setTimeout(() => {
      inputRef.current?.select();
    }, 50);
  };

  const handleEditSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(session.title);
    setIsEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isEditing && onSelect()}
      className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group"
      style={{
        background: isActive
          ? 'rgba(99,102,241,0.12)'
          : isHovered
          ? 'rgba(255,255,255,0.04)'
          : 'transparent',
        borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
      }}
    >
      {/* Active glow */}
      {isActive && (
        <div
          className="absolute left-0 inset-y-0 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 8px rgba(99,102,241,0.8)',
          }}
        />
      )}

      {/* Session title / edit input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') handleEditCancel();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none text-sm text-[#e2e8f0] border-b border-[#6366f1] pb-0.5"
            style={{ fontFamily: 'var(--font-inter)' }}
            autoFocus
          />
        ) : (
          <p
            className="text-sm truncate"
            style={{ color: isActive ? '#e2e8f0' : '#94a3b8' }}
          >
            {session.title}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <AnimatePresence>
        {(isHovered || isActive) && !isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEditStart}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors duration-150"
              style={{ color: '#64748b' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              aria-label="Rename session"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors duration-150"
              style={{ color: '#64748b' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              aria-label="Delete session"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEditSave}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              style={{ color: '#10b981', background: 'rgba(16,185,129,0.12)' }}
              aria-label="Save rename"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEditCancel}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              style={{ color: '#64748b', background: 'rgba(255,255,255,0.05)' }}
              aria-label="Cancel rename"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  icon,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 mt-2">
      <span className="text-[#3d4a5c]">{icon}</span>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[#3d4a5c]">
        {label}
      </span>
    </div>
  );
}

// ─── File Item ────────────────────────────────────────────────────────────────

function FileItem({
  file,
  isActive,
  onSelect,
  onDelete,
}: {
  file: UploadedFile;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const color = statusColor(file.status);
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = () => {
    if (file.status === 'ready') {
      onSelect();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 relative group ${
        file.status === 'ready' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
      }`}
      style={{
        background: isActive
          ? 'rgba(99,102,241,0.12)'
          : isHovered && file.status === 'ready'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)',
        borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
      }}
    >
      <span className="text-base flex-shrink-0">{fileTypeIcon(file.file_type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#94a3b8] truncate">
          {file.original_name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {/* Status dot */}
          <div className="relative">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: color }}
            />
            {file.status === 'processing' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: color }}
                animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <span className="text-[10px]" style={{ color }}>
            {statusLabel(file.status)}
          </span>
        </div>
      </div>
      
      {/* Delete button */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            className="flex items-center flex-shrink-0"
          >
            <button
              onClick={handleDelete}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors duration-150"
              style={{ color: '#64748b' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              aria-label="Delete file"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar Inner Content ────────────────────────────────────────────────────

function SidebarContent({
  sessions,
  activeSessionId,
  files,
  activeDocumentId,
  onSelectFile,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onUploadFile,
  onDeleteFile,
}: Omit<SidebarProps, 'isOpen' | 'onToggle'>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const { today, thisWeek, earlier } = groupSessionsByDate(sessions);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)',
            }}
          >
            <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1
              className="text-base font-bold leading-none"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              RagVaani
            </h1>
            <p className="text-[10px] text-[#3d4a5c] font-medium mt-0.5">
              2.0 · Document AI
            </p>
          </div>
        </div>
      </div>

      {/* ── New Chat Button ────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        <motion.button
          onClick={onNewChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 30px rgba(99,102,241,0.5), 0 4px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 20px rgba(99,102,241,0.3)';
          }}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div
        className="mx-3 mb-2"
        style={{ height: '1px', background: 'rgba(99,102,241,0.1)' }}
      />

      {/* ── Sessions List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-hide">
        {sessions.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-[#3d4a5c]">No conversations yet.</p>
            <p className="text-xs text-[#3d4a5c] mt-1">Start a new chat above!</p>
          </div>
        )}

        {today.length > 0 && (
          <>
            <SectionHeader
              label="Today"
              icon={<Clock className="w-3 h-3" />}
              count={today.length}
            />
            <AnimatePresence>
              {today.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onSelect={() => onSelectSession(s.id)}
                  onDelete={() => onDeleteSession(s.id)}
                  onRename={(title) => onRenameSession(s.id, title)}
                />
              ))}
            </AnimatePresence>
          </>
        )}

        {thisWeek.length > 0 && (
          <>
            <SectionHeader
              label="This Week"
              icon={<Calendar className="w-3 h-3" />}
              count={thisWeek.length}
            />
            <AnimatePresence>
              {thisWeek.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onSelect={() => onSelectSession(s.id)}
                  onDelete={() => onDeleteSession(s.id)}
                  onRename={(title) => onRenameSession(s.id, title)}
                />
              ))}
            </AnimatePresence>
          </>
        )}

        {earlier.length > 0 && (
          <>
            <SectionHeader
              label="Earlier"
              icon={<ChevronRight className="w-3 h-3" />}
              count={earlier.length}
            />
            <AnimatePresence>
              {earlier.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onSelect={() => onSelectSession(s.id)}
                  onDelete={() => onDeleteSession(s.id)}
                  onRename={(title) => onRenameSession(s.id, title)}
                />
              ))}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Files Section ─────────────────────────────────────────── */}
      <div
        className="mx-3 mt-2"
        style={{ height: '1px', background: 'rgba(99,102,241,0.1)' }}
      />

      <div className="px-2 py-2">
        {/* Files header */}
        <button
          onClick={() => setFilesOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest font-semibold text-[#3d4a5c] hover:text-[#64748b] transition-colors duration-150"
        >
          <div className="flex items-center gap-1.5">
            <Files className="w-3 h-3" />
            <span>Files ({files.length})</span>
          </div>
          <ChevronDown
            className="w-3 h-3 transition-transform duration-200"
            style={{ transform: filesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </button>

        <AnimatePresence>
          {filesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 mt-1 mb-1"
                style={{
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px dashed rgba(99,102,241,0.25)',
                  color: '#6366f1',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.25)';
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload File
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />

              {/* File list */}
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                {files.length === 0 && (
                  <p className="text-[10px] text-[#2d3a4a] px-3 py-2">
                    No files uploaded yet
                  </p>
                )}
                {files.map((f) => (
                  <FileItem
                    key={f.id}
                    file={f}
                    isActive={f.document_id === activeDocumentId}
                    onSelect={() => onSelectFile(f.document_id === activeDocumentId ? null : f.document_id)}
                    onDelete={() => onDeleteFile(f.id!)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────

export function Sidebar(props: SidebarProps) {
  const { isOpen, onToggle } = props;

  const sidebarContent = (
    <SidebarContent
      sessions={props.sessions}
      activeSessionId={props.activeSessionId}
      files={props.files}
      activeDocumentId={props.activeDocumentId}
      onSelectFile={props.onSelectFile}
      onNewChat={props.onNewChat}
      onSelectSession={props.onSelectSession}
      onDeleteSession={props.onDeleteSession}
      onRenameSession={props.onRenameSession}
      onUploadFile={props.onUploadFile}
      onDeleteFile={props.onDeleteFile}
    />
  );

  return (
    <>
      {/* Desktop Sidebar — always visible ≥ md */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 h-full"
        style={{
          width: '280px',
          background: 'rgba(13, 17, 23, 0.95)',
          borderRight: '1px solid rgba(99, 102, 241, 0.1)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {sidebarContent}
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar — drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="md:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: '280px',
              background: 'rgba(13, 17, 23, 0.98)',
              borderRight: '1px solid rgba(99, 102, 241, 0.15)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
