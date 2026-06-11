import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

function getToken() { return localStorage.getItem("auth_token"); }

interface PinRow {
  pin: string;
  used: boolean;
  usedByUserId: number | null;
  usedByUsername: string | null;
  usedByEmail: string | null;
  createdAt: string | null;
}

export default function AdminPins() {
  const { isAdmin } = useAuth();
  const [pins, setPins] = useState<PinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const token = getToken();
    fetch("/api/admin/pins", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => { setPins(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <Link href="/"><Button className="mt-4">Go Home</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const used = pins.filter(p => p.used).length;
  const unused = pins.filter(p => !p.used).length;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-xl">Creator PIN Management</h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-card p-5">
            <p className="text-3xl font-black">{pins.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total PINs</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-5">
            <p className="text-3xl font-black text-emerald-400">{unused}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Available</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-5">
            <p className="text-3xl font-black text-destructive">{used}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Used</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <span className="col-span-2">PIN</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-4">Used By</span>
              <span className="col-span-4">Email</span>
            </div>
            {pins.map(pin => (
              <div key={pin.pin} className={`grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl border ${pin.used ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <div className="col-span-2">
                  <code className="font-mono font-bold text-sm tracking-widest">{pin.pin}</code>
                </div>
                <div className="col-span-2">
                  <Badge variant={pin.used ? "destructive" : "default"} className={pin.used ? "" : "bg-emerald-600 hover:bg-emerald-700"}>
                    {pin.used ? "Used" : "Available"}
                  </Badge>
                </div>
                <div className="col-span-4 text-sm">
                  {pin.usedByUsername ? (
                    <span className="font-semibold">{pin.usedByUsername}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="col-span-4 text-sm text-muted-foreground truncate">
                  {pin.usedByEmail ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-sm text-yellow-300">
          <p className="font-bold mb-1">⚠️ Security Notice</p>
          <p className="text-yellow-300/70">This page is only visible to admins. Creator PINs are stored securely and are never exposed publicly. Each PIN can only be used once.</p>
        </div>
      </div>
    </MainLayout>
  );
}
