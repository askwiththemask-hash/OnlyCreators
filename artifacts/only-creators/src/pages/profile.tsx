import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUpdateUser, useGetMyFavorites } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const { user, isLoggedIn, isLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "" });
  const [msg, setMsg] = useState("");
  const updateUser = useUpdateUser();
  const { data: favorites } = useGetMyFavorites();

  if (isLoading) return <MainLayout><div className="container py-12"><Skeleton className="h-40 w-full rounded-2xl" /></div></MainLayout>;

  if (!isLoggedIn || !user) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <Link href="/login"><Button>Sign In</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const startEdit = () => {
    setForm({ username: user.username ?? "", bio: (user as typeof user & { bio?: string }).bio ?? "" });
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({ id: user.id, data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
        setEditing(false);
        setMsg("Profile updated!");
        setTimeout(() => setMsg(""), 3000);
      },
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-black mb-8">My Profile</h1>

        {msg && <div className="mb-6 px-4 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">{msg}</div>}

        <div className="rounded-2xl border border-white/10 bg-card p-8 mb-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-black text-white">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{user.accountType === "creator" ? "🎨 Creator" : "👤 Customer"}</Badge>
                {user.role === "admin" && <Badge className="bg-destructive/20 text-destructive">Admin</Badge>}
              </div>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} className="mt-1" rows={3} placeholder="Tell us about yourself..." />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={updateUser.isPending}>{updateUser.isPending ? "Saving…" : "Save Changes"}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" onClick={startEdit}>Edit Profile</Button>
          )}
        </div>

        {/* Favorites */}
        <div className="rounded-2xl border border-white/10 bg-card p-8">
          <h3 className="text-xl font-bold mb-6">Saved Works ({favorites?.length ?? 0})</h3>
          {!favorites?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-3">☆</p>
              <p>No saved works yet. Browse and save samples you like!</p>
              <Link href="/browse"><Button variant="outline" className="mt-4">Browse Now</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((sample) => (
                <Link key={sample.id} href={`/sample/${sample.id}`} className="group flex gap-3 rounded-xl border border-white/5 bg-muted/30 p-3 hover:border-primary/30 transition-all">
                  {sample.previewImageUrl && (
                    <img src={sample.previewImageUrl} alt={sample.title} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{sample.title}</p>
                    <p className="text-xs text-muted-foreground">{sample.creatorName}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
