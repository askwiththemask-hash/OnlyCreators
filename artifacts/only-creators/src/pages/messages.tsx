import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Send, MessageSquare } from "lucide-react";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

interface Conversation {
  other_id: number;
  other_username: string;
  last_content: string;
  last_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username: string;
  recipient_username: string;
}

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
  return res.json();
}

export default function Messages() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendToInput, setSendToInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoadingConvs(true);
    fetchApi<Conversation[]>("/api/messages")
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMsgs(true);
    fetchApi<Message[]>(`/api/messages/${selectedId}`)
      .then(msgs => { setMessages(msgs); setLoadingMsgs(false); })
      .catch(() => setLoadingMsgs(false));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const msg = await fetchApi<Message>(`/api/messages/${selectedId}`, {
        method: "POST",
        body: JSON.stringify({ content: newMsg.trim() }),
      });
      setMessages(m => [...m, msg]);
      setNewMsg("");
      setConversations(convs =>
        convs.map(c => c.other_id === selectedId ? { ...c, last_content: msg.content, last_at: msg.created_at } : c)
      );
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = parseInt(sendToInput.trim(), 10);
    if (isNaN(userId) || userId === user?.id) return;
    setSelectedId(userId);
    setSendToInput("");
    if (!conversations.find(c => c.other_id === userId)) {
      setConversations(c => [{ other_id: userId, other_username: `User #${userId}`, last_content: "", last_at: new Date().toISOString(), unread_count: 0 }, ...c]);
    }
  };

  if (isLoading) return <MainLayout><div className="container py-12"><Skeleton className="h-96 w-full rounded-2xl" /></div></MainLayout>;

  if (!isLoggedIn || !user) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Please log in to use messages</h2>
          <Button onClick={() => setLocation("/login")}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  const selectedConv = conversations.find(c => c.other_id === selectedId);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-black mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-2xl border border-white/10 overflow-hidden bg-card" style={{ height: "70vh" }}>
          {/* Conversations sidebar */}
          <div className="border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <form onSubmit={handleStartConversation} className="flex gap-2">
                <Input
                  value={sendToInput}
                  onChange={e => setSendToInput(e.target.value)}
                  placeholder="User ID to message..."
                  className="text-sm"
                />
                <Button type="submit" size="sm" variant="outline">Go</Button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Enter a User ID above to start messaging</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.other_id}
                    onClick={() => setSelectedId(conv.other_id)}
                    className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${selectedId === conv.other_id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {(conv.other_username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{conv.other_username}</p>
                          {conv.unread_count > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{conv.unread_count}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_content}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message thread */}
          <div className="md:col-span-2 flex flex-col">
            {selectedId ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
                    {(selectedConv?.other_username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedConv?.other_username ?? `User #${selectedId}`}</p>
                    <p className="text-xs text-muted-foreground">User ID: {selectedId}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-3/4 rounded-xl" />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No messages yet. Say hello!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/10 rounded-bl-sm"}`}>
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                    />
                    <Button type="submit" disabled={!newMsg.trim() || sending} className="flex-shrink-0 shadow-[0_0_15px_-5px_hsl(var(--primary))]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-semibold">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the left or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
