import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useGetSample, useToggleLike, useToggleFavorite, useGetComments, useAddComment, useDeleteComment } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";

function getToken() { return localStorage.getItem("auth_token"); }

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers } });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return undefined as T;
  return r.json();
}

interface Review { id: number; sampleId: number; userId: number; rating: number; content: string | null; username: string | null; avatarUrl: string | null; createdAt: string; }
interface ReviewsResponse { reviews: Review[]; average: number | null; total: number; }

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-xl transition-colors ${readonly ? "cursor-default" : "cursor-pointer"} ${(hovered || value) >= star ? "text-yellow-400" : "text-white/20"}`}
        >★</button>
      ))}
    </div>
  );
}

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const sampleId = parseInt(id, 10);
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "reviews">("comments");

  // Delete sample state
  const [showDeleteSample, setShowDeleteSample] = useState(false);
  const [deletingSample, setDeletingSample] = useState(false);
  const [sampleDeleteError, setSampleDeleteError] = useState<string | null>(null);

  // Delete comment state
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<number | null>(null);

  const { data: sample, isLoading } = useGetSample(sampleId);
  const { data: comments, refetch: refetchComments } = useGetComments({ id: sampleId });
  const toggleLike = useToggleLike();
  const toggleFavorite = useToggleFavorite();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  useEffect(() => {
    if (!isNaN(sampleId)) {
      api<ReviewsResponse>(`/api/samples/${sampleId}/reviews`).then(setReviewsData).catch(() => {});
    }
  }, [sampleId]);

  const handleLike = () => {
    if (!isLoggedIn) return;
    toggleLike.mutate({ id: sampleId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getSample"] }) });
  };

  const handleFavorite = () => {
    if (!isLoggedIn) return;
    toggleFavorite.mutate({ id: sampleId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getSample"] }) });
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ id: sampleId, data: { content: commentText } }, {
      onSuccess: () => { setCommentText(""); queryClient.invalidateQueries({ queryKey: ["getComments"] }); },
    });
  };

  const handleEditComment = async (commentId: number) => {
    if (!editText.trim()) return;
    try {
      await api(`/api/comments/${commentId}`, { method: "PATCH", body: JSON.stringify({ content: editText.trim() }) });
      queryClient.invalidateQueries({ queryKey: ["getComments"] });
      setEditingCommentId(null);
      setEditText("");
    } catch { }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      await api(`/api/samples/${sampleId}/reviews`, { method: "POST", body: JSON.stringify({ rating: reviewRating, content: reviewText.trim() || undefined }) });
      const updated = await api<ReviewsResponse>(`/api/samples/${sampleId}/reviews`);
      setReviewsData(updated);
      setReviewRating(0);
      setReviewText("");
    } catch { } finally { setSubmittingReview(false); }
  };

  const handleDeleteReview = async () => {
    try {
      await api(`/api/samples/${sampleId}/reviews`, { method: "DELETE" });
      const updated = await api<ReviewsResponse>(`/api/samples/${sampleId}/reviews`);
      setReviewsData(updated);
    } catch { }
  };

  const handleDeleteSample = async () => {
    setDeletingSample(true);
    setSampleDeleteError(null);
    try {
      await api(`/api/samples/${sampleId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["getSamples"] });
      setLocation("/dashboard");
    } catch (err) {
      setSampleDeleteError(err instanceof Error ? err.message : "Failed to delete sample.");
      setDeletingSample(false);
      setShowDeleteSample(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    deleteComment.mutate(
      { id: commentId },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["getComments"] }); setDeleteCommentTarget(null); } }
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <Skeleton className="aspect-video w-full rounded-2xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!sample) {
    return (
      <MainLayout>
        <div className="text-center py-32">
          <p className="text-7xl mb-6">🎮</p>
          <h2 className="text-3xl font-black mb-3">Sample Not Found</h2>
          <p className="text-muted-foreground mb-8">This sample doesn't exist or may have been removed.</p>
          <Link href="/browse">
            <Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">Browse All Samples</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Determine ownership: check if current user is the creator
  // sample.creatorId is the creator_profile id; we need to check ownership differently
  // The sample has creatorId (creator_profile id). We need to check if user's creator profile id matches.
  // We'll use a flag: if user is admin OR if they uploaded it (backend will reject if not owner)
  const isOwner = isAdmin; // Will be extended once we have creatorProfileId on user

  const myReview = reviewsData?.reviews.find(r => r.userId === user?.id);
  const tags = sample.tags ? String(sample.tags).split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <MainLayout>
      {/* Delete Sample Dialog */}
      <ConfirmDialog
        isOpen={showDeleteSample}
        title="Delete Sample"
        message={`Permanently delete "${sample.title}"? This will remove it from the database and delete all associated files. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteSample}
        onCancel={() => setShowDeleteSample(false)}
        loading={deletingSample}
      />

      {/* Delete Comment Dialog */}
      <ConfirmDialog
        isOpen={deleteCommentTarget !== null}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => deleteCommentTarget !== null && handleDeleteComment(deleteCommentTarget)}
        onCancel={() => setDeleteCommentTarget(null)}
        loading={deleteComment.isPending}
      />

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {sampleDeleteError && (
          <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
            <span>❌ {sampleDeleteError}</span>
            <button onClick={() => setSampleDeleteError(null)} className="ml-3 font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── LEFT: Main Content ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Media Preview */}
            <div className="rounded-2xl overflow-hidden bg-card border border-white/10 shadow-[0_0_40px_-15px_hsl(var(--primary)/0.3)]">
              {sample.previewVideoUrl ? (
                <video src={sample.previewVideoUrl} controls className="w-full aspect-video bg-black" />
              ) : sample.previewImageUrl ? (
                <img src={sample.previewImageUrl} alt={sample.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 to-background">
                  <span className="text-7xl mb-3">🎮</span>
                  <span className="text-sm">No preview available</span>
                </div>
              )}
            </div>

            {/* Title + Actions */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="secondary" className="capitalize">{sample.category?.replace(/-/g, " ")}</Badge>
                    {sample.gameType && <Badge variant="outline">{sample.gameType}</Badge>}
                    {reviewsData && reviewsData.total > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 px-2 py-1 rounded-full bg-yellow-400/10">
                        ★ {reviewsData.average} <span className="text-muted-foreground font-normal">({reviewsData.total})</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-black leading-tight">{sample.title}</h1>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button
                    onClick={handleLike}
                    disabled={!isLoggedIn}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${sample.isLiked ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]" : "border-white/10 hover:border-red-500/30 hover:text-red-400"} disabled:opacity-40`}
                  >
                    ❤️ {sample.likeCount ?? 0}
                  </button>
                  <button
                    onClick={handleFavorite}
                    disabled={!isLoggedIn}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${sample.isFavorited ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 hover:border-primary/30 hover:text-primary"} disabled:opacity-40`}
                  >
                    {sample.isFavorited ? "★ Saved" : "☆ Save"}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowDeleteSample(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 text-destructive"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Creator mini-card */}
              <Link href={`/creator/${sample.creatorId}`} className="group inline-flex items-center gap-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                  {sample.creatorAvatarUrl ? <img src={sample.creatorAvatarUrl} alt="" className="w-full h-full object-cover" /> : (sample.creatorName?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Created by</span>
                  <p className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {sample.creatorName}
                    {sample.creatorVerified && <span className="text-xs text-primary">✓</span>}
                  </p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground group-hover:text-primary transition-colors">View Profile →</span>
              </Link>
            </div>

            {/* Description */}
            {sample.description && (
              <div className="rounded-2xl border border-white/10 bg-card p-6">
                <h3 className="font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Description</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{sample.description}</p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">#{tag}</span>
                ))}
              </div>
            )}

            {/* Tabs: Comments / Reviews */}
            <div>
              <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "comments" ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  💬 Comments ({comments?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "reviews" ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary))]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  ★ Reviews ({reviewsData?.total ?? 0})
                </button>
              </div>

              {/* Comments Tab */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {isLoggedIn && (
                    <form onSubmit={handleComment} className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
                      <Textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Leave a comment..."
                        rows={3}
                        className="bg-transparent border-white/10 resize-none"
                      />
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={addComment.isPending || !commentText.trim()}>
                          {addComment.isPending ? "Posting…" : "Post Comment"}
                        </Button>
                      </div>
                    </form>
                  )}
                  {!isLoggedIn && (
                    <div className="text-center py-6 rounded-2xl border border-white/10 bg-card">
                      <p className="text-muted-foreground text-sm mb-3">Sign in to leave a comment</p>
                      <Link href="/login"><Button size="sm" variant="outline">Sign In</Button></Link>
                    </div>
                  )}
                  {comments?.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No comments yet. Be the first!</p>}
                  {comments?.map(comment => (
                    <div key={comment.id} className="flex gap-3 p-4 rounded-xl bg-card border border-white/5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {(comment.username ?? "?")?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{comment.username ?? "User"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt!).toLocaleDateString()}</span>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 mt-1">
                            <textarea
                              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-primary/50 text-foreground"
                              rows={2}
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                onClick={() => handleEditComment(comment.id!)}
                              >Save</button>
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => { setEditingCommentId(null); setEditText(""); }}
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                        )}
                      </div>
                      {/* Show edit/delete for own comments, delete-only for admin */}
                      {user && editingCommentId !== comment.id && (comment.userId === user.id || isAdmin) && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {comment.userId === user.id && (
                            <button
                              className="text-muted-foreground hover:text-primary transition-colors text-xs"
                              onClick={() => { setEditingCommentId(comment.id!); setEditText(comment.content ?? ""); }}
                            >Edit</button>
                          )}
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors text-xs font-semibold"
                            onClick={() => setDeleteCommentTarget(comment.id!)}
                          >Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  {/* Average rating summary */}
                  {reviewsData && reviewsData.total > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-card p-6 flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-5xl font-black text-yellow-400">{reviewsData.average}</p>
                        <StarRating value={Math.round(reviewsData.average ?? 0)} readonly />
                        <p className="text-xs text-muted-foreground mt-1">{reviewsData.total} review{reviewsData.total !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(star => {
                          const count = reviewsData.reviews.filter(r => r.rating === star).length;
                          const pct = reviewsData.total ? Math.round(count / reviewsData.total * 100) : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="text-yellow-400 w-4">{star}★</span>
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-muted-foreground w-6">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Write review */}
                  {isLoggedIn && (
                    <form onSubmit={handleReview} className="rounded-2xl border border-white/10 bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{myReview ? "Update your review" : "Write a review"}</span>
                        {myReview && (
                          <button type="button" onClick={handleDeleteReview} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Delete review</button>
                        )}
                      </div>
                      <StarRating value={reviewRating || myReview?.rating || 0} onChange={setReviewRating} />
                      <Textarea
                        value={reviewText || (myReview?.content ?? "")}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Share your experience (optional)..."
                        rows={3}
                        className="bg-transparent border-white/10 resize-none"
                      />
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={submittingReview || !reviewRating}>
                          {submittingReview ? "Saving…" : myReview ? "Update Review" : "Submit Review"}
                        </Button>
                      </div>
                    </form>
                  )}
                  {!isLoggedIn && (
                    <div className="text-center py-6 rounded-2xl border border-white/10 bg-card">
                      <p className="text-muted-foreground text-sm mb-3">Sign in to leave a review</p>
                      <Link href="/login"><Button size="sm" variant="outline">Sign In</Button></Link>
                    </div>
                  )}

                  {reviewsData?.reviews.length === 0 && (
                    <p className="text-center text-muted-foreground py-10 text-sm">No reviews yet. Be the first to review!</p>
                  )}
                  {reviewsData?.reviews.map(review => (
                    <div key={review.id} className="flex gap-3 p-4 rounded-xl bg-card border border-white/5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {(review.username ?? "?")?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{review.username ?? "User"}</span>
                          <StarRating value={review.rating} readonly />
                          <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        {review.content && <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>}
                      </div>
                      {/* Admin can delete any review */}
                      {isAdmin && (
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors text-xs font-semibold flex-shrink-0"
                          onClick={async () => {
                            if (!window.confirm("Delete this review?")) return;
                            try {
                              await api(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
                              const updated = await api<ReviewsResponse>(`/api/samples/${sampleId}/reviews`);
                              setReviewsData(updated);
                            } catch { }
                          }}
                        >Delete</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Sidebar ──────────────────────────────────── */}
          <div className="space-y-5">

            {/* Owner delete button (creator dashboard link) */}
            {isLoggedIn && !isAdmin && (
              <div className="rounded-2xl border border-white/10 bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">Manage your content</p>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="w-full">Go to Dashboard</Button>
                </Link>
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="text-xs text-destructive font-bold uppercase tracking-wider mb-3">Admin Controls</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowDeleteSample(true)}
                >
                  🗑 Delete This Sample
                </Button>
                <Link href="/admin/samples">
                  <Button variant="outline" size="sm" className="w-full mt-1">Back to Admin</Button>
                </Link>
              </div>
            )}

            {/* Pricing CTA */}
            {sample.budget != null ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center shadow-[0_0_40px_-10px_hsl(var(--primary))]">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Starting from</p>
                <p className="text-5xl font-black text-primary mb-1">₹{sample.budget}</p>
                <p className="text-xs text-muted-foreground mb-5">Contact creator for exact pricing</p>
                <Link href={`/creator/${sample.creatorId}`}>
                  <Button className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]">💼 Hire Creator</Button>
                </Link>
                {sample.creatorName && (
                  <p className="text-xs text-muted-foreground mt-3">by <span className="text-primary">{sample.creatorName}</span></p>
                )}
              </div>
            ) : (
              <Link href={`/creator/${sample.creatorId}`}>
                <Button className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]">View Creator Profile</Button>
              </Link>
            )}

            {/* Creator Card */}
            <Link href={`/creator/${sample.creatorId}`} className="group block rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/40 transition-all hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold text-white flex-shrink-0 overflow-hidden">
                  {sample.creatorAvatarUrl ? <img src={sample.creatorAvatarUrl} alt="" className="w-full h-full object-cover" /> : (sample.creatorName?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold group-hover:text-primary transition-colors">{sample.creatorName}</p>
                    {sample.creatorVerified && <span className="text-xs text-primary">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Creator</p>
                </div>
              </div>
              <p className="text-xs text-primary font-semibold">View full profile →</p>
            </Link>

            {/* Meta Info */}
            <div className="rounded-2xl border border-white/10 bg-card p-5 space-y-3 text-sm">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Details</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold capitalize">{sample.category?.replace(/-/g, " ")}</span>
              </div>
              {sample.gameType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <span className="font-semibold">{sample.gameType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">❤️ Likes</span>
                <span className="font-semibold">{sample.likeCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">💬 Comments</span>
                <span className="font-semibold">{sample.commentCount ?? 0}</span>
              </div>
              {reviewsData && reviewsData.total > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">★ Rating</span>
                  <span className="font-semibold text-yellow-400">{reviewsData.average} / 5</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published</span>
                <span className="font-semibold">{sample.createdAt ? new Date(sample.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
              </div>
            </div>

            {/* Download File */}
            {(sample as typeof sample & { fileUrl?: string | null }).fileUrl && (
              <a
                href={(sample as typeof sample & { fileUrl?: string | null }).fileUrl!}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/20 transition-all font-semibold text-sm"
              >
                ⬇️ Download File
              </a>
            )}

            {/* Share */}
            <div className="flex gap-2">
              <button
                onClick={() => navigator.share?.({ title: sample.title, url: window.location.href }).catch(() => navigator.clipboard?.writeText(window.location.href))}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all font-semibold"
              >
                🔗 Share
              </button>
              <button className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-all font-semibold">
                🚩 Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
