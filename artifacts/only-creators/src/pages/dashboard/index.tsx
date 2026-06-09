import { Link, useLocation } from "wouter";
import { useGetMyCreatorProfile, useGetDashboardStats, useGetSamples } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isCreator, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyCreatorProfile();
  const { data: stats } = useGetDashboardStats();
  const { data: mySamples } = useGetSamples({ creatorId: profile?.id?.toString(), status: "all" } as Parameters<typeof useGetSamples>[0]);

  if (authLoading || profileLoading) {
    return (
      <MainLayout>
        <div className="container py-12 max-w-5xl mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isCreator) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎨</p>
          <h2 className="text-2xl font-bold mb-2">Creator Dashboard</h2>
          <p className="text-muted-foreground mb-6">You need a creator account to access this page.</p>
          <Link href="/register"><Button>Create Creator Account</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { label: "Total Works", value: stats?.totalSamples ?? 0, icon: "📁", color: "from-violet-500/20 to-violet-500/5" },
    { label: "Total Likes", value: stats?.totalLikes ?? 0, icon: "❤️", color: "from-red-500/20 to-red-500/5" },
    { label: "Comments", value: stats?.totalComments ?? 0, icon: "💬", color: "from-blue-500/20 to-blue-500/5" },
    { label: "Pending Review", value: stats?.pendingSamples ?? 0, icon: "⏳", color: "from-yellow-500/20 to-yellow-500/5" },
  ];

  const pendingSamples = mySamples?.filter(s => s.status === "pending") ?? [];
  const approvedSamples = mySamples?.filter(s => s.status === "approved") ?? [];
  const rejectedSamples = mySamples?.filter(s => s.status === "rejected") ?? [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Creator Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {profile?.displayName ?? user?.username}</p>
          </div>
          <Link href="/dashboard/upload">
            <Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">+ Upload Work</Button>
          </Link>
        </div>

        {/* Profile incomplete warning */}
        {!profile && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-between">
            <p className="text-sm text-yellow-300">⚠️ Complete your creator profile to start uploading work.</p>
            <Link href="/dashboard/profile"><Button size="sm" variant="outline">Set Up Profile</Button></Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat) => (
            <div key={stat.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.color} p-5`}>
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link href="/dashboard/upload" className="group block p-6 rounded-2xl border border-white/10 bg-card hover:border-primary/40 transition-all">
            <div className="text-3xl mb-3">📤</div>
            <h3 className="font-bold group-hover:text-primary transition-colors">Upload New Work</h3>
            <p className="text-sm text-muted-foreground mt-1">Submit a new sample for review</p>
          </Link>
          <Link href="/dashboard/profile" className="group block p-6 rounded-2xl border border-white/10 bg-card hover:border-primary/40 transition-all">
            <div className="text-3xl mb-3">✏️</div>
            <h3 className="font-bold group-hover:text-primary transition-colors">Edit Profile</h3>
            <p className="text-sm text-muted-foreground mt-1">Update your bio and contact info</p>
          </Link>
          <Link href={`/creator/${profile?.id}`} className="group block p-6 rounded-2xl border border-white/10 bg-card hover:border-primary/40 transition-all">
            <div className="text-3xl mb-3">👁️</div>
            <h3 className="font-bold group-hover:text-primary transition-colors">View Public Profile</h3>
            <p className="text-sm text-muted-foreground mt-1">See how clients see you</p>
          </Link>
        </div>

        {/* My Works */}
        <div>
          <h2 className="text-xl font-bold mb-4">My Works</h2>

          {mySamples?.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/5 bg-card text-muted-foreground">
              <p className="text-4xl mb-3">📁</p>
              <p>No uploads yet</p>
              <Link href="/dashboard/upload"><Button variant="outline" className="mt-4">Upload Your First Work</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {mySamples?.map((sample) => (
                <div key={sample.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-card hover:border-white/10 transition-all">
                  {sample.previewImageUrl && (
                    <img src={sample.previewImageUrl} alt={sample.title} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{sample.title}</p>
                    <p className="text-xs text-muted-foreground">{sample.category} • ❤️ {sample.likeCount ?? 0}</p>
                  </div>
                  <Badge
                    variant={sample.status === "approved" ? "default" : sample.status === "rejected" ? "destructive" : "secondary"}
                    className="flex-shrink-0"
                  >
                    {sample.status === "approved" ? "✓ Live" : sample.status === "pending" ? "⏳ Pending" : "✗ Rejected"}
                  </Badge>
                  <Link href={`/sample/${sample.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
