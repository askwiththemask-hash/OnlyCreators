import { Link, useLocation } from "wouter";
import { useGetAdminStats } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: stats } = useGetAdminStats();

  if (authLoading) {
    return <MainLayout><div className="container py-12"><Skeleton className="h-40 w-full" /></div></MainLayout>;
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <Link href="/"><Button>Go Home</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: "👤", href: "/admin/users" },
    { label: "Total Creators", value: stats?.totalCreators ?? 0, icon: "🎨", href: "/admin/users" },
    { label: "Total Samples", value: stats?.totalSamples ?? 0, icon: "📁", href: "/admin/samples" },
    { label: "Pending Review", value: stats?.pendingApprovals ?? 0, icon: "⏳", href: "/admin/samples" },
    { label: "Total Likes", value: stats?.totalLikes ?? 0, icon: "❤️", href: "/admin/samples" },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Platform management and moderation</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-sm font-bold">Admin</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {statCards.map((stat) => (
            <Link key={stat.label} href={stat.href} className="block rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/30 transition-all">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/samples" className="group block rounded-2xl border border-white/10 bg-card p-8 hover:border-primary/40 transition-all">
            <div className="text-4xl mb-4">📁</div>
            <h2 className="text-xl font-bold group-hover:text-primary transition-colors mb-2">Sample Management</h2>
            <p className="text-muted-foreground text-sm">Review, approve, reject, and delete creator samples.</p>
            {(stats?.pendingApprovals ?? 0) > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold">
                ⏳ {stats?.pendingApprovals} pending
              </div>
            )}
          </Link>

          <Link href="/admin/users" className="group block rounded-2xl border border-white/10 bg-card p-8 hover:border-primary/40 transition-all">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-bold group-hover:text-primary transition-colors mb-2">User Management</h2>
            <p className="text-muted-foreground text-sm">View all users, manage verification, ban/unban accounts.</p>
          </Link>

          <Link href="/admin/pins" className="group block rounded-2xl border border-white/10 bg-card p-8 hover:border-primary/40 transition-all">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-xl font-bold group-hover:text-primary transition-colors mb-2">Creator PINs</h2>
            <p className="text-muted-foreground text-sm">View all creator PINs, usage status, and linked accounts.</p>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
