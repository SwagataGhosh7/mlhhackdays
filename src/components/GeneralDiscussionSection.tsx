import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Hash,
  MessageSquare,
  Send,
  User,
  Users,
  Wifi,
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
  lastSeenMs?: number;
}

interface GeneralDiscussionSectionProps {
  authenticatedUser: GitHubUserProfile | null;
}

const HANDLE_STORAGE_KEY = 'contriblens_discussion_handle';
const LOCAL_CACHE_KEY = 'contriblens_discussion_messages_cache';

// Global WebSocket pub/sub relay topic so static Vercel deployments & separate containers sync in real time without needing Render
const GLOBAL_WS_TOPIC = 'contriblens_oss_global_chat_v2';
const GLOBAL_PRESENCE_TOPIC = 'contriblens_oss_global_presence_v2';

const DEFAULT_WELCOME_MESSAGES: DiscussionMessageItem[] = [
  {
    id: 'welcome-general-1',
    channel: 'general',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Welcome to the live General Discussion! Connect with fellow open-source contributors, share repositories you are analyzing, or ask for feedback on an issue or pull request.',
    createdAt: '2026-10-04T10:00:00.000Z',
  },
  {
    id: 'welcome-issues-1',
    channel: 'issue-hunting',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Use #issue-hunting to share good first issues, coordinate with other contributors so you do not duplicate PRs, or ask about reproducing a bug.',
    createdAt: '2026-10-04T10:01:00.000Z',
  },
  {
    id: 'welcome-prs-1',
    channel: 'pr-reviews',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Drop your Pull Request links or Git rebase questions in #pr-reviews to get peer code review before maintainer triage.',
    createdAt: '2026-10-04T10:02:00.000Z',
  },
];

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_WELCOME_MESSAGES;
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineContributor[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
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
  const globalWsRef = useRef<WebSocket | null>(null);
  const presenceMapRef = useRef<Map<string, OnlineContributor>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveHandle = authenticatedUser?.login || customHandle;
  const effectiveName = authenticatedUser?.name || effectiveHandle;
  const effectiveAvatar = authenticatedUser?.avatarUrl;

  const customSocketServerUrl =
    (import.meta as any).env?.VITE_SOCKET_SERVER_URL || '';

  // Idempotent batch/single message merger sorted chronologically
  const mergeMessages = useCallback((incomingList: DiscussionMessageItem[]) => {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return;
    setMessages((prev) => {
      const byId = new Map<string, DiscussionMessageItem>();
      for (const m of DEFAULT_WELCOME_MESSAGES) {
        byId.set(m.id, m);
      }
      for (const m of prev) {
        if (m && m.id && m.text) byId.set(m.id, m);
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

  const mergeOnlineUsers = useCallback(
    (serverUsers?: OnlineContributor[]) => {
      const now = Date.now();
      if (Array.isArray(serverUsers)) {
        for (const u of serverUsers) {
          if (u && u.handle) {
            presenceMapRef.current.set(u.handle.toLowerCase(), {
              ...u,
              lastSeenMs: now,
            });
          }
        }
      }
      // Always include self
      presenceMapRef.current.set(effectiveHandle.toLowerCase(), {
        socketId: 'self',
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
        joinedAt: new Date().toISOString(),
        lastSeenMs: now,
      });

      // Prune stale entries (> 45s)
      for (const [key, val] of presenceMapRef.current.entries()) {
        if (now - (val.lastSeenMs || 0) > 45000) {
          presenceMapRef.current.delete(key);
        }
      }

      setOnlineUsers(Array.from(presenceMapRef.current.values()));
    },
    [effectiveHandle, effectiveName, effectiveAvatar, activeChannel]
  );

  // Sync history from global WebSocket relay (works on Vercel static builds & across separate URLs)
  const syncFromGlobalRelay = useCallback(async () => {
    try {
      const res = await fetch(
        `https://ntfy.sh/${GLOBAL_WS_TOPIC}/json?poll=1&since=24h`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      const parsedMessages: DiscussionMessageItem[] = [];
      for (const line of lines) {
        try {
          const envelope = JSON.parse(line);
          if (envelope?.event === 'message' && typeof envelope.message === 'string') {
            const payload = JSON.parse(envelope.message);
            if (payload?.type === 'CHAT_MSG' && payload?.data?.id && payload?.data?.text) {
              parsedMessages.push(payload.data as DiscussionMessageItem);
            }
          }
        } catch {
          // Ignore malformed line
        }
      }
      if (parsedMessages.length > 0) {
        mergeMessages(parsedMessages);
      }
    } catch {
      // Ignore network hiccup
    }
  }, [mergeMessages]);

  // Broadcast presence to global relay so users on Vercel / different URLs see each other online
  const announceGlobalPresence = useCallback(async () => {
    try {
      const presencePayload = JSON.stringify({
        type: 'PRESENCE_PING',
        user: {
          socketId: `global-${effectiveHandle.toLowerCase()}`,
          handle: effectiveHandle,
          name: effectiveName,
          avatarUrl: effectiveAvatar,
          activeChannel,
          joinedAt: new Date().toISOString(),
        },
      });
      await fetch(`https://ntfy.sh/${GLOBAL_PRESENCE_TOPIC}`, {
        method: 'POST',
        body: presencePayload,
      });
    } catch {
      // Ignore
    }
  }, [effectiveHandle, effectiveName, effectiveAvatar, activeChannel]);

  // Poll Express server state when running on full-stack server
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
      const baseUrl = customSocketServerUrl.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/discussion/state?${params.toString()}`, {
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
            mergeOnlineUsers(data.onlineUsers);
          }
        }
      }
    } catch {
      mergeOnlineUsers();
    }
  }, [
    effectiveHandle,
    effectiveName,
    effectiveAvatar,
    activeChannel,
    customSocketServerUrl,
    mergeMessages,
    mergeOnlineUsers,
  ]);

  // Connect Global WebSocket + Socket.IO + Firestore + BroadcastChannel
  useEffect(() => {
    syncFromServer();
    syncFromGlobalRelay();
    announceGlobalPresence();

    const pollTimer = window.setInterval(() => {
      syncFromServer();
      syncFromGlobalRelay();
    }, 2500);

    const presenceTimer = window.setInterval(() => {
      announceGlobalPresence();
    }, 15000);

    // 1. Global Real-Time WebSocket (`wss://`) — works across Vercel, AI Studio Dev/Shared URLs, & Mobile without needing Render
    let globalWs: WebSocket | null = null;
    let wsReconnectTimer: number | null = null;
    let isUnmounted = false;

    const connectGlobalWebSocket = () => {
      if (isUnmounted) return;
      try {
        globalWs = new WebSocket(
          `wss://ntfy.sh/${GLOBAL_WS_TOPIC},${GLOBAL_PRESENCE_TOPIC}/ws`
        );
        globalWsRef.current = globalWs;

        globalWs.onopen = () => {
          if (!isUnmounted) {
            setIsRealtimeConnected(true);
          }
        };

        globalWs.onmessage = (event) => {
          try {
            const envelope = JSON.parse(event.data);
            if (envelope?.event === 'message' && typeof envelope.message === 'string') {
              const payload = JSON.parse(envelope.message);
              if (payload?.type === 'CHAT_MSG' && payload?.data?.id && payload?.data?.text) {
                mergeMessages([payload.data as DiscussionMessageItem]);
              } else if (payload?.type === 'PRESENCE_PING' && payload?.user?.handle) {
                mergeOnlineUsers([payload.user as OnlineContributor]);
              }
            }
          } catch {
            // Ignore non-JSON frames
          }
        };

        globalWs.onclose = () => {
          if (!isUnmounted) {
            wsReconnectTimer = window.setTimeout(connectGlobalWebSocket, 2000);
          }
        };
      } catch {
        // Fallback polling handles sync if WebSocket is blocked
      }
    };

    connectGlobalWebSocket();

    // 2. Socket.IO connection (connects to local Express server or VITE_SOCKET_SERVER_URL if configured)
    const socket = customSocketServerUrl
      ? io(customSocketServerUrl, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnection: true,
        })
      : io({
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnection: true,
        });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsRealtimeConnected(true);
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
          mergeOnlineUsers(payload.onlineUsers);
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
        mergeOnlineUsers(payload.onlineUsers);
      }
    });

    // 3. Firebase Firestore real-time listener
    const unsubscribeFirestore = subscribeToFirestoreDiscussion((firestoreMsgs) => {
      mergeMessages(firestoreMsgs as DiscussionMessageItem[]);
    });

    // 4. BroadcastChannel for instant multi-tab sync
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

    return () => {
      isUnmounted = true;
      window.clearInterval(pollTimer);
      window.clearInterval(presenceTimer);
      if (wsReconnectTimer) window.clearTimeout(wsReconnectTimer);
      if (globalWs) globalWs.close();
      socket.disconnect();
      socketRef.current = null;
      unsubscribeFirestore();
      if (bc) {
        bc.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [
    syncFromServer,
    syncFromGlobalRelay,
    announceGlobalPresence,
    customSocketServerUrl,
    mergeMessages,
    mergeOnlineUsers,
  ]);

  // Re-identify when user connects GitHub or changes handle/channel
  useEffect(() => {
    mergeOnlineUsers();
    announceGlobalPresence();
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:identify', {
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
      });
      socketRef.current.emit('channel:join', { channel: activeChannel });
    }
  }, [effectiveHandle, effectiveName, effectiveAvatar, activeChannel, mergeOnlineUsers, announceGlobalPresence]);

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

    // 2. Publish to Global WebSocket Relay (`wss://ntfy.sh`) -> Delivers to Vercel, Shared URL, & Mobile users in <100ms without needing Render!
    fetch(`https://ntfy.sh/${GLOBAL_WS_TOPIC}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'CHAT_MSG',
        data: newMsg,
      }),
    }).catch(() => {});

    // 3. Broadcast immediately to other open tabs in same browser
    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      message: newMsg,
    });

    // 4. Emit via Socket.IO if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', newMsg);
    }

    // 5. POST to Express backend (`/api/discussion/message`) if running
    const baseUrl = customSocketServerUrl.replace(/\/+$/, '');
    fetch(`${baseUrl}/api/discussion/message`, {
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

    // 6. Publish to Firebase Firestore in parallel
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
          <div className="text-xs font-mono text-sky-400 flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Global Real-Time WebSocket Relay · Works on Vercel &amp; AI Studio (No Render Server Required)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">
            General Discussion &amp; Issue Collaboration
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Chat live with other developers across any browser or deployment URL in real time.
          </p>
        </div>
        <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isRealtimeConnected ? 'Global WebSocket Connected' : 'Real-Time Sync Active'}</span>
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
