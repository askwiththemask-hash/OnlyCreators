import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { Menu, X, MessageSquare, LayoutDashboard, Shield, User, Bell, Bookmark } from "lucide-react";

function getToken() { return localStorage.getItem("auth_token"); }
async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers } });
  if (!r.ok) throw new Error();
  return r.json();
}

interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  sampleId?: number | null;
  createdAt: string;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: user } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (!user) return;
    const load = () => apiFetch<Notification[]>("/api/notifications").then(n => { setNotifs(n); setUnread(n.filter(x => !x.isRead).length); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await apiFetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  if (!user) return null;

  const typeIcon: Record<string, string> = { like: "❤️", comment: "💬", follow: "👤", review: "★" };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_-2px_hsl(var(--primary))]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-card">
            <span className="font-bold text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : notifs.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${!n.isRead ? "bg-primary/5" : ""}`}
              onClick={async () => {
                if (!n.isRead) {
                  await apiFetch(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
                  setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                  setUnread(u => Math.max(0, u - 1));
                }
                if (n.sampleId) setOpen(false);
              }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                {n.sampleId ? (
                  <Link href={`/sample/${n.sampleId}`} className="text-sm leading-snug hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                    {n.message}
                  </Link>
                ) : (
                  <p className="text-sm leading-snug">{n.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("auth_token");
        queryClient.clear();
        setLocation("/login");
      },
    });
    setMobileOpen(false);
  };

  const navLinks = [
    { href: "/browse", label: "Browse" },
    { href: "/mods", label: "Mods" },
    { href: "/requests", label: "Requests" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              ONLY CREATORS
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${location === href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <NotificationBell />
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5" onClick={() => setLocation("/messages")}>
                <MessageSquare className="w-4 h-4" />Messages
              </Button>
              {user.accountType === "creator" && (
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5" onClick={() => setLocation("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4" />Dashboard
                </Button>
              )}
              {user.role === "admin" && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1.5" onClick={() => setLocation("/admin")}>
                  <Shield className="w-4 h-4" />Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setLocation("/saved")}>
                <Bookmark className="w-4 h-4" />Saved
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setLocation("/profile")}>
                <User className="w-4 h-4" />Profile
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 ml-1" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/login")}>Login</Button>
              <Button size="sm" onClick={() => setLocation("/register")}>Sign Up</Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" onClick={() => setMobileOpen(false)}>
                {label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/messages" className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <MessageSquare className="w-4 h-4" />Messages
                </Link>
                {user.accountType === "creator" && (
                  <Link href="/dashboard" className="px-3 py-2.5 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="w-4 h-4" />Dashboard
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link href="/admin" className="px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <Shield className="w-4 h-4" />Admin
                  </Link>
                )}
                <Link href="/saved" className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <Bookmark className="w-4 h-4" />Saved
                </Link>
                <Link href="/profile" className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <User className="w-4 h-4" />Profile
                </Link>
                <button onClick={handleLogout} className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-destructive transition-colors text-left">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link href="/register" className="px-3 py-2.5 rounded-md text-sm bg-primary text-primary-foreground rounded-md font-semibold text-center" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="py-12 border-t border-white/10 bg-background/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-bold text-lg mb-2 text-foreground">ONLY CREATORS</p>
          <p className="text-sm mb-4">The premium marketplace for gaming creators.</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/browse" className="hover:text-primary transition-colors">Browse</Link>
            <Link href="/mods" className="hover:text-primary transition-colors">Mods</Link>
            <Link href="/requests" className="hover:text-primary transition-colors">Requests</Link>
            <Link href="/messages" className="hover:text-primary transition-colors">Messages</Link>
            <Link href="/saved" className="hover:text-primary transition-colors">Saved</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
