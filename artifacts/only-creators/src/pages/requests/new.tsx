import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateRequest, useGetCategories } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const GAME_TYPES = ["Minecraft", "Roblox", "BGMI", "Free Fire", "GTA V", "Fortnite", "Valorant", "General"];

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const { isLoggedIn } = useAuth();
  const { data: categories } = useGetCategories();
  const createRequest = useCreateRequest();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    gameType: "",
    budget: "",
    deadline: "",
    referenceImageUrl: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Sign in to post a request</h2>
          <Link href="/login"><Button>Sign In</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createRequest.mutate({
      data: {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        gameType: form.gameType || undefined,
        budget: form.budget ? parseInt(form.budget, 10) : undefined,
        deadline: form.deadline || undefined,
        referenceImageUrl: form.referenceImageUrl || undefined,
      }
    }, {
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => setLocation("/requests"), 2000);
      },
      onError: (err: unknown) => {
        const apiErr = err as { data?: { error?: string }; message?: string };
        setError(apiErr?.data?.error ?? apiErr?.message ?? "Failed to create request");
      }
    });
  };

  if (success) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Request Posted!</h2>
          <p className="text-muted-foreground">Creators will reach out to you soon.</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting…</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/requests" className="text-muted-foreground hover:text-foreground transition-colors">Requests</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold">New Request</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-8">
          <h2 className="text-2xl font-black mb-2">Post a Work Request</h2>
          <p className="text-sm text-muted-foreground mb-8">Let creators know what you need. Be specific for better responses!</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">What do you need? *</Label>
              <Input id="title" value={form.title} onChange={e => update("title", e.target.value)} placeholder="Custom Minecraft SMP Thumbnail" className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="description">Details</Label>
              <Textarea id="description" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe what you need — style, dimensions, references, any specific requirements..." className="mt-1.5" rows={5} />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input id="budget" type="number" min="0" value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="e.g. 500" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={form.deadline} onChange={e => update("deadline", e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label htmlFor="referenceImageUrl">Reference Image URL</Label>
              <Input id="referenceImageUrl" value={form.referenceImageUrl} onChange={e => update("referenceImageUrl", e.target.value)} placeholder="https://..." className="mt-1.5" />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 shadow-[0_0_20px_-5px_hsl(var(--primary))]" disabled={createRequest.isPending || !form.title || !form.category}>
                {createRequest.isPending ? "Posting…" : "Post Request"}
              </Button>
              <Link href="/requests">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
