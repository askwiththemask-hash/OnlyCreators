import { useState, useRef } from "react";
import { Link } from "wouter";
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
import { Camera, Loader2, CheckCircle2 } from "lucide-react";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

async function uploadAvatar(file: File): Promise<string> {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) throw new Error("Only PNG, JPG, WEBP images allowed");
  if (file.size > 20 * 1024 * 1024) throw new Error("Image must be under 20 MB");

  const token = getToken();
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to get upload URL");
  }
  const { uploadURL, objectPath } = await res.json();
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Failed to upload image");
  return `/api/storage${objectPath}`;
}

export default function UserProfile() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", avatarUrl: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const updateUser = useUpdateUser();
  const { data: favorites } = useGetMyFavorites();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-12">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

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

  const currentAvatar = (user as typeof user & { avatarUrl?: string }).avatarUrl;

  const startEdit = () => {
    setForm({
      username: user.username ?? "",
      bio: (user as typeof user & { bio?: string }).bio ?? "",
      avatarUrl: currentAvatar ?? "",
    });
    setAvatarPreview(null);
    setError("");
    setEditing(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingAvatar(true);
    setError("");
    try {
      const url = await uploadAvatar(file);
      setForm(f => ({ ...f, avatarUrl: url }));
      setAvatarPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    updateUser.mutate(
      { id: user.id, data: { username: form.username || undefined, bio: form.bio || undefined, avatarUrl: form.avatarUrl || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getMe"] });
          setEditing(false);
          setAvatarPreview(null);
          setMsg("Profile updated!");
          setTimeout(() => setMsg(""), 3000);
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; message?: string };
          setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to save");
        },
      }
    );
  };

  const displayAvatar = avatarPreview ?? currentAvatar;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-black mb-8">My Profile</h1>

        {msg && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {msg}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-card p-8 mb-6">
          {/* Avatar + header */}
          <div className="flex items-start gap-5 mb-8">
            <div className="relative flex-shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={user.username}
                  className="w-24 h-24 rounded-2xl object-cover border border-white/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-black text-white">
                  {user.username?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors shadow-lg"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold truncate">{user.username}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">
                  {user.accountType === "creator" ? "🎨 Creator" : "👤 Customer"}
                </Badge>
                {user.role === "admin" && (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    ⚡ Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Your username"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="mt-1.5"
                  rows={3}
                  placeholder="Tell the community about yourself..."
                />
              </div>

              <div>
                <Label>Profile Picture</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  {form.avatarUrl ? (
                    <img src={avatarPreview ?? form.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold">
                      {user.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                    ) : (
                      <><Camera className="w-4 h-4 mr-2" />Change Photo</>
                    )}
                  </Button>
                  {form.avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setForm(f => ({ ...f, avatarUrl: "" })); setAvatarPreview(null); }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, WEBP · Max 20 MB</p>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={updateUser.isPending || uploadingAvatar}
                  className="shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                >
                  {updateUser.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  ) : "Save Changes"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setEditing(false); setError(""); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {(user as typeof user & { bio?: string }).bio && (
                <p className="text-muted-foreground text-sm">
                  {(user as typeof user & { bio?: string }).bio}
                </p>
              )}
              <Button variant="outline" onClick={startEdit}>
                Edit Profile
              </Button>
            </div>
          )}
        </div>

        {/* Favorites */}
        <div className="rounded-2xl border border-white/10 bg-card p-8">
          <h3 className="text-xl font-bold mb-6">
            Saved Works <span className="text-muted-foreground text-base font-normal">({favorites?.length ?? 0})</span>
          </h3>
          {!favorites?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-3">☆</p>
              <p>No saved works yet. Browse and save samples you like!</p>
              <Link href="/browse">
                <Button variant="outline" className="mt-4">Browse Now</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((sample) => (
                <Link
                  key={sample.id}
                  href={`/sample/${sample.id}`}
                  className="group flex gap-3 rounded-xl border border-white/5 bg-muted/30 p-3 hover:border-primary/30 transition-all"
                >
                  {sample.previewImageUrl && (
                    <img
                      src={sample.previewImageUrl}
                      alt={sample.title}
                      className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {sample.title}
                    </p>
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
