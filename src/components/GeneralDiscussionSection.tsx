import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Hash,
  MessageSquare,
  Send,
  User,
  Users,
} from 'lucide-react';
import { GitHubUserProfile } from '../types';
import {
  publishMessageToFirestore,
  subscribeToFirestoreDiscussion,
} from '../firebase';

export interface DiscussionMessageItem {
  id: string;
  channel: string;
  authorHandle: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
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
  authenticatedUser: GitHubUserProfile | null;
}

const HANDLE_STORAGE_KEY = 'contriblens_discussion_handle';
const LOCAL_CACHE_KEY = 'contriblens_discussion_messages_cache';

const CHANNELS = [
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
];

export const GeneralDiscussionSection: React.FC<GeneralDiscussionSectionProps> = ({
  authenticatedUser,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<DiscussionMessageItem[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineContributor[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [customHandle, setCustomHandle] = useState<string>(() => {
    const saved = localStorage.getItem(HANDLE_STORAGE_KEY);
    if (saved) return saved;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generated = `oss-dev-${randomSuffix}`;
    localStorage.setItem(HANDLE_STORAGE_KEY, generated);
    return generated;
  });
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [handleDraft, setHandleDraft] = useState<string>(customHandle);

  const socketRef = useRef<Socket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveHandle = authenticatedUser?.login || customHandle;
  const effectiveName = authenticatedUser?.name || effectiveHandle;
  const effectiveAvatar = authenticatedUser?.avatarUrl;

  // Idempotent batch/single message merger sorted chronologically
  const mergeMessages = useCallback((incomingList: DiscussionMessageItem[]) => {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return;
    setMessages((prev) => {
      const byId = new Map<string, DiscussionMessageItem>();
      for (const m of prev) {
        if (m && m.id) byId.set(m.id, m);
      }
      let changed = false;
      for (const m of incomingList) {
        if (m && m.id && m.text) {
          if (!byId.has(m.id)) {
            changed = true;
          }
          byId.set(m.id, m);
        }
      }
      if (!changed && byId.size === prev.length) {
        return prev;
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged.slice(-200)));
      } catch {
        // Ignore storage quota
      }
      return merged;
    });
  }, []);

  // Poll server state & register active presence (guarantees sync even when proxies block WebSockets)
  const syncFromServer = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        handle: effectiveHandle,
        name: effectiveName,
        channel: activeChannel,
      });
      if (effectiveAvatar) {
        params.set('avatarUrl', effectiveAvatar);
      }
      const res = await fetch(`/api/discussion/state?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data?.messages)) {
            mergeMessages(data.messages);
          }
          if (Array.isArray(data?.onlineUsers)) {
            setOnlineUsers(data.onlineUsers);
          }
        }
      }
    } catch {
      // Ignore network hiccup
    }
  }, [effectiveHandle, effectiveName, effectiveAvatar, activeChannel, mergeMessages]);

  // Set up Socket.IO + HTTP Sync Interval + Firestore Real-Time Listener + BroadcastChannel
  useEffect(() => {
    syncFromServer();
    const pollTimer = window.setInterval(syncFromServer, 1800);

    // 1. Socket.IO with polling-first transport so Cloud Run / iframe proxies never hang on WS upgrade
    const socket = io({
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
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
          mergeMessages(payload.messages);
        }
        if (Array.isArray(payload?.onlineUsers)) {
          setOnlineUsers(payload.onlineUsers);
        }
      }
    );

    socket.on('message:created', (newMsg: DiscussionMessageItem) => {
      if (newMsg && newMsg.id) {
        mergeMessages([newMsg]);
      }
    });

    socket.on('presence:update', (payload: { onlineUsers?: OnlineContributor[] }) => {
      if (Array.isArray(payload?.onlineUsers)) {
        setOnlineUsers(payload.onlineUsers);
      }
    });

    // 2. Firebase Firestore real-time subscription (syncs across Dev URL, Shared URL, and Vercel)
    const unsubscribeFirestore = subscribeToFirestoreDiscussion((firestoreMsgs) => {
      mergeMessages(firestoreMsgs as DiscussionMessageItem[]);
    });

    // 3. BroadcastChannel + storage listener for instant multi-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('contriblens_discussion_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'NEW_MESSAGE' && ev.data?.message) {
          mergeMessages([ev.data.message]);
        }
      };
      broadcastChannelRef.current = bc;
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            mergeMessages(parsed);
          }
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.clearInterval(pollTimer);
      socket.disconnect();
      socketRef.current = null;
      unsubscribeFirestore();
      if (bc) {
        bc.close();
        broadcastChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [syncFromServer, mergeMessages]);

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
    const newMsg: DiscussionMessageItem = {
      id: msgId,
      channel: activeChannel,
      authorHandle: effectiveHandle,
      authorName: effectiveName,
      authorAvatar: effectiveAvatar,
      text,
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic local update
    mergeMessages([newMsg]);
    setMessageInput('');

    // 2. Broadcast immediately to other open tabs
    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      message: newMsg,
    });

    // 3. Emit via Socket.IO if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', newMsg);
    }

    // 4. Always POST to /api/discussion/message so server persists & broadcasts via io.emit
    fetch('/api/discussion/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.message) {
          mergeMessages([data.message]);
        }
      })
      .catch(() => {});

    // 5. Publish to Firebase Firestore in parallel for cross-URL / Vercel sync
    publishMessageToFirestore(newMsg);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const activeChannelMeta =
    CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-sky-400">
            Real-Time Contributor Community · Live Multi-User Discussion
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">
            General Discussion &amp; Issue Collaboration
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Chat live with other developers, coordinate on open issues, and share insights in real time.
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
              {CHANNELS.map((ch) => {
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
                    #{u.activeChannel}
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
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2.5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-slate-950 border-t border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-end text-xs text-slate-400">
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
