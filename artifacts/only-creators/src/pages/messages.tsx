import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket, type WSMsg } from "@/hooks/use-websocket";
import { Send, Paperclip, MessageSquare, Search, X, File, ImageIcon, Check, CheckCheck } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  other_id: number;
  other_username: string;
  other_avatar: string | null;
  last_content: string;
  last_file_type: string | null;
  last_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  file_url: string | null;
  file_type: string | null;
  is_read: boolean;
  created_at: string;
  sender_username: string;
  recipient_username: string;
  _pending?: boolean;
}

interface UserResult {
  id: number;
  username: string;
  avatarUrl: string | null;
  accountType: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null { return localStorage.getItem("auth_token"); }

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86400000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ name, url, size = 10 }: { name: string; url?: string | null; size?: number }) {
  const sz = `w-${size} h-${size}`;
  return url
    ? <img src={url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
    : <div className={`${sz} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>{(name?.[0] ?? "?").toUpperCase()}</div>;
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-emerald-500 shadow-[0_0_6px_hsl(142,71%,45%)]" : "bg-zinc-500"}`} />
  );
}

// ── File Upload ──────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<{ url: string; fileType: string }> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const { uploadURL, objectPath } = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  }).then(r => r.json()) as { uploadURL: string; objectPath: string };

  await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

  const url = `/api/storage${objectPath}`;
  const fileType = file.type.startsWith("image/") ? "image" : "file";
  return { url, fileType };
}

// ── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, showRead }: { msg: Message; isMe: boolean; showRead: boolean }) {
  const isImage = msg.file_type === "image" && msg.file_url;
  const isFile = msg.file_type === "file" && msg.file_url;

  return (
    <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {isImage && (
          <a href={msg.file_url!} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
            <img src={msg.file_url!} alt="Image" className="max-w-xs max-h-64 object-cover" />
          </a>
        )}
        {isFile && (
          <a
            href={msg.file_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/10 rounded-bl-sm"}`}
          >
            <File className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[180px]">{msg.file_url?.split("/").pop() ?? "File"}</span>
          </a>
        )}
        {(msg.content || (!isImage && !isFile)) && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/10 text-foreground rounded-bl-sm"} ${msg._pending ? "opacity-60" : ""}`}>
            {msg.content || <span className="opacity-50 italic">File</span>}
          </div>
        )}
        <div className={`flex items-center gap-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
          {isMe && (
            showRead || msg.is_read
              ? <CheckCheck className="w-3 h-3 text-primary" />
              : msg._pending
                ? <Check className="w-3 h-3 text-muted-foreground/50" />
                : <Check className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Messages() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const token = getToken();
  const { isConnected, send, addHandler } = useWebSocket(user?.id, token);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Set<number>>(new Set()); // senderIds whose messages I've read
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

  // ── Load conversation list ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoadingConvs(true);
    fetchApi<Conversation[]>("/api/messages")
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [isLoggedIn]);

  // ── Load thread when selecting conversation ────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMsgs(true);
    setMessages([]);
    setTypingUsers(s => { const n = new Set(s); n.delete(selectedId); return n; });
    fetchApi<Message[]>(`/api/messages/${selectedId}`)
      .then(msgs => {
        setMessages(msgs);
        setLoadingMsgs(false);
        // Mark messages from selectedId as read via WS
        send({ type: "read", senderId: selectedId });
        // Clear unread count in conversation list
        setConversations(convs =>
          convs.map(c => c.other_id === selectedId ? { ...c, unread_count: 0 } : c)
        );
      })
      .catch(() => setLoadingMsgs(false));
  }, [selectedId, send]);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // ── WebSocket event handler ────────────────────────────────────────────────
  useEffect(() => {
    const remove = addHandler((msg: WSMsg) => {
      if (msg.type === "message") {
        const m = msg.message as Message;
        const otherId = m.sender_id === user?.id ? m.recipient_id : m.sender_id;

        // Add to thread if we're in that conversation
        if (otherId === selectedIdRef.current || m.sender_id === user?.id) {
          setMessages(prev => {
            // Avoid duplicate (WS echo + REST)
            if (prev.some(p => p.id === m.id)) return prev;
            return [...prev, m];
          });
          // Mark as read if we're looking at this conversation
          if (m.sender_id !== user?.id && otherId === selectedIdRef.current) {
            send({ type: "read", senderId: m.sender_id });
          }
        }

        // Update conversation list
        setConversations(convs => {
          const exists = convs.find(c => c.other_id === otherId);
          const isActive = otherId === selectedIdRef.current;
          const unreadDelta = m.sender_id !== user?.id && !isActive ? 1 : 0;
          if (exists) {
            return convs.map(c =>
              c.other_id === otherId
                ? { ...c, last_content: m.content, last_file_type: m.file_type, last_at: m.created_at, unread_count: c.unread_count + unreadDelta }
                : c
            ).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
          }
          // New conversation
          const newConv: Conversation = {
            other_id: otherId,
            other_username: m.sender_id === user?.id ? m.recipient_username : m.sender_username,
            other_avatar: null,
            last_content: m.content,
            last_file_type: m.file_type,
            last_at: m.created_at,
            unread_count: unreadDelta,
          };
          return [newConv, ...convs];
        });
      }

      if (msg.type === "typing") {
        const { senderId, isTyping } = msg as { senderId: number; isTyping: boolean };
        setTypingUsers(s => {
          const n = new Set(s);
          if (isTyping) n.add(senderId); else n.delete(senderId);
          return n;
        });
      }

      if (msg.type === "read_receipt") {
        const { readBy } = msg as { readBy: number };
        setMessages(prev => prev.map(m => m.recipient_id === readBy ? { ...m, is_read: true } : m));
        setReadReceipts(s => new Set([...s, readBy]));
      }

      if (msg.type === "online_status") {
        const { userId: uid, isOnline } = msg as { userId: number; isOnline: boolean };
        setOnlineUsers(s => {
          const n = new Set(s);
          if (isOnline) n.add(uid); else n.delete(uid);
          return n;
        });
      }

      if (msg.type === "online_users") {
        const { userIds } = msg as { userIds: number[] };
        setOnlineUsers(new Set(userIds));
      }
    });
    return remove;
  }, [addHandler, send, user?.id]);

  // ── User search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetchApi<UserResult[]>(`/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then(setSearchResults)
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMsg.trim() && !uploadingFile) || !selectedId || sending) return;
    if (!newMsg.trim()) return;

    const content = newMsg.trim();
    setNewMsg("");
    setSending(true);

    if (isConnected) {
      // Optimistic local display
      const optimistic: Message = {
        id: Date.now(),
        sender_id: user!.id,
        recipient_id: selectedId,
        content,
        file_url: null,
        file_type: null,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_username: user!.username,
        recipient_username: "",
        _pending: true,
      };
      setMessages(prev => [...prev, optimistic]);

      send({ type: "message", recipientId: selectedId, content });
      setSending(false);

      // Stop typing
      if (typingTimer.current) clearTimeout(typingTimer.current);
      send({ type: "typing", recipientId: selectedId, isTyping: false });
    } else {
      // REST fallback
      fetchApi<Message>(`/api/messages/${selectedId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      })
        .then(msg => {
          setMessages(prev => [...prev, msg]);
          setConversations(convs =>
            convs.map(c => c.other_id === selectedId ? { ...c, last_content: msg.content, last_at: msg.created_at } : c)
          );
        })
        .catch(() => {})
        .finally(() => setSending(false));
    }
  }, [newMsg, selectedId, sending, isConnected, send, uploadingFile, user]);

  // ── Typing indicator ───────────────────────────────────────────────────────
  const handleTyping = useCallback((value: string) => {
    setNewMsg(value);
    if (!selectedId || !isConnected) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    send({ type: "typing", recipientId: selectedId, isTyping: true });
    typingTimer.current = setTimeout(() => {
      send({ type: "typing", recipientId: selectedId, isTyping: false });
    }, 3000);
  }, [selectedId, isConnected, send]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    e.target.value = "";
    setUploadingFile(true);

    try {
      const { url, fileType } = await uploadFile(file);
      if (isConnected) {
        send({ type: "message", recipientId: selectedId, content: "", fileUrl: url, fileType });
      } else {
        const msg = await fetchApi<Message>(`/api/messages/${selectedId}`, {
          method: "POST",
          body: JSON.stringify({ content: "", fileUrl: url, fileType }),
        });
        setMessages(prev => [...prev, msg]);
      }
    } catch {
      // silent
    } finally {
      setUploadingFile(false);
    }
  }, [selectedId, isConnected, send]);

  // ── Start conversation from search ─────────────────────────────────────────
  const startConversation = useCallback((u: UserResult) => {
    setSearchQuery("");
    setSearchResults([]);
    if (!conversations.find(c => c.other_id === u.id)) {
      setConversations(c => [{
        other_id: u.id,
        other_username: u.username,
        other_avatar: u.avatarUrl,
        last_content: "",
        last_file_type: null,
        last_at: new Date().toISOString(),
        unread_count: 0,
      }, ...c]);
    }
    setSelectedId(u.id);
  }, [conversations]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-12">
          <Skeleton className="h-[70vh] w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Sign in to use messages</h2>
          <Button onClick={() => setLocation("/login")}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  const selectedConv = conversations.find(c => c.other_id === selectedId);
  const isSelectedOnline = selectedId ? onlineUsers.has(selectedId) : false;
  const isSelectedTyping = selectedId ? typingUsers.has(selectedId) : false;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black">Messages</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_6px_hsl(142,71%,45%)]" : "bg-zinc-500"}`} />
            <span className="text-muted-foreground">{isConnected ? "Live" : "Reconnecting…"}</span>
          </div>
        </div>

        {/* Chat Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-0 rounded-2xl border border-white/10 overflow-hidden bg-card shadow-[0_0_40px_-15px_hsl(var(--primary)/0.2)]" style={{ height: "75vh" }}>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div className="border-r border-white/10 flex flex-col min-w-0">

            {/* Search */}
            <div className="p-3 border-b border-white/10 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users…"
                  className="pl-9 h-8 text-sm bg-white/5 border-white/10"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {(searchResults.length > 0 || searching) && (
                <div className="absolute left-3 right-3 top-[calc(100%_-_4px)] bg-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {searching && <div className="p-3 text-sm text-muted-foreground text-center">Searching…</div>}
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="relative">
                        <Avatar name={u.username} url={u.avatarUrl} size={8} />
                        <OnlineDot online={onlineUsers.has(u.id)} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{u.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.accountType}</p>
                      </div>
                    </button>
                  ))}
                  {!searching && searchResults.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2 mt-8">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Search for a user above to start</p>
                </div>
              ) : (
                conversations.map(conv => {
                  const isOnline = onlineUsers.has(conv.other_id);
                  const isActive = selectedId === conv.other_id;
                  const lastText = conv.last_file_type === "image" ? "📷 Image" : conv.last_file_type === "file" ? "📎 File" : conv.last_content;
                  return (
                    <button
                      key={conv.other_id}
                      onClick={() => setSelectedId(conv.other_id)}
                      className={`w-full text-left px-3 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3 min-w-0 ${isActive ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={conv.other_username} url={conv.other_avatar} size={10} />
                        <OnlineDot online={isOnline} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold truncate">{conv.other_username}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(conv.last_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {typingUsers.has(conv.other_id)
                              ? <span className="text-primary italic">typing…</span>
                              : lastText || <span className="italic">New conversation</span>
                            }
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-[0_0_8px_-2px_hsl(var(--primary))]">
                              {conv.unread_count > 99 ? "99+" : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Chat window ───────────────────────────────────────────── */}
          <div className="flex flex-col min-w-0 min-h-0">
            {selectedId ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
                  <div className="relative">
                    <Avatar name={selectedConv?.other_username ?? `User ${selectedId}`} url={selectedConv?.other_avatar} size={9} />
                    <OnlineDot online={isSelectedOnline} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedConv?.other_username ?? `User #${selectedId}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {isSelectedTyping
                        ? <span className="text-primary">typing…</span>
                        : isSelectedOnline ? <span className="text-emerald-500">Online</span> : "Offline"
                      }
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
                  {loadingMsgs ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className={`h-10 w-2/3 rounded-2xl ${i % 2 === 0 ? "ml-auto" : ""}`} />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold">No messages yet</p>
                        <p className="text-sm mt-1">Say hello to {selectedConv?.other_username ?? "this user"}!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => {
                        const isMe = msg.sender_id === user.id;
                        const prevMsg = messages[i - 1];
                        const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                        const isLastFromMe = isMe && (i === messages.length - 1 || messages[i + 1]?.sender_id !== user.id);
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[10px] text-muted-foreground px-2">
                                  {new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                                </span>
                                <div className="flex-1 h-px bg-white/5" />
                              </div>
                            )}
                            <MessageBubble msg={msg} isMe={isMe} showRead={isLastFromMe && readReceipts.has(msg.recipient_id)} />
                          </div>
                        );
                      })}

                      {/* Typing indicator */}
                      {isSelectedTyping && (
                        <div className="flex items-end gap-2">
                          <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/10 flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
                  {uploadingFile && (
                    <div className="text-xs text-primary mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Uploading file…
                    </div>
                  )}
                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.zip,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <Input
                      value={newMsg}
                      onChange={e => handleTyping(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={(!newMsg.trim() && !uploadingFile) || sending}
                      className="flex-shrink-0 w-10 h-10 p-0 shadow-[0_0_15px_-5px_hsl(var(--primary))]"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-3">
                  <MessageSquare className="w-14 h-14 mx-auto opacity-10" />
                  <p className="text-lg font-semibold opacity-60">Select a conversation</p>
                  <p className="text-sm opacity-40">Or search for someone to message</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </MainLayout>
  );
}
