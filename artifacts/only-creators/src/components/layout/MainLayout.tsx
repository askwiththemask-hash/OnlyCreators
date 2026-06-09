import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { retry: false }});
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("auth_token");
        queryClient.clear();
        setLocation("/login");
      }
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">ONLY CREATORS</span>
          </Link>
          <div className="hidden md:flex gap-4">
            <Link href="/browse" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse</Link>
            <Link href="/requests" className="text-sm text-muted-foreground hover:text-primary transition-colors">Requests</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.accountType === 'creator' && (
                <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10" onClick={() => setLocation("/dashboard")}>
                  Dashboard
                </Button>
              )}
              {user.role === 'admin' && (
                <Button variant="ghost" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => setLocation("/admin")}>
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
              <Button variant="outline" className="border-white/10" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setLocation("/login")}>Login</Button>
              <Button onClick={() => setLocation("/register")}>Sign Up</Button>
            </>
          )}
        </div>
      </div>
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
          <p className="text-sm">The premium marketplace for gaming creators.</p>
        </div>
      </footer>
    </div>
  );
}
