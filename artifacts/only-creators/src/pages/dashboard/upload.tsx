import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useCreateSample, useGetCategories } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Upload, X, Image, Video, CheckCircle2, Loader2 } from "lucide-react";

const GAME_TYPES = ["Minecraft", "Roblox", "BGMI", "Free Fire", "GTA V", "Fortnite", "Valorant", "General"];

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

interface UploadedFile {
  objectPath: string;
  previewUrl: string;
  name: string;
  type: "image" | "video";
}

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
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
  return res.json();
}

async function uploadToGcs(file: File, uploadURL: string): Promise<void> {
  const res = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Failed to upload file to storage");
}

function FileDropZone({
  accept,
  label,
  icon: Icon,
  onUpload,
  uploaded,
  onRemove,
  isUploading,
}: {
  accept: string;
  label: string;
  icon: typeof Image;
  onUpload: (file: File) => void;
  uploaded: UploadedFile | null;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  if (uploaded) {
    return (
      <div className="relative rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
        {uploaded.type === "image" ? (
          <img src={uploaded.previewUrl} alt={uploaded.name} className="w-full aspect-video object-cover" />
        ) : (
          <video src={uploaded.previewUrl} className="w-full aspect-video object-cover" controls />
        )}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <span className="flex items-center gap-1 bg-black/70 text-xs text-green-400 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Uploaded
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="bg-black/70 hover:bg-red-500/80 text-white rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5">
          <p className="text-xs text-white/70 truncate">{uploaded.name}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
        dragging ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/50 hover:bg-white/[0.02]"
      } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
              <p className="text-xs text-muted-foreground">{accept.replace("image/*,", "PNG, JPG, WEBP").replace("video/*", "MP4, WEBM")}</p>
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

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
    tags: "",
  });
  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(null);
  const [videoPreview, setVideoPreview] = useState<UploadedFile | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (
    file: File,
    allowedTypes: string[],
    setUploading: (v: boolean) => void,
    setUploaded: (f: UploadedFile | null) => void,
    type: "image" | "video",
  ) => {
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}`);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum 100 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl(file);
      await uploadToGcs(file, uploadURL);
      const previewUrl = URL.createObjectURL(file);
      setUploaded({ objectPath, previewUrl, name: file.name, type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!isCreator) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔐</p>
          <h2 className="text-2xl font-bold mb-4">Creator account required</h2>
          <p className="text-muted-foreground mb-6">You need a creator account to upload work.</p>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!thumbnail) {
      setError("Please upload a thumbnail image for your work.");
      return;
    }
    const tagsString = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean).join(",") : undefined;
    const imageServingPath = `/api/storage${thumbnail.objectPath}`;
    const videoServingPath = videoPreview ? `/api/storage${videoPreview.objectPath}` : undefined;

    createSample.mutate({
      data: {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        gameType: form.gameType || undefined,
        budget: form.budget ? parseInt(form.budget, 10) : undefined,
        previewImageUrl: imageServingPath,
        previewVideoUrl: videoServingPath,
        tags: tagsString,
      }
    }, {
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => setLocation("/dashboard"), 2500);
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
          <p className="text-muted-foreground">Your work will be reviewed and published shortly.</p>
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-black">Submit Your Work</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Upload real files from your device. Your submission will be reviewed before going live.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thumbnail Upload */}
            <div>
              <Label className="mb-2 block">
                Thumbnail / Preview Image <span className="text-destructive">*</span>
              </Label>
              <FileDropZone
                accept="image/png,image/jpeg,image/webp,image/gif"
                label="Upload Thumbnail"
                icon={Image}
                onUpload={(f) => handleFileUpload(f, ALLOWED_IMAGE_TYPES, setUploadingThumbnail, setThumbnail, "image")}
                uploaded={thumbnail}
                onRemove={() => setThumbnail(null)}
                isUploading={uploadingThumbnail}
              />
              <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, WEBP · Max 100 MB</p>
            </div>

            {/* Video Upload */}
            <div>
              <Label className="mb-2 block">Video Preview <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <FileDropZone
                accept="video/mp4,video/webm"
                label="Upload Video Preview"
                icon={Video}
                onUpload={(f) => handleFileUpload(f, ALLOWED_VIDEO_TYPES, setUploadingVideo, setVideoPreview, "video")}
                uploaded={videoPreview}
                onRemove={() => setVideoPreview(null)}
                isUploading={uploadingVideo}
              />
              <p className="text-xs text-muted-foreground mt-1.5">MP4, WEBM · Max 100 MB</p>
            </div>

            <hr className="border-white/10" />

            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => update("title", e.target.value)}
                placeholder="Epic Minecraft Thumbnail Pack"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => update("description", e.target.value)}
                placeholder="Describe your work, what's included, turnaround time…"
                className="mt-1.5"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category <span className="text-destructive">*</span></Label>
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
              <Input
                id="budget"
                type="number"
                min="0"
                value={form.budget}
                onChange={e => update("budget", e.target.value)}
                placeholder="e.g. 150"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={e => update("tags", e.target.value)}
                placeholder="minecraft, thumbnail, neon"
                className="mt-1.5"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                disabled={createSample.isPending || uploadingThumbnail || uploadingVideo || !form.title || !form.category}
              >
                {createSample.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                ) : (
                  "Submit for Review"
                )}
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
