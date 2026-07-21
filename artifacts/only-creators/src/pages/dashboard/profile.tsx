import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGetMyCreatorProfile, useCreateCreatorProfile, useUpdateCreatorProfile } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Camera, Loader as Loader2, CircleCheck as CheckCircle2 } from "lucide-react";

const EXPERIENCE_LEVELS = ["Less than 1 year", "1 year", "2 years", "3 years", "4 years", "5 years", "6+ years"];

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
  const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!putRes.ok) throw new Error("Failed to upload image");
  return `/api/storage${objectPath}`;
}

export default function DashboardProfile() {
  const { isCreator } = useAuth();
  const { data: profile, isLoading } = useGetMyCreatorProfile();
  const createProfile = useCreateCreatorProfile();
  const updateProfile = useUpdateCreatorProfile();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    gmailAddress: "",
    discordUsername: "",
    servicesOffered: "",
    experienceLevel: "",
    portfolioUrl: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        gmailAddress: profile.gmailAddress ?? "",
        discordUsername: profile.discordUsername ?? "",
        servicesOffered: profile.servicesOffered ?? "",
        experienceLevel: profile.experienceLevel ?? "",
        portfolioUrl: profile.portfolioUrl ?? "",
        avatarUrl: profile.avatarUrl ?? "",
      });
    }
  }, [profile]);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const data = {
      displayName: form.displayName,
      bio: form.bio || undefined,
      gmailAddress: form.gmailAddress || undefined,
      discordUsername: form.discordUsername || undefined,
      servicesOffered: form.servicesOffered || undefined,
      experienceLevel: form.experienceLevel || undefined,
      portfolioUrl: form.portfolioUrl || undefined,
      avatarUrl: form.avatarUrl || undefined,
    };

    if (profile) {
      updateProfile.mutate({ data } as Parameters<typeof updateProfile.mutate>[0], {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getMyCreatorProfile"] });
          setMsg("Profile updated!");
          setAvatarPreview(null);
          setTimeout(() => setMsg(""), 3000);
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; message?: string };
          setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to save");
        },
      });
    } else {
      createProfile.mutate({ data } as Parameters<typeof createProfile.mutate>[0], {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getMyCreatorProfile"] });
          setMsg("Profile created!");
          setAvatarPreview(null);
          setTimeout(() => setMsg(""), 3000);
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; message?: string };
          setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to save");
        },
      });
    }
  };

  if (!isCreator) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Creator account required</h2>
          <Link href="/"><Button>Go Home</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const displayAvatar = avatarPreview ?? form.avatarUrl;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold">Creator Profile</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-black mb-2">{profile ? "Edit" : "Set Up"} Creator Profile</h2>
          <p className="text-sm text-muted-foreground mb-8">
            {profile
              ? "Update your public creator profile"
              : "Complete your profile to start uploading work and getting hired"}
          </p>

          {msg && (
            <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {msg}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar upload */}
              <div>
                <Label>Profile Picture</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt="Avatar"
                        className="w-20 h-20 rounded-2xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-2xl font-black text-white">
                        {form.displayName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg transition-colors"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? "Uploading…" : "Upload Photo"}
                    </Button>
                    {form.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-destructive hover:text-destructive"
                        onClick={() => { setForm(f => ({ ...f, avatarUrl: "" })); setAvatarPreview(null); }}
                      >
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP · Max 20 MB</p>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={e => update("displayName", e.target.value)}
                  placeholder="NeonPixel Art"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={e => update("bio", e.target.value)}
                  placeholder="Tell clients about yourself, your skills, experience..."
                  className="mt-1.5"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="servicesOffered">Services Offered</Label>
                <Input
                  id="servicesOffered"
                  value={form.servicesOffered}
                  onChange={e => update("servicesOffered", e.target.value)}
                  placeholder="Thumbnail Designing, GFX, Video Editing"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Experience Level</Label>
                <Select value={form.experienceLevel} onValueChange={v => update("experienceLevel", v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Info</h3>
                <div>
                  <Label htmlFor="gmailAddress">Gmail Address</Label>
                  <Input
                    id="gmailAddress"
                    type="email"
                    value={form.gmailAddress}
                    onChange={e => update("gmailAddress", e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="discordUsername">Discord Username</Label>
                  <Input
                    id="discordUsername"
                    value={form.discordUsername}
                    onChange={e => update("discordUsername", e.target.value)}
                    placeholder="YourName#1234"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input
                    id="portfolioUrl"
                    value={form.portfolioUrl}
                    onChange={e => update("portfolioUrl", e.target.value)}
                    placeholder="https://your-portfolio.com"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                disabled={createProfile.isPending || updateProfile.isPending || uploadingAvatar}
              >
                {createProfile.isPending || updateProfile.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                ) : profile ? "Save Changes" : "Create Profile"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
