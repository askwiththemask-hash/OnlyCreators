import { useState } from "react";
import { Link, useParams } from "wouter";
import { useGetSample, useToggleLike, useToggleFavorite, useGetComments, useAddComment, useDeleteComment } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const sampleId = parseInt(id, 10);
  const { user, isLoggedIn } = useAuth();
  const [commentText, setCommentText] = useState("");

  const { data: sample, isLoading } = useGetSample({ id: sampleId });
  const { data: comments } = useGetComments({ id: sampleId });
  const toggleLike = useToggleLike();
  const toggleFavorite = useToggleFavorite();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const handleLike = () => {
    if (!isLoggedIn) return;
    toggleLike.mutate({ id: sampleId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getSample"] }),
    });
  };

  const handleFavorite = () => {
    if (!isLoggedIn) return;
    toggleFavorite.mutate({ id: sampleId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getSample"] }),
    });
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ id: sampleId, data: { content: commentText } }, {
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({ queryKey: ["getComments"] });
      },
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <Skeleton className="aspect-video w-full rounded-2xl mb-6" />
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </MainLayout>
    );
  }

  if (!sample) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎮</p>
          <h2 className="text-2xl font-bold">Sample not found</h2>
          <Link href="/browse" className="text-primary mt-4 inline-block hover:underline">Back to Browse</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Preview */}
            <div className="rounded-2xl overflow-hidden bg-card border border-white/10 mb-6">
              {sample.previewVideoUrl ? (
                <video src={sample.previewVideoUrl} controls className="w-full aspect-video" />
              ) : sample.previewImageUrl ? (
                <img src={sample.previewImageUrl} alt={sample.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="aspect-video flex items-center justify-center text-6xl bg-muted">🎮</div>
              )}
            </div>

            {/* Title & actions */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-black">{sample.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{sample.category}</Badge>
                  {sample.gameType && <Badge variant="outline">{sample.gameType}</Badge>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant={sample.isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  className={sample.isLiked ? "bg-red-500 hover:bg-red-600 border-0" : "border-white/10"}
                  disabled={!isLoggedIn}
                >
                  ❤️ {sample.likeCount ?? 0}
                </Button>
                <Button
                  variant={sample.isFavorited ? "default" : "outline"}
                  size="sm"
                  onClick={handleFavorite}
                  className={sample.isFavorited ? "" : "border-white/10"}
                  disabled={!isLoggedIn}
                >
                  {sample.isFavorited ? "★ Saved" : "☆ Save"}
                </Button>
              </div>
            </div>

            {sample.description && (
              <p className="text-muted-foreground leading-relaxed mb-8">{sample.description}</p>
            )}

            {sample.tags && (
              <div className="flex flex-wrap gap-2 mb-8">
                {String(sample.tags).split(",").map(t => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-muted-foreground">#{tag}</span>
                ))}
              </div>
            )}

            {/* Comments */}
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-6">Comments ({comments?.length ?? 0})</h3>

              {isLoggedIn && (
                <form onSubmit={handleComment} className="mb-6">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Leave a comment..."
                    className="mb-3"
                    rows={3}
                  />
                  <Button type="submit" size="sm" disabled={addComment.isPending || !commentText.trim()}>
                    {addComment.isPending ? "Posting…" : "Post Comment"}
                  </Button>
                </form>
              )}

              <div className="space-y-4">
                {comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-xl bg-card border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {(comment.username ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{comment.username ?? "User"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(comment.createdAt!).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                    {user && comment.userId === user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteComment.mutate({ id: comment.id! }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getComments"] }) })}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                {!comments?.length && (
                  <p className="text-muted-foreground text-sm text-center py-8">No comments yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Creator card */}
            <div className="rounded-2xl border border-white/10 bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold text-white">
                  {(sample.creatorName ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{sample.creatorName}</p>
                    {sample.creatorVerified && <span className="text-xs text-primary">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Creator</p>
                </div>
              </div>
              <Link href={`/creator/${sample.creatorId}`}>
                <Button className="w-full" variant="outline">View Profile</Button>
              </Link>
            </div>

            {/* Pricing */}
            {sample.budget != null && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center shadow-[0_0_30px_-10px_hsl(var(--primary))]">
                <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                <p className="text-4xl font-black text-primary">₹{sample.budget}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Contact creator for exact pricing</p>
                <Link href={`/creator/${sample.creatorId}`}>
                  <Button className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]">Hire Creator</Button>
                </Link>
              </div>
            )}

            {/* Meta info */}
            <div className="rounded-2xl border border-white/10 bg-card p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold">{sample.category}</span>
              </div>
              {sample.gameType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game</span>
                  <span className="font-semibold">{sample.gameType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Likes</span>
                <span className="font-semibold">❤️ {sample.likeCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comments</span>
                <span className="font-semibold">💬 {sample.commentCount ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posted</span>
                <span className="font-semibold">{sample.createdAt ? new Date(sample.createdAt).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
