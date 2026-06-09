import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMyCreatorProfile, useCreateCreatorProfile, useUpdateCreatorProfile, useGetCategories } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

const EXPERIENCE_LEVELS = ["Less than 1 year", "1 year", "2 years", "3 years", "4 years", "5 years", "6+ years"];
const CREATOR_LEVELS = ["Newcomer", "Rising Star", "Professional", "Expert", "Legendary"];

export default function DashboardProfile() {
  const { isCreator } = useAuth();
  const { data: profile, isLoading } = useGetMyCreatorProfile();
  const { data: categories } = useGetCategories();
  const createProfile = useCreateCreatorProfile();
  const updateProfile = useUpdateCreatorProfile();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

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

    const action = profile ? updateProfile.mutate({ data }) : createProfile.mutate({ data });
    const mutation = profile ? updateProfile : createProfile;

    mutation.mutate({ data } as Parameters<typeof mutation.mutate>[0], {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getMyCreatorProfile"] });
        setMsg(profile ? "Profile updated!" : "Profile created!");
        setTimeout(() => setMsg(""), 3000);
      },
      onError: (err: unknown) => {
        const apiErr = err as { data?: { error?: string }; message?: string };
        setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to save");
      }
    });
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
            {profile ? "Update your public creator profile" : "Complete your profile to start uploading work and getting hired"}
          </p>

          {msg && <div className="mb-6 px-4 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">{msg}</div>}

          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input id="displayName" value={form.displayName} onChange={e => update("displayName", e.target.value)} placeholder="NeonPixel Art" className="mt-1.5" required />
              </div>

              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input id="avatarUrl" value={form.avatarUrl} onChange={e => update("avatarUrl", e.target.value)} placeholder="https://..." className="mt-1.5" />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={form.bio} onChange={e => update("bio", e.target.value)} placeholder="Tell clients about yourself, your skills, experience..." className="mt-1.5" rows={4} />
              </div>

              <div>
                <Label htmlFor="servicesOffered">Services Offered</Label>
                <Input id="servicesOffered" value={form.servicesOffered} onChange={e => update("servicesOffered", e.target.value)} placeholder="Thumbnail Designing, GFX, Video Editing" className="mt-1.5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Info</h3>
                <div>
                  <Label htmlFor="gmailAddress">Gmail Address</Label>
                  <Input id="gmailAddress" type="email" value={form.gmailAddress} onChange={e => update("gmailAddress", e.target.value)} placeholder="yourname@gmail.com" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="discordUsername">Discord Username</Label>
                  <Input id="discordUsername" value={form.discordUsername} onChange={e => update("discordUsername", e.target.value)} placeholder="YourName#1234" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input id="portfolioUrl" value={form.portfolioUrl} onChange={e => update("portfolioUrl", e.target.value)} placeholder="https://your-portfolio.com" className="mt-1.5" />
                </div>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]" disabled={createProfile.isPending || updateProfile.isPending}>
                {(createProfile.isPending || updateProfile.isPending) ? "Saving…" : profile ? "Save Changes" : "Create Profile"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
