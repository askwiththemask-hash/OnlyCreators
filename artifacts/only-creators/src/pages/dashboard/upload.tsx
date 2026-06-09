import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateSample, useGetCategories } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const GAME_TYPES = ["Minecraft", "Roblox", "BGMI", "Free Fire", "GTA V", "Fortnite", "Valorant", "General"];

export default function DashboardUpload() {
  const [, setLocation] = useLocation();
  const { isCreator } = useAuth();
  const { data: categories } = useGetCategories();
  const createSample = useCreateSample();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    gameType: "",
    budget: "",
    previewImageUrl: "",
    previewVideoUrl: "",
    tags: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (!isCreator) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Creator account required</h2>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const tagsArray = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    createSample.mutate({
      data: {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        gameType: form.gameType || undefined,
        budget: form.budget ? parseInt(form.budget, 10) : undefined,
        previewImageUrl: form.previewImageUrl || undefined,
        previewVideoUrl: form.previewVideoUrl || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      }
    }, {
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => setLocation("/dashboard"), 2000);
      },
      onError: (err: unknown) => {
        const apiErr = err as { data?: { error?: string }; message?: string };
        setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to upload");
      }
    });
  };

  if (success) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Submitted for Review!</h2>
          <p className="text-muted-foreground">Your work will be reviewed by the team and published shortly.</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard…</p>
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
          <h1 className="font-bold">Upload Work</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-black mb-6">Submit Your Work</h2>
          <p className="text-sm text-muted-foreground mb-8">Your submission will be reviewed before going live. Ensure your work is high quality!</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={e => update("title", e.target.value)} placeholder="Epic Minecraft Thumbnail Pack" className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe your work, what's included, turnaround time..." className="mt-1.5" rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => update("category", v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.icon} {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Game Type</Label>
                <Select value={form.gameType} onValueChange={v => update("gameType", v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="budget">Starting Price (₹)</Label>
              <Input id="budget" type="number" min="0" value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="e.g. 150" className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="previewImageUrl">Preview Image URL</Label>
              <Input id="previewImageUrl" value={form.previewImageUrl} onChange={e => update("previewImageUrl", e.target.value)} placeholder="https://..." className="mt-1.5" />
              {form.previewImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 aspect-video w-full">
                  <img src={form.previewImageUrl} alt="Preview" className="w-full h-full object-cover" onError={() => update("previewImageUrl", "")} />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="previewVideoUrl">Preview Video URL</Label>
              <Input id="previewVideoUrl" value={form.previewVideoUrl} onChange={e => update("previewVideoUrl", e.target.value)} placeholder="https://..." className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" value={form.tags} onChange={e => update("tags", e.target.value)} placeholder="minecraft, thumbnail, neon" className="mt-1.5" />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 shadow-[0_0_20px_-5px_hsl(var(--primary))]" disabled={createSample.isPending || !form.title || !form.category}>
                {createSample.isPending ? "Submitting…" : "Submit for Review"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
