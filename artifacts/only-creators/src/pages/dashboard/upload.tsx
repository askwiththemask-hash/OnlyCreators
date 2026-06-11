import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useGetCategories } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Upload, X, Image, Video, File, CheckCircle2, Loader2 } from "lucide-react";

const GAME_TYPES = ["Minecraft", "Roblox", "BGMI", "Free Fire", "GTA V", "Fortnite", "Valorant", "General"];

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_FILE_TYPES = [
  "application/zip", "application/x-zip-compressed", "application/x-zip",
  "application/java-archive", "application/x-java-archive",
  "application/octet-stream",
];

interface UploadedFile {
  objectPath: string;
  previewUrl: string;
  name: string;
  type: "image" | "video";
}

interface UploadedGenericFile {
  objectPath: string;
  name: string;
  size: number;
}

interface CategoryConfig {
  hasVideo: boolean;
  videoRequired: boolean;
  videoLabel: string;
  hasFile: boolean;
  fileRequired: boolean;
  fileAccept: string;
  fileLabel: string;
  fileHint: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "thumbnail-designing": {
    hasVideo: false, videoRequired: false, videoLabel: "",
    hasFile: false, fileRequired: false, fileAccept: "", fileLabel: "", fileHint: "",
  },
  "video-editing": {
    hasVideo: true, videoRequired: true, videoLabel: "Video Sample (required)",
    hasFile: false, fileRequired: false, fileAccept: "", fileLabel: "", fileHint: "",
  },
  "mod-developer": {
    hasVideo: false, videoRequired: false, videoLabel: "",
    hasFile: true, fileRequired: true,
    fileAccept: ".zip,.jar",
    fileLabel: "Mod File (ZIP or JAR) — required",
    fileHint: "ZIP, JAR · Max 100 MB",
  },
  "plugin-development": {
    hasVideo: false, videoRequired: false, videoLabel: "",
    hasFile: true, fileRequired: true,
    fileAccept: ".zip,.jar",
    fileLabel: "Plugin File (ZIP or JAR) — required",
    fileHint: "ZIP, JAR · Max 100 MB",
  },
  "minecraft-builds": {
    hasVideo: false, videoRequired: false, videoLabel: "",
    hasFile: true, fileRequired: true,
    fileAccept: ".zip,.mcworld",
    fileLabel: "World File (ZIP or .mcworld) — required",
    fileHint: "ZIP, MCWORLD · Max 100 MB",
  },
};

function getConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] ?? {
    hasVideo: true, videoRequired: false, videoLabel: "Video Preview (optional)",
    hasFile: false, fileRequired: false, fileAccept: "", fileLabel: "", fileHint: "",
  };
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
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
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
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error("Failed to upload file to storage");
}

