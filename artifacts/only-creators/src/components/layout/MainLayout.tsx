import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { Menu, X, MessageSquare, LayoutDashboard, Shield, User } from "lucide-react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = useGetMe({ query: { retry: false } });
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
        {/* Logo + desktop nav */}
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

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setLocation("/messages")}
              >
                <MessageSquare className="w-4 h-4" />
                Messages
              </Button>
              {user.accountType === "creator" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 gap-1.5"
                  onClick={() => setLocation("/dashboard")}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              )}
              {user.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1.5"
                  onClick={() => setLocation("/admin")}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setLocation("/profile")}
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 ml-1"
                onClick={handleLogout}
              >
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

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
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
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-12 border-t border-white/10 bg-background/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-bold text-lg mb-2 text-foreground">ONLY CREATORS</p>
          <p className="text-sm mb-4">The premium marketplace for gaming creators.</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/browse" className="hover:text-primary transition-colors">Browse</Link>
            <Link href="/mods" className="hover:text-primary transition-colors">Mods</Link>
            <Link href="/requests" className="hover:text-primary transition-colors">Requests</Link>
            <Link href="/messages" className="hover:text-primary transition-colors">Messages</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
