import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Bookmark } from "lucide-react";

interface SavedSample {
  id: number;
  title: string;
  category: string;
  previewImageUrl: string | null;
  budget: number | null;
  likeCount: number;
  creatorName: string | null;
}

function getToken() { return localStorage.getItem("auth_token"); }

export default function Saved() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [samples, setSamples] = useState<SavedSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const token = getToken();
    fetch("/api/users/me/favorites", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSamples(Array.isArray(data) ? data : []))
      .catch(() => setSamples([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Sign in to view saved items</h2>
          <p className="text-muted-foreground mb-6">Save your favorite creator work to access it anytime.</p>
          <Link href="/login"><Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">Sign In</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-black">Saved Items</h1>
          {samples.length > 0 && (
            <Badge variant="secondary" className="ml-1">{samples.length}</Badge>
          )}
        </div>

        {samples.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-white/10 bg-card">
            <p className="text-5xl mb-4">⭐</p>
            <h3 className="text-xl font-bold mb-2">No saved items yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Browse creator work and click the Save button to bookmark it here.</p>
            <Link href="/browse"><Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">Browse Work</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {samples.map(sample => (
              <Link key={sample.id} href={`/sample/${sample.id}`} className="group block">
                <div className="rounded-xl border border-white/10 bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]">
                  <div className="aspect-video bg-white/5 relative overflow-hidden">
                    {sample.previewImageUrl ? (
                      <img
                        src={sample.previewImageUrl}
                        alt={sample.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate mb-1">{sample.title}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{sample.category}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        {sample.likeCount}
                      </div>
                    </div>
                    {sample.budget != null && (
                      <p className="text-primary font-bold text-sm mt-1.5">₹{sample.budget}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
