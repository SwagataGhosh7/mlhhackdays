import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import mqtt from 'mqtt';
import {
  Check,
  CheckCheck,
  Clock,
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
  status?: 'sending' | 'delivered' | 'read';
  deliveredAt?: string;
  readBy?: string[];
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
const LOCAL_CACHE_KEY = 'contriblens_discussion_messages_v3';

const MQTT_EVENTS_TOPIC = 'contriblens/v3/discussion/events';
const MQTT_SNAPSHOT_TOPIC = 'contriblens/v3/discussion/snapshot';
const MQTT_PRESENCE_TOPIC = 'contriblens/v3/discussion/presence';

const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const DEFAULT_WELCOME_MESSAGES: DiscussionMessageItem[] = [
  {
    id: 'welcome-general-1',
    channel: 'general',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Welcome to the live General Discussion! Connect with fellow open-source contributors, share repositories you are analyzing, or ask for feedback on an issue or pull request.',
    createdAt: '2026-10-04T10:00:00.000Z',
    status: 'delivered',
    deliveredAt: '2026-10-04T10:00:00.000Z',
    readBy: [],
  },
  {
    id: 'welcome-issues-1',
    channel: 'issue-hunting',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Use #issue-hunting to share good first issues, coordinate with other contributors so you do not duplicate PRs, or ask about reproducing a bug.',
    createdAt: '2026-10-04T10:01:00.000Z',
    status: 'delivered',
    deliveredAt: '2026-10-04T10:01:00.000Z',
    readBy: [],
  },
  {
    id: 'welcome-prs-1',
    channel: 'pr-reviews',
    authorHandle: 'contriblens-system',
    authorName: 'ContribLens Community',
    text: 'Drop your Pull Request links or Git rebase questions in #pr-reviews to get peer code review before maintainer triage.',
    createdAt: '2026-10-04T10:02:00.000Z',
    status: 'delivered',
    deliveredAt: '2026-10-04T10:02:00.000Z',
    readBy: [],
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

function normalizeClientMessage(m: any): DiscussionMessageItem {
  const readBy: string[] = Array.isArray(m?.readBy)
    ? Array.from(
        new Set<string>(
          m.readBy.map((r: any) => String(r).trim()).filter(Boolean)
        )
      )
    : [];
  const status: 'sending' | 'delivered' | 'read' =
    readBy.length > 0
      ? 'read'
      : m?.status === 'sending' && !m?.deliveredAt
      ? 'sending'
      : 'delivered';
  return {
    id: String(m.id),
    channel: String(m.channel || 'general'),
    authorHandle: String(m.authorHandle || 'contributor'),
    authorName: String(m.authorName || m.authorHandle || 'contributor'),
    authorAvatar: m.authorAvatar ? String(m.authorAvatar) : undefined,
    text: String(m.text || ''),
    createdAt: String(m.createdAt || new Date().toISOString()),
    deliveredAt: m.deliveredAt ? String(m.deliveredAt) : undefined,
    status,
    readBy,
  };
}

export const GeneralDiscussionSection: React.FC<GeneralDiscussionSectionProps> = ({
  authenticatedUser,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<DiscussionMessageItem[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeClientMessage);
        }
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

  const effectiveHandle = authenticatedUser?.login || customHandle;
  const effectiveName = authenticatedUser?.name || effectiveHandle;
  const effectiveAvatar = authenticatedUser?.avatarUrl;

  const customSocketServerUrl =
    (import.meta as any).env?.VITE_SOCKET_SERVER_URL || '';

  // Refs so WebSocket / MQTT / Socket.IO connections stay persistent across renders
  const userMetaRef = useRef({
    handle: effectiveHandle,
    name: effectiveName,
    avatarUrl: effectiveAvatar,
    channel: activeChannel,
  });
  userMetaRef.current = {
    handle: effectiveHandle,
    name: effectiveName,
    avatarUrl: effectiveAvatar,
    channel: activeChannel,
  };

  const messagesRef = useRef<DiscussionMessageItem[]>(messages);
  messagesRef.current = messages;

  const socketRef = useRef<Socket | null>(null);
  const mqttClientsRef = useRef<mqtt.MqttClient[]>([]);
  const presenceMapRef = useRef<Map<string, OnlineContributor>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Deep idempotent message & read-receipt merger
  const mergeMessages = useCallback((incomingList: any[]) => {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return;

    setMessages((prev) => {
      const byId = new Map<string, DiscussionMessageItem>();
      for (const m of DEFAULT_WELCOME_MESSAGES) {
        byId.set(m.id, m);
      }
      for (const m of prev) {
        if (m && m.id && m.text) {
          byId.set(m.id, normalizeClientMessage(m));
        }
      }

      let changed = false;
      for (const raw of incomingList) {
        if (!raw || !raw.id || !raw.text) continue;
        const incoming = normalizeClientMessage(raw);
        const existing = byId.get(incoming.id);

        if (!existing) {
          byId.set(incoming.id, incoming);
          changed = true;
        } else {
          const mergedReadBy = Array.from(
            new Set([...(existing.readBy || []), ...(incoming.readBy || [])])
          );
          const nextDeliveredAt = existing.deliveredAt || incoming.deliveredAt;
          const nextStatus: 'sending' | 'delivered' | 'read' =
            mergedReadBy.length > 0
              ? 'read'
              : nextDeliveredAt || existing.status !== 'sending' || incoming.status !== 'sending'
              ? 'delivered'
              : 'sending';

          if (
            mergedReadBy.length !== (existing.readBy || []).length ||
            nextStatus !== existing.status ||
            nextDeliveredAt !== existing.deliveredAt
          ) {
            byId.set(incoming.id, {
              ...existing,
              deliveredAt: nextDeliveredAt,
              status: nextStatus,
              readBy: mergedReadBy,
            });
            changed = true;
          }
        }
      }

      if (!changed) return prev;

      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      messagesRef.current = merged;
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged.slice(-200)));
      } catch {
        // Ignore quota error
      }
      return merged;
    });
  }, []);

  // Apply read receipt by message IDs locally & return updated messages
  const applyLocalReadReceipts = useCallback(
    (messageIds: string[], readerHandle: string) => {
      const cleanReader = (readerHandle || '').trim().replace(/^@+/, '');
      if (!cleanReader || !Array.isArray(messageIds) || messageIds.length === 0) return;

      const idSet = new Set(messageIds);
      setMessages((prev) => {
        let changed = false;
        const next = prev.map((msg) => {
          if (!idSet.has(msg.id)) return msg;
          if (msg.authorHandle.toLowerCase() === cleanReader.toLowerCase()) return msg;
          const existingReaders = msg.readBy || [];
          if (existingReaders.some((r) => r.toLowerCase() === cleanReader.toLowerCase())) {
            return msg;
          }
          changed = true;
          return {
            ...msg,
            status: 'read' as const,
            readBy: [...existingReaders, cleanReader],
          };
        });

        if (!changed) return prev;
        messagesRef.current = next;
        try {
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(next.slice(-200)));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  const publishToAllMqttBrokers = useCallback(
    (topic: string, payloadObj: any, retain = false, onAck?: () => void) => {
      const payloadStr = JSON.stringify(payloadObj);
      let ackCalled = false;
      for (const client of mqttClientsRef.current) {
        if (client && client.connected) {
          client.publish(
            topic,
            payloadStr,
            { qos: 1, retain },
            (err) => {
              if (!err && onAck && !ackCalled) {
                ackCalled = true;
                onAck();
              }
            }
          );
        }
      }
    },
    []
  );

  const broadcastRetainedSnapshot = useCallback(() => {
    publishToAllMqttBrokers(
      MQTT_SNAPSHOT_TOPIC,
      {
        messages: messagesRef.current.slice(-80),
        updatedAt: new Date().toISOString(),
      },
      true
    );
  }, [publishToAllMqttBrokers]);

  const updatePresenceState = useCallback((incomingUsers?: OnlineContributor[]) => {
    const now = Date.now();
    const meta = userMetaRef.current;

    if (Array.isArray(incomingUsers)) {
      for (const u of incomingUsers) {
        if (u && u.handle) {
          presenceMapRef.current.set(u.handle.toLowerCase(), {
            ...u,
            lastSeenMs: now,
          });
        }
      }
    }

    presenceMapRef.current.set(meta.handle.toLowerCase(), {
      socketId: 'self',
      handle: meta.handle,
      name: meta.name,
      avatarUrl: meta.avatarUrl,
      activeChannel: meta.channel,
      joinedAt: new Date().toISOString(),
      lastSeenMs: now,
    });

    for (const [key, val] of presenceMapRef.current.entries()) {
      if (now - (val.lastSeenMs || 0) > 45000) {
        presenceMapRef.current.delete(key);
      }
    }

    setOnlineUsers(Array.from(presenceMapRef.current.values()));
  }, []);

  // Persistent Mount Effect: Connects to Dual WebSocket MQTT Brokers + Socket.IO + Express HTTP + Firestore
  useEffect(() => {
    const baseUrl = customSocketServerUrl.replace(/\/+$/, '');

    const syncFromHttpServer = async () => {
      try {
        const meta = userMetaRef.current;
        const params = new URLSearchParams({
          handle: meta.handle,
          name: meta.name,
          channel: meta.channel,
        });
        if (meta.avatarUrl) {
          params.set('avatarUrl', meta.avatarUrl);
        }
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
              updatePresenceState(data.onlineUsers);
            }
          }
        }
      } catch {
        updatePresenceState();
      }
    };

    syncFromHttpServer();
    const httpPollTimer = window.setInterval(syncFromHttpServer, 2000);

    // 1. Connect to Dual Enterprise WebSocket MQTT Brokers (works across Vercel, ais-pre, ais-dev, and mobile with 0 rate limits)
    const connectedMqttClients: mqtt.MqttClient[] = [];
    for (const brokerUrl of MQTT_BROKERS) {
      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `cl-${Math.random().toString(36).slice(2, 10)}`,
          clean: true,
          reconnectPeriod: 2000,
          connectTimeout: 8000,
        });

        client.on('connect', () => {
          setIsRealtimeConnected(true);
          client.subscribe(
            [MQTT_EVENTS_TOPIC, MQTT_SNAPSHOT_TOPIC, MQTT_PRESENCE_TOPIC],
            { qos: 1 }
          );
          const meta = userMetaRef.current;
          client.publish(
            MQTT_PRESENCE_TOPIC,
            JSON.stringify({
              type: 'PRESENCE',
              user: {
                socketId: `mqtt-${meta.handle.toLowerCase()}`,
                handle: meta.handle,
                name: meta.name,
                avatarUrl: meta.avatarUrl,
                activeChannel: meta.channel,
                joinedAt: new Date().toISOString(),
              },
            }),
            { qos: 0 }
          );
        });

        client.on('message', (topic, payloadBuffer) => {
          try {
            const payload = JSON.parse(payloadBuffer.toString());
            if (topic === MQTT_SNAPSHOT_TOPIC && Array.isArray(payload?.messages)) {
              mergeMessages(payload.messages);
            } else if (topic === MQTT_EVENTS_TOPIC) {
              if (payload?.type === 'CHAT_MSG' && payload?.data?.id) {
                mergeMessages([payload.data]);
              } else if (
                payload?.type === 'READ_RECEIPT' &&
                Array.isArray(payload?.messageIds) &&
                payload?.readerHandle
              ) {
                applyLocalReadReceipts(payload.messageIds, payload.readerHandle);
              }
            } else if (topic === MQTT_PRESENCE_TOPIC && payload?.user?.handle) {
              updatePresenceState([payload.user]);
            }
          } catch {
            // Ignore malformed frame
          }
        });

        connectedMqttClients.push(client);
      } catch {
        // Ignore broker init error
      }
    }
    mqttClientsRef.current = connectedMqttClients;

    const presencePingTimer = window.setInterval(() => {
      const meta = userMetaRef.current;
      publishToAllMqttBrokers(MQTT_PRESENCE_TOPIC, {
        type: 'PRESENCE',
        user: {
          socketId: `mqtt-${meta.handle.toLowerCase()}`,
          handle: meta.handle,
          name: meta.name,
          avatarUrl: meta.avatarUrl,
          activeChannel: meta.channel,
          joinedAt: new Date().toISOString(),
        },
      });
    }, 10000);

    // 2. Connect Socket.IO client
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
      const meta = userMetaRef.current;
      socket.emit('user:identify', {
        handle: meta.handle,
        name: meta.name,
        avatarUrl: meta.avatarUrl,
        activeChannel: meta.channel,
      });
      socket.emit('channel:join', { channel: meta.channel });
    });

    socket.on(
      'discussion:init',
      (payload: { messages?: DiscussionMessageItem[]; onlineUsers?: OnlineContributor[] }) => {
        if (Array.isArray(payload?.messages)) {
          mergeMessages(payload.messages);
        }
        if (Array.isArray(payload?.onlineUsers)) {
          updatePresenceState(payload.onlineUsers);
        }
      }
    );

    socket.on('message:created', (newMsg: DiscussionMessageItem) => {
      if (newMsg && newMsg.id) {
        mergeMessages([newMsg]);
      }
    });

    socket.on('message:read_update', (payload: { messages?: DiscussionMessageItem[] }) => {
      if (Array.isArray(payload?.messages)) {
        mergeMessages(payload.messages);
      }
    });

    socket.on('presence:update', (payload: { onlineUsers?: OnlineContributor[] }) => {
      if (Array.isArray(payload?.onlineUsers)) {
        updatePresenceState(payload.onlineUsers);
      }
    });

    // 3. Firebase Firestore subscription
    const unsubscribeFirestore = subscribeToFirestoreDiscussion((firestoreMsgs) => {
      mergeMessages(firestoreMsgs);
    });

    // 4. BroadcastChannel for same-browser tabs
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('contriblens_discussion_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'NEW_MESSAGE' && ev.data?.message) {
          mergeMessages([ev.data.message]);
        } else if (
          ev.data?.type === 'READ_RECEIPT' &&
          Array.isArray(ev.data?.messageIds) &&
          ev.data?.readerHandle
        ) {
          applyLocalReadReceipts(ev.data.messageIds, ev.data.readerHandle);
        }
      };
      broadcastChannelRef.current = bc;
    }

    return () => {
      window.clearInterval(httpPollTimer);
      window.clearInterval(presencePingTimer);
      for (const c of connectedMqttClients) {
        try {
          c.end(true);
        } catch {
          // Ignore
        }
      }
      mqttClientsRef.current = [];
      socket.disconnect();
      socketRef.current = null;
      unsubscribeFirestore();
      if (bc) {
        bc.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [
    customSocketServerUrl,
    mergeMessages,
    applyLocalReadReceipts,
    updatePresenceState,
    publishToAllMqttBrokers,
  ]);

  // Announce identity/channel updates without reconnecting sockets
  useEffect(() => {
    updatePresenceState();
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:identify', {
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
      });
      socketRef.current.emit('channel:join', { channel: activeChannel });
    }
    publishToAllMqttBrokers(MQTT_PRESENCE_TOPIC, {
      type: 'PRESENCE',
      user: {
        socketId: `mqtt-${effectiveHandle.toLowerCase()}`,
        handle: effectiveHandle,
        name: effectiveName,
        avatarUrl: effectiveAvatar,
        activeChannel,
        joinedAt: new Date().toISOString(),
      },
    });
  }, [effectiveHandle, effectiveName, effectiveAvatar, activeChannel, updatePresenceState, publishToAllMqttBrokers]);

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  // Automatic Read Receipt Acknowledgment: Mark messages from other participants in activeChannel as read!
  useEffect(() => {
    const unreadFromOthers = channelMessages
      .filter((m) => {
        if (m.authorHandle === 'contriblens-system') return false;
        if (m.authorHandle.toLowerCase() === effectiveHandle.toLowerCase()) return false;
        const readers = m.readBy || [];
        return !readers.some((r) => r.toLowerCase() === effectiveHandle.toLowerCase());
      })
      .map((m) => m.id);

    if (unreadFromOthers.length === 0) return;

    // 1. Update locally immediately
    applyLocalReadReceipts(unreadFromOthers, effectiveHandle);

    // 2. Broadcast read receipt over Socket.IO
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:read', {
        messageIds: unreadFromOthers,
        readerHandle: effectiveHandle,
        channel: activeChannel,
      });
    }

    // 3. POST read receipt to Express backend
    const baseUrl = customSocketServerUrl.replace(/\/+$/, '');
    fetch(`${baseUrl}/api/discussion/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageIds: unreadFromOthers,
        readerHandle: effectiveHandle,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.updatedMessages)) {
          mergeMessages(data.updatedMessages);
        }
      })
      .catch(() => {});

    // 4. Broadcast read receipt over Dual WebSocket MQTT Brokers + Retained Snapshot
    publishToAllMqttBrokers(MQTT_EVENTS_TOPIC, {
      type: 'READ_RECEIPT',
      messageIds: unreadFromOthers,
      readerHandle: effectiveHandle,
    });
    window.setTimeout(() => {
      broadcastRetainedSnapshot();
    }, 120);

    // 5. BroadcastChannel for other open tabs
    broadcastChannelRef.current?.postMessage({
      type: 'READ_RECEIPT',
      messageIds: unreadFromOthers,
      readerHandle: effectiveHandle,
    });
  }, [
    channelMessages,
    effectiveHandle,
    activeChannel,
    customSocketServerUrl,
    applyLocalReadReceipts,
    mergeMessages,
    publishToAllMqttBrokers,
    broadcastRetainedSnapshot,
  ]);

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

  const markMessageDelivered = useCallback(
    (msgId: string, deliveredTimestamp?: string) => {
      const ts = deliveredTimestamp || new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                deliveredAt: m.deliveredAt || ts,
                status: (m.readBy && m.readBy.length > 0) ? 'read' : 'delivered',
              }
            : m
        )
      );
    },
    []
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text) return;

    const nowIso = new Date().toISOString();
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: DiscussionMessageItem = {
      id: msgId,
      channel: activeChannel,
      authorHandle: effectiveHandle,
      authorName: effectiveName,
      authorAvatar: effectiveAvatar,
      text,
      createdAt: nowIso,
      status: 'sending',
      readBy: [],
    };

    // 1. Optimistic local insert with status = 'sending'
    mergeMessages([optimisticMsg]);
    setMessageInput('');

    const wirePayload: DiscussionMessageItem = {
      ...optimisticMsg,
      status: 'delivered',
      deliveredAt: nowIso,
    };

    // 2. Publish to Dual Enterprise WebSocket MQTT Brokers (`wss://broker.emqx.io` & `wss://broker.hivemq.com`)
    publishToAllMqttBrokers(
      MQTT_EVENTS_TOPIC,
      {
        type: 'CHAT_MSG',
        data: wirePayload,
      },
      false,
      () => {
        markMessageDelivered(msgId, nowIso);
      }
    );

    window.setTimeout(() => {
      markMessageDelivered(msgId, nowIso);
      broadcastRetainedSnapshot();
    }, 180);

    // 3. Broadcast to same-browser tabs
    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      message: wirePayload,
    });

    // 4. Emit via Socket.IO with server delivery acknowledgment callback
    if (socketRef.current?.connected) {
      socketRef.current.emit(
        'message:send',
        wirePayload,
        (ack?: { ok?: boolean; message?: DiscussionMessageItem }) => {
          if (ack?.ok && ack?.message) {
            mergeMessages([ack.message]);
          } else {
            markMessageDelivered(msgId, nowIso);
          }
        }
      );
    }

    // 5. POST to Express backend (`/api/discussion/message`)
    const baseUrl = customSocketServerUrl.replace(/\/+$/, '');
    fetch(`${baseUrl}/api/discussion/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wirePayload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.message) {
          mergeMessages([data.message]);
        }
      })
      .catch(() => {});

    // 6. Publish to Firebase Firestore
    publishMessageToFirestore(wirePayload);
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
          <div className="text-xs font-mono text-[#15803D] font-semibold flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-[#15803D]" />
            <span>
              ContribLens Live Contributor Channels · Delivery &amp; Read Receipts
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#0B0F0D] mt-1">
            General Discussion &amp; Issue Collaboration
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Coordinate with other open-source contributors, share target issues, and discuss pull request strategies in real time.
          </p>
        </div>
        <div className="text-xs font-mono text-[#15803D] font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{isRealtimeConnected ? 'Live Connection Active' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Main 12-Column Discussion Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Channels, Identity & Active Contributors */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Channels List */}
          <div className="border border-[#DDE5DF] bg-white rounded-xl p-4 space-y-3">
            <div className="text-xs font-mono text-[#64748B] uppercase tracking-wider font-semibold">
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
                        ? 'bg-[#15803D] text-white font-semibold'
                        : 'text-[#111827] hover:bg-[#F1F5F3]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-[#15803D]'
                        }`}
                      />
                      <span className="text-xs font-mono truncate">{ch.label}</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        isActive ? 'text-white/90' : 'text-[#64748B]'
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
          <div className="border border-[#DDE5DF] bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#64748B] uppercase tracking-wider font-semibold">
                Your Chat Identity
              </span>
              {!authenticatedUser && !isEditingHandle && (
                <button
                  type="button"
                  onClick={() => {
                    setHandleDraft(customHandle);
                    setIsEditingHandle(true);
                  }}
                  className="text-xs font-mono text-[#15803D] font-semibold hover:underline cursor-pointer"
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
                  className="w-10 h-10 rounded-full border border-[#15803D]/50 object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F1F5F3] border border-[#15803D]/40 flex items-center justify-center text-xs font-bold font-mono text-[#15803D] shrink-0">
                  {effectiveHandle.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#0B0F0D] truncate">
                  {effectiveName}
                </div>
                <div className="text-xs font-mono text-[#15803D] font-semibold truncate">
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
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-[#F8FAF9] border border-[#DDE5DF] rounded-md text-[#0B0F0D] focus:outline-none focus:border-[#15803D]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-md cursor-pointer"
                >
                  Save
                </button>
              </form>
            )}
          </div>

          {/* Active Contributors List */}
          <div className="border border-[#DDE5DF] bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#64748B] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Active in Discussion</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#15803D]">
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
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                    <span className="font-mono text-[#111827] font-medium truncate">@{u.handle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B] truncate">
                    #{u.activeChannel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Column: Real-Time Message Feed & Composer */}
        <section className="lg:col-span-8 border border-[#DDE5DF] bg-white rounded-xl flex flex-col h-[620px] overflow-hidden">
          {/* Channel Header */}
          <div className="px-5 py-3.5 bg-[#F8FAF9] border-b border-[#DDE5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#15803D]" />
                <h3 className="text-sm font-bold font-mono text-[#0B0F0D]">
                  {activeChannelMeta.label}
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {activeChannelMeta.description}
              </p>
            </div>
            <div className="text-xs font-mono text-[#64748B] shrink-0">
              {channelMessages.length} messages
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-[#64748B]">
                <MessageSquare className="w-7 h-7 text-[#64748B]" />
                <p className="text-sm font-semibold text-[#111827]">
                  No messages in #{activeChannelMeta.label} yet
                </p>
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isSelf =
                  msg.authorHandle.toLowerCase() === effectiveHandle.toLowerCase();
                const isSystem = msg.authorHandle === 'contriblens-system';
                const readers = (msg.readBy || []).filter(
                  (r) => r.toLowerCase() !== msg.authorHandle.toLowerCase()
                );
                const isRead = readers.length > 0;
                const isSending = msg.status === 'sending' && !msg.deliveredAt;

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isSelf
                        ? 'bg-[#F8FAF9] border-[#15803D]/40'
                        : 'bg-white border-[#DDE5DF]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {msg.authorAvatar ? (
                          <img
                            src={msg.authorAvatar}
                            alt={msg.authorHandle}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-[#DDE5DF] object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#F1F5F3] border border-[#DDE5DF] flex items-center justify-center text-xs font-bold font-mono text-[#15803D] shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-[#0B0F0D]">
                            {msg.authorName}
                          </span>
                          <span className="text-xs font-mono text-[#15803D] font-semibold">
                            @{msg.authorHandle}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B] shrink-0">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2.5 text-sm text-[#111827] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    {/* Delivery & Read Receipts Footer */}
                    {!isSystem && (
                      <div className="mt-2.5 pt-2 border-t border-[#DDE5DF] flex items-center justify-end gap-2 text-[11px] font-mono">
                        {isSelf ? (
                          isSending ? (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Sending to server...</span>
                            </span>
                          ) : isRead ? (
                            <span className="inline-flex items-center gap-1.5 text-[#15803D] font-semibold">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>
                                Read by {readers.map((r) => `@${r}`).join(', ')}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#166534]">
                              <Check className="w-3.5 h-3.5" />
                              <span>Delivered to server</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                            <CheckCheck className="w-3.5 h-3.5 text-[#15803D]" />
                            <span>
                              {isRead
                                ? `Acknowledged by ${readers.map((r) => `@${r}`).join(', ')}`
                                : 'Delivered'}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-[#F8FAF9] border-t border-[#DDE5DF] space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-mono text-[11px] text-[#64748B]">
                ✓ Delivered to server · ✓✓ Read by participants
              </span>
              <span className="font-mono text-[11px] text-[#64748B]">
                Posting as <span className="text-[#15803D] font-semibold">@{effectiveHandle}</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${activeChannelMeta.label}...`}
                aria-label="Write a discussion message"
                className="flex-1 px-4 py-2.5 text-sm bg-white border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D] transition-colors"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-2 shrink-0 cursor-pointer"
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