function MediaDropZone({
  accept, label, icon: Icon, onUpload, uploaded, onRemove, isUploading,
}: {
  accept: string; label: string; icon: typeof Image;
  onUpload: (file: File) => void; uploaded: UploadedFile | null;
  onRemove: () => void; isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

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
          <button type="button" onClick={onRemove} className="bg-black/70 hover:bg-red-500/80 text-white rounded-full p-1 transition-colors">
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
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/50 hover:bg-white/[0.02]"} ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
        {isUploading ? (
          <><Loader2 className="w-8 h-8 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Uploading…</p></>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
            </div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}

function FileDropZone({
  accept, label, hint, onUpload, uploaded, onRemove, isUploading,
}: {
  accept: string; label: string; hint: string;
  onUpload: (file: File) => void; uploaded: UploadedGenericFile | null;
  onRemove: () => void; isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  if (uploaded) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <File className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{uploaded.name}</p>
          <p className="text-xs text-muted-foreground">{(uploaded.size / 1024 / 1024).toFixed(2)} MB · Uploaded</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/50 hover:bg-white/[0.02]"} ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center py-6 px-4 gap-3">
        {isUploading ? (
          <><Loader2 className="w-8 h-8 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Uploading…</p></>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <File className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}

export default function DashboardUpload() {
  const [, setLocation] = useLocation();
  const { isCreator } = useAuth();
  const { data: categories } = useGetCategories();

  const [form, setForm] = useState({ title: "", description: "", category: "", gameType: "", budget: "", tags: "" });
  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(null);
  const [videoPreview, setVideoPreview] = useState<UploadedFile | null>(null);
  const [downloadFile, setDownloadFile] = useState<UploadedGenericFile | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const config = getConfig(form.category);

  const handleMediaUpload = async (
    file: File,
    allowedTypes: string[],
    setUploading: (v: boolean) => void,
    setUploaded: (f: UploadedFile | null) => void,
    type: "image" | "video",
  ) => {
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.map(t => t.split("/")[1]).join(", ").toUpperCase()}`);
      return;
    }
    if (file.size > 100 * 1024 * 1024) { setError("File too large. Maximum 100 MB."); return; }
    setError("");
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl(file);
      await uploadToGcs(file, uploadURL);
      setUploaded({ objectPath, previewUrl: URL.createObjectURL(file), name: file.name, type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { setError("File too large. Maximum 100 MB."); return; }
    setError("");
    setUploadingFile(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl(file);
      await uploadToGcs(file, uploadURL);
      setDownloadFile({ objectPath, name: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!thumbnail) { setError("Please upload a preview image for your work."); return; }
    if (config.videoRequired && !videoPreview) { setError("A video sample is required for this category."); return; }
    if (config.fileRequired && !downloadFile) { setError("A downloadable file is required for this category."); return; }

    setSubmitting(true);
    try {
      const token = getToken();
      const body = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        gameType: form.gameType || undefined,
        budget: form.budget ? parseInt(form.budget, 10) : undefined,
        previewImageUrl: `/api/storage${thumbnail.objectPath}`,
        previewVideoUrl: videoPreview ? `/api/storage${videoPreview.objectPath}` : undefined,
        fileUrl: downloadFile ? `/api/storage${downloadFile.objectPath}` : undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean).join(",") : undefined,
      };

      const res = await fetch("/api/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to upload");
      }

      setSuccess(true);
      setTimeout(() => setLocation("/dashboard"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
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

  if (success) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Work Submitted!</h2>
          <p className="text-muted-foreground">Your work is now live on the marketplace.</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard…</p>
        </div>
      </MainLayout>
    );
  }

  const isUploading = uploadingThumbnail || uploadingVideo || uploadingFile;
  const canSubmit = form.title && form.category && thumbnail && !isUploading && !submitting
    && (!config.videoRequired || videoPreview)
    && (!config.fileRequired || downloadFile);

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
            Upload real files. Select a category first — it determines which files you need.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category selector first — drives the upload fields */}
            <div>
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={v => { update("category", v); setVideoPreview(null); setDownloadFile(null); }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category first" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category-specific upload fields */}
            {form.category && (
              <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {form.category === "thumbnail-designing" && "📸 Image Upload Only"}
                  {form.category === "video-editing" && "🎬 Image Thumbnail + Video Sample Required"}
                  {(form.category === "mod-developer" || form.category === "plugin-development") && "📦 Image Preview + Mod/Plugin File Required"}
                  {form.category === "minecraft-builds" && "🏰 Screenshot + World File Required"}
                  {!["thumbnail-designing","video-editing","mod-developer","plugin-development","minecraft-builds"].includes(form.category) && "🖼️ Image Required · Video Optional"}
                </p>

                {/* Preview Image — always required */}
                <div>
                  <Label className="mb-2 block">
                    {form.category === "video-editing" ? "Thumbnail Image" : "Preview Image"} <span className="text-destructive">*</span>
                  </Label>
                  <MediaDropZone
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    label="Upload Image"
                    icon={Image}
                    onUpload={(f) => handleMediaUpload(f, ALLOWED_IMAGE_TYPES, setUploadingThumbnail, setThumbnail, "image")}
                    uploaded={thumbnail}
                    onRemove={() => setThumbnail(null)}
                    isUploading={uploadingThumbnail}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, WEBP · Max 100 MB</p>
                </div>

                {/* Video field — video-editing required; others optional */}
                {config.hasVideo && (
                  <div>
                    <Label className="mb-2 block">
                      {config.videoLabel} {config.videoRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <MediaDropZone
                      accept="video/mp4,video/webm"
                      label="Upload Video"
                      icon={Video}
                      onUpload={(f) => handleMediaUpload(f, ALLOWED_VIDEO_TYPES, setUploadingVideo, setVideoPreview, "video")}
                      uploaded={videoPreview}
                      onRemove={() => setVideoPreview(null)}
                      isUploading={uploadingVideo}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">MP4, WEBM · Max 100 MB</p>
                  </div>
                )}

                {/* Generic file upload (ZIP/JAR/world) */}
                {config.hasFile && (
                  <div>
                    <Label className="mb-2 block">
                      {config.fileLabel} {config.fileRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <FileDropZone
                      accept={config.fileAccept}
                      label={config.fileLabel.replace(" — required", "")}
                      hint={config.fileHint}
                      onUpload={handleFileUpload}
                      uploaded={downloadFile}
                      onRemove={() => setDownloadFile(null)}
                      isUploading={uploadingFile}
                    />
                  </div>
                )}
              </div>
            )}

            <hr className="border-white/10" />

            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={form.title} onChange={e => update("title", e.target.value)} placeholder="Epic Minecraft Thumbnail Pack" className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe your work, what's included, turnaround time…" className="mt-1.5" rows={4} />
            </div>

            <div>
              <Label>Game Type</Label>
              <Select value={form.gameType} onValueChange={v => update("gameType", v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select game (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {GAME_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget">Starting Price (₹)</Label>
              <Input id="budget" type="number" min="0" value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="e.g. 150" className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
              <Input id="tags" value={form.tags} onChange={e => update("tags", e.target.value)} placeholder="minecraft, thumbnail, neon" className="mt-1.5" />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 shadow-[0_0_20px_-5px_hsl(var(--primary))]" disabled={!canSubmit}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Work"}
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
