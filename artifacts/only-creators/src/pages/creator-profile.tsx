import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useGetCreatorById, useGetSamples, useToggleFollow } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, UserMinus, Mail } from "lucide-react";

function getToken() { return localStorage.getItem("auth_token"); }
async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

interface ReviewsData { reviews: { rating: number }[]; average: number | null; total: number; }

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="flex">
      {[1,2,3,4,5].map(s => <span key={s} className={`text-sm ${s <= value ? "text-yellow-400" : "text-white/20"}`}>★</span>)}
    </span>
  );
}

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const creatorId = parseInt(id, 10);
  const { user, isLoggedIn } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);
  const [allReviews, setAllReviews] = useState<ReviewsData[]>([]);

  const { data: creator, isLoading } = useGetCreatorById(creatorId);
  const { data: samples } = useGetSamples({ creatorId: creatorId });
  const toggleFollow = useToggleFollow();

  // Sync follower state from loaded creator
  useEffect(() => {
    if (creator) {
      setFollowerCount(creator.followerCount ?? 0);
    }
  }, [creator]);

  // Sync is-following state
  useEffect(() => {
    if (!isLoggedIn || !creator) return;
    // We know this user is following if the creator data includes it — check via API if needed
    // For now we'll track it via the toggle result
  }, [isLoggedIn, creator]);

  // Load reviews for all samples
  useEffect(() => {
    if (!samples?.length) return;
    Promise.all(samples.map(s => api<ReviewsData>(`/api/samples/${s.id}/reviews`).catch(() => ({ reviews: [], average: null, total: 0 }))))
      .then(setAllReviews);
  }, [samples]);

  const handleFollow = async () => {
    if (!isLoggedIn || toggling) return;
    setToggling(true);
    try {
      const result = await api<{ following: boolean; followerCount: number }>(`/api/creators/${creatorId}/follow`, { method: "POST" });
      setFollowing(result.following);
      setFollowerCount(result.followerCount);
      queryClient.invalidateQueries({ queryKey: ["getCreatorById"] });
    } catch { } finally { setToggling(false); }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-6">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!creator) {
    return (
      <MainLayout>
        <div className="text-center py-32">
          <p className="text-7xl mb-6">👤</p>
          <h2 className="text-3xl font-black mb-3">Creator Not Found</h2>
          <p className="text-muted-foreground mb-8">This profile doesn't exist or may have been removed.</p>
          <Link href="/browse"><Button>Browse Creators</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const isFollowing = following ?? false;
  const displayFollowers = followerCount ?? creator.followerCount ?? 0;
  const isOwnProfile = user?.id && creator;

  // Aggregate rating across all samples
  const allRatings = allReviews.flatMap(r => r.reviews.map(rev => rev.rating));
  const avgRating = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : null;
  const totalReviews = allReviews.reduce((a, r) => a + r.total, 0);

  const badgeLabel = creator.verificationStatus === "premium" ? "⭐ PRO" : creator.verificationStatus === "verified" ? "✓ Verified" : null;

  return (
    <MainLayout>
      {/* Hero Banner */}
      <div className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/25 via-background to-background" />
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

        <div className="container relative z-10 mx-auto px-4 py-14 max-w-5xl">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl font-black text-white overflow-hidden shadow-[0_0_50px_-5px_hsl(var(--primary)/0.6)] border-2 border-primary/30">
                {creator.avatarUrl
                  ? <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" />
                  : creator.displayName[0].toUpperCase()
                }
              </div>
              {badgeLabel && (
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">{badgeLabel}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-3xl md:text-4xl font-black">{creator.displayName}</h1>
                {creator.level && creator.level !== "Newcomer" && <Badge variant="secondary">{creator.level}</Badge>}
              </div>
              <p className="text-muted-foreground mb-1">@{creator.username}</p>
              {creator.servicesOffered && (
                <p className="text-sm text-primary/80 font-medium">{creator.servicesOffered}</p>
              )}
              {avgRating && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-yellow-400 font-bold">{avgRating}★</span>
                  <span className="text-xs text-muted-foreground">({totalReviews} reviews)</span>
                </div>
              )}
            </div>

            {/* Follow / Message buttons */}
            <div className="flex gap-3 flex-shrink-0">
              {creator.gmailAddress && (
                <a href={`mailto:${creator.gmailAddress}`}>
                  <Button variant="outline" className="border-white/10 gap-2"><Mail className="w-4 h-4" /> Message</Button>
                </a>
              )}
              <Button
                onClick={handleFollow}
                disabled={!isLoggedIn || toggling}
                className={`gap-2 ${isFollowing ? "bg-white/10 hover:bg-destructive/10 hover:text-destructive border border-white/20 hover:border-destructive/40 text-foreground" : "shadow-[0_0_20px_-5px_hsl(var(--primary))]"}`}
              >
                {isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                <span className="text-xs opacity-70 ml-1">• {displayFollowers}</span>
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-10">
            {[
              { label: "Works", value: creator.totalSamples ?? 0 },
              { label: "Likes", value: creator.totalLikes ?? 0 },
              { label: "Followers", value: displayFollowers },
              { label: "Experience", value: creator.experienceLevel ?? "—" },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Works Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Works ({samples?.length ?? 0})</h2>
            {!samples?.length ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border border-white/5 bg-card">
                <p className="text-4xl mb-3">📁</p>
                <p className="font-semibold">No samples yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {samples.map((sample, i) => {
                  const sampleReview = allReviews[i];
                  return (
                    <Link key={sample.id} href={`/sample/${sample.id}`} className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/40 transition-all hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)]">
                      <div className="aspect-video bg-muted overflow-hidden relative">
                        {sample.previewImageUrl ? (
                          <img src={sample.previewImageUrl} alt={sample.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/10 to-background">🎮</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold truncate group-hover:text-primary transition-colors mb-1">{sample.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>❤️ {sample.likeCount ?? 0}</span>
                            {sampleReview?.average && <span className="text-yellow-400">★ {sampleReview.average}</span>}
                          </div>
                          {sample.budget != null && <span className="font-bold text-primary text-sm">₹{sample.budget}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* About */}
            {creator.bio && (
              <div className="rounded-2xl border border-white/10 bg-card p-5">
                <h3 className="font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wider">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
              </div>
            )}

            {/* Social Links */}
            <div className="rounded-2xl border border-white/10 bg-card p-5">
              <h3 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Contact</h3>
              <div className="space-y-3 text-sm">
                {creator.gmailAddress && (
                  <a href={`mailto:${creator.gmailAddress}`} className="flex items-center gap-3 text-primary hover:underline">
                    <span className="text-xl">📧</span>
                    <span className="truncate">{creator.gmailAddress}</span>
                  </a>
                )}
                {creator.discordUsername && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xl">💬</span>
                    <span>{creator.discordUsername}</span>
                  </div>
                )}
                {creator.portfolioUrl && (
                  <a href={creator.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-primary hover:underline">
                    <span className="text-xl">🌐</span>
                    <span>Portfolio</span>
                  </a>
                )}
                {!creator.gmailAddress && !creator.discordUsername && !creator.portfolioUrl && (
                  <p className="text-muted-foreground text-xs">No contact info provided</p>
                )}
              </div>
            </div>

            {/* Hire CTA */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center shadow-[0_0_30px_-10px_hsl(var(--primary))]">
              <p className="font-bold mb-1">Ready to hire?</p>
              <p className="text-xs text-muted-foreground mb-4">Reach out to {creator.displayName} directly</p>
              <div className="space-y-2">
                {creator.gmailAddress && (
                  <a href={`mailto:${creator.gmailAddress}`}>
                    <Button className="w-full shadow-[0_0_15px_-5px_hsl(var(--primary))]">📧 Send Email</Button>
                  </a>
                )}
                {creator.discordUsername && (
                  <Button variant="outline" className="w-full border-white/10" onClick={() => navigator.clipboard?.writeText(creator.discordUsername!)}>
                    💬 Copy Discord
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
