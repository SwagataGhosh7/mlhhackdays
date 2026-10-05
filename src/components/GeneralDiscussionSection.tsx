import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ArrowRight,
  Hash,
  MessageSquare,
  Send,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { GitHubUserProfile } from '../types';

export interface DiscussionMessageItem {
  id: string;
  channel: string;
  authorHandle: string;
  authorName: string;
  authorAvatar?: string;
  repoTag?: string;
  text: string;
  createdAt: string;
  reactions: Record<string, number>;
}

export interface OnlineContributor {
  socketId: string;
  handle: string;
  name: string;
  avatarUrl?: string;
  activeChannel: string;
  joinedAt: string;
}

interface GeneralDiscussionSectionProps {
  currentRepoFullName: string;
  authenticatedUser: GitHubUserProfile | null;
  onAnalyzeRepoByName: (fullName: string) => void;
}

const HANDLE_STORAGE_KEY = 'contriblens_discussion_handle';

export const GeneralDiscussionSection: React.FC<GeneralDiscussionSectionProps> = ({
  currentRepoFullName,
  authenticatedUser,
  onAnalyzeRepoByName,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<DiscussionMessageItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineContributor[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [attachRepoTag, setAttachRepoTag] = useState<boolean>(true);
  const [customHandle, setCustomHandle] = useState<string>(() => {
    const saved = localStorage.getItem(HANDLE_STORAGE_KEY);
    if (saved) return saved;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `oss-dev-${randomSuffix}`;
  });
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [handleDraft, setHandleDraft] = useState<string>(customHandle);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveHandle = authenticatedUser?.login || customHandle;
  const effectiveName = authenticatedUser?.name || effectiveHandle;
  const effectiveAvatar = authenticatedUser?.avatarUrl;

  const repoChannelId = `repo:${currentRepoFullName.toLowerCase()}`;

  const channels = [
    {
      id: 'general',
      label: 'general',
      description: 'General open-source discussion & contributor networking',
    },
    {
      id: 'issue-hunting',
      label: 'issue-hunting',
      description: 'Share good first issues, pair up, and avoid duplicate PRs',
    },
    {
      id: 'pr-reviews',
      label: 'pr-reviews',
      description: 'Ask for Pull Request reviews, Git rebase help, and CI tips',
    },
    {
      id: repoChannelId,
      label: currentRepoFullName,
      description: `Live contributor room for ${currentRepoFullName}`,
    },
  ];

  // Idempotent message merger
  const upsertMessage = (incoming: DiscussionMessageItem) => {
    setMessages((prev) => {
      const existsIdx = prev.findIndex((m) => m.id === incoming.id);
      if (existsIdx !== -1) {
        const updated = [...prev];
        updated[existsIdx] = incoming;
        return updated;
      }
      return [...prev, incoming];
    });
  };

  // Connect to Socket.IO server + initial state sync
  useEffect(() => {
    // Also fetch initial state via HTTP in parallel for instant load
    fetch('/api/discussion/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages && Array.isArray(data.messages)) {
          setMessages((prev) => {
            const byId = new Map<string, DiscussionMessageItem>();
            for (const m of prev) byId.set(m.id, m);
            for (const m of data.messages) byId.set(m.id, m);
            return Array.from(byId.values());
          });
        }
        if (data?.onlineUsers && Array.isArray(data.onlineUsers)) {
          setOnlineUsers(data.onlineUsers);
        }
      })
      .catch(() => {});

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:identify', {
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
      });
      socket.emit('channel:join', { channel: activeChannel });
    });

    socket.on(
      'discussion:init',
      (payload: { messages?: DiscussionMessageItem[]; onlineUsers?: OnlineContributor[] }) => {
        if (Array.isArray(payload?.messages)) {
          setMessages((prev) => {
            const byId = new Map<string, DiscussionMessageItem>();
            for (const m of prev) byId.set(m.id, m);
            for (const m of payload.messages!) byId.set(m.id, m);
            return Array.from(byId.values());
          });
        }
        if (Array.isArray(payload?.onlineUsers)) {
          setOnlineUsers(payload.onlineUsers);
        }
      }
    );

    socket.on('message:created', (newMsg: DiscussionMessageItem) => {
      if (newMsg && newMsg.id) {
        upsertMessage(newMsg);
      }
    });

    socket.on('message:updated', (updatedMsg: DiscussionMessageItem) => {
      if (updatedMsg && updatedMsg.id) {
        upsertMessage(updatedMsg);
      }
    });

    socket.on('presence:update', (payload: { onlineUsers?: OnlineContributor[] }) => {
      if (Array.isArray(payload?.onlineUsers)) {
        setOnlineUsers(payload.onlineUsers);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Re-identify when user connects GitHub or changes handle/channel
  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:identify', {
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
      });
      socketRef.current.emit('channel:join', { channel: activeChannel });
    }
  }, [effectiveHandle, effectiveName, effectiveAvatar, activeChannel]);

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeChannel]);

  const handleSaveCustomHandle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleDraft.trim().replace(/^@+/, '').slice(0, 32);
    if (!cleaned) return;
    setCustomHandle(cleaned);
    localStorage.setItem(HANDLE_STORAGE_KEY, cleaned);
    setIsEditingHandle(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: DiscussionMessageItem = {
      id: msgId,
      channel: activeChannel,
      authorHandle: effectiveHandle,
      authorName: effectiveName,
      authorAvatar: effectiveAvatar,
      repoTag: attachRepoTag ? currentRepoFullName : undefined,
      text,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    // Optimistic update with idempotent reconciliation
    upsertMessage(optimisticMsg);
    setMessageInput('');

    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', optimisticMsg);
    } else {
      try {
        const res = await fetch('/api/discussion/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optimisticMsg),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.message) {
            upsertMessage(data.message);
          }
        }
      } catch {
        // Optimistic message remains visible locally
      }
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:react', { messageId, emoji });
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: {
                  ...m.reactions,
                  [emoji]: (m.reactions[emoji] || 0) + 1,
                },
              }
            : m
        )
      );
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const activeChannelMeta =
    channels.find((c) => c.id === activeChannel) || channels[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-sky-400">
            Real-Time Contributor Community · Socket.IO Multi-User Discussion
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">
            General Discussion &amp; Issue Collaboration
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Chat live with other developers, coordinate on open issues, and share repository insights in real time.
          </p>
        </div>
      </div>

      {/* Main 12-Column Discussion Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Channels, Identity & Active Contributors */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Channels List */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Discussion Channels
            </div>
            <div className="space-y-1">
              {channels.map((ch) => {
                const isActive = activeChannel === ch.id;
                const count = messages.filter((m) => m.channel === ch.id).length;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-sky-400 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-slate-950' : 'text-sky-400'
                        }`}
                      />
                      <span className="text-xs font-mono truncate">{ch.label}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        isActive ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contributor Identity Card */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Your Chat Identity
              </span>
              {!authenticatedUser && !isEditingHandle && (
                <button
                  type="button"
                  onClick={() => {
                    setHandleDraft(customHandle);
                    setIsEditingHandle(true);
                  }}
                  className="text-xs font-mono text-sky-400 hover:underline cursor-pointer"
                >
                  Change Handle
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={effectiveHandle}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-sky-400/50 object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-sky-400/40 flex items-center justify-center text-xs font-bold font-mono text-sky-400 shrink-0">
                  {effectiveHandle.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {effectiveName}
                </div>
                <div className="text-xs font-mono text-emerald-400 truncate">
                  @{effectiveHandle}
                </div>
              </div>
            </div>

            {!authenticatedUser && isEditingHandle && (
              <form onSubmit={handleSaveCustomHandle} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={handleDraft}
                  onChange={(e) => setHandleDraft(e.target.value)}
                  placeholder="Enter display handle"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md cursor-pointer"
                >
                  Save
                </button>
              </form>
            )}
          </div>

          {/* Active Contributors List */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active in Discussion</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {Math.max(1, onlineUsers.length)}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(onlineUsers.length > 0
                ? onlineUsers
                : [
                    {
                      socketId: 'local',
                      handle: effectiveHandle,
                      name: effectiveName,
                      avatarUrl: effectiveAvatar,
                      activeChannel,
                      joinedAt: new Date().toISOString(),
                    },
                  ]
              ).map((u) => (
                <div
                  key={u.socketId || u.handle}
                  className="flex items-center justify-between gap-2 text-xs py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-mono text-slate-200 truncate">@{u.handle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 truncate">
                    #{u.activeChannel.replace(/^repo:/, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Column: Real-Time Message Feed & Composer */}
        <section className="lg:col-span-8 border border-slate-800 bg-slate-900/50 rounded-xl flex flex-col h-[620px] overflow-hidden">
          {/* Channel Header */}
          <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100">
                  {activeChannelMeta.label}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeChannelMeta.description}
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400 shrink-0">
              {channelMessages.length} messages
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                <MessageSquare className="w-7 h-7 text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">
                  No messages in #{activeChannelMeta.label} yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Start the conversation below! Every connected user in this channel will see your message in real time.
                </p>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isSelf =
                  msg.authorHandle.toLowerCase() === effectiveHandle.toLowerCase();
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isSelf
                        ? 'bg-slate-950/90 border-sky-500/40'
                        : 'bg-slate-950/60 border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {msg.authorAvatar ? (
                          <img
                            src={msg.authorAvatar}
                            alt={msg.authorHandle}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold font-mono text-sky-400 shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-100">
                            {msg.authorName}
                          </span>
                          <span className="text-xs font-mono text-sky-400">
                            @{msg.authorHandle}
                          </span>
                          {msg.repoTag && (
                            <button
                              type="button"
                              onClick={() => onAnalyzeRepoByName(msg.repoTag!)}
                              className="px-2 py-0.5 text-[11px] font-mono text-emerald-300 bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title={`Analyze ${msg.repoTag} in ContribLens`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{msg.repoTag}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2.5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    {/* Reactions Bar */}
                    <div className="mt-3 flex items-center gap-2">
                      {(['👍', '🚀', '💡'] as const).map((emoji) => {
                        const count = msg.reactions?.[emoji] || 0;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                              count > 0
                                ? 'bg-slate-900 border-sky-500/40 text-sky-300'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachRepoTag}
                  onChange={(e) => setAttachRepoTag(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-0"
                />
                <span>
                  Tag current repository:{' '}
                  <code className="font-mono text-emerald-400">{currentRepoFullName}</code>
                </span>
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                Posting as @{effectiveHandle}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${activeChannelMeta.label}...`}
                aria-label="Write a discussion message"
                className="flex-1 px-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
