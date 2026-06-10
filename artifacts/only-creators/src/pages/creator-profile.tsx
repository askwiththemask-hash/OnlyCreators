import { Link, useParams } from "wouter";
import { useGetCreatorById, useGetSamples, useToggleFollow } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const creatorId = parseInt(id, 10);
  const { isLoggedIn } = useAuth();

  const { data: creator, isLoading } = useGetCreatorById(creatorId);
  const { data: samples } = useGetSamples({ creatorId: creatorId.toString() });
  const toggleFollow = useToggleFollow();

  const handleFollow = () => {
    if (!isLoggedIn) return;
    toggleFollow.mutate({ id: creatorId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getCreatorById"] }),
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <Skeleton className="h-40 w-full rounded-2xl mb-6" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </MainLayout>
    );
  }

  if (!creator) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">👤</p>
          <h2 className="text-2xl font-bold">Creator not found</h2>
          <Link href="/browse" className="text-primary mt-4 inline-block hover:underline">Back to Browse</Link>
        </div>
      </MainLayout>
    );
  }

  const verificationBadge = creator.verificationStatus === "premium"
    ? "⭐ PRO"
    : creator.verificationStatus === "verified"
    ? "✓ Verified"
    : null;

  return (
    <MainLayout>
      {/* Cover / hero */}
      <div className="relative border-b border-white/10 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-black text-white flex-shrink-0 overflow-hidden shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)]">
              {creator.avatarUrl ? <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" /> : creator.displayName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black">{creator.displayName}</h1>
                {verificationBadge && (
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">{verificationBadge}</span>
                )}
                {creator.level && creator.level !== "Newcomer" && (
                  <Badge variant="secondary">{creator.level}</Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-1">@{creator.username}</p>
              {creator.servicesOffered && (
                <p className="text-sm text-primary/80 font-medium">{creator.servicesOffered}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleFollow} disabled={!isLoggedIn} className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">
                Follow • {creator.followerCount ?? 0}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-8">
            <div className="text-center">
              <p className="text-2xl font-bold">{creator.totalSamples ?? 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Works</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{creator.totalLikes ?? 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Likes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{creator.followerCount ?? 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Followers</p>
            </div>
            {creator.experienceLevel && (
              <div className="text-center">
                <p className="text-2xl font-bold">{creator.experienceLevel}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Experience</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Works */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Works ({samples?.length ?? 0})</h2>
            {samples?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border border-white/5 bg-card">
                <p className="text-4xl mb-3">📁</p>
                <p>No approved samples yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {samples?.map((sample) => (
                  <Link key={sample.id} href={`/sample/${sample.id}`} className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/40 transition-all">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {sample.previewImageUrl ? (
                        <img src={sample.previewImageUrl} alt={sample.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold truncate group-hover:text-primary transition-colors">{sample.title}</h3>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">❤️ {sample.likeCount ?? 0}</span>
                        {sample.budget != null && <span className="font-bold text-primary text-sm">₹{sample.budget}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* About */}
            {creator.bio && (
              <div className="rounded-2xl border border-white/10 bg-card p-6">
                <h3 className="font-bold mb-3">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
              </div>
            )}

            {/* Contact */}
            <div className="rounded-2xl border border-white/10 bg-card p-6">
              <h3 className="font-bold mb-4">Contact</h3>
              <div className="space-y-3 text-sm">
                {creator.gmailAddress && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📧</span>
                    <a href={`mailto:${creator.gmailAddress}`} className="text-primary hover:underline truncate">{creator.gmailAddress}</a>
                  </div>
                )}
                {creator.discordUsername && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💬</span>
                    <span className="text-muted-foreground">{creator.discordUsername}</span>
                  </div>
                )}
                {creator.portfolioUrl && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🌐</span>
                    <a href={creator.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Portfolio</a>
                  </div>
                )}
              </div>
            </div>

            {/* Hire */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center shadow-[0_0_30px_-10px_hsl(var(--primary))]">
              <p className="text-lg font-bold mb-2">Ready to hire?</p>
              <p className="text-sm text-muted-foreground mb-4">Contact {creator.displayName} via Gmail or Discord above</p>
              {creator.gmailAddress && (
                <a href={`mailto:${creator.gmailAddress}`}>
                  <Button className="w-full shadow-[0_0_20px_-5px_hsl(var(--primary))]">📧 Send Email</Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
