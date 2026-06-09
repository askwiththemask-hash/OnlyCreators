import { useState } from "react";
import { Link } from "wouter";
import { useAdminGetUsers, useBanUser, useFeatureCreator } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useAdminGetUsers({ search: search || undefined });
  const banUser = useBanUser();

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <Link href="/"><Button className="mt-4">Go Home</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const handleBan = (id: number, isBanned: boolean) => {
    banUser.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminGetUsers"] }) });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-xl">User Management</h1>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search users by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : users?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground rounded-2xl border border-white/5 bg-card">
            <p className="text-4xl mb-3">👤</p>
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users?.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-card">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{user.username}</p>
                    {user.isBanned && <span className="text-xs text-destructive font-bold">BANNED</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={user.accountType === "creator" ? "default" : "secondary"} className="hidden sm:flex">
                    {user.accountType}
                  </Badge>
                  {user.role === "admin" && <Badge className="bg-destructive/20 text-destructive">admin</Badge>}
                  <Button
                    size="sm"
                    variant={user.isBanned ? "outline" : "destructive"}
                    onClick={() => handleBan(user.id, !!user.isBanned)}
                    disabled={banUser.isPending}
                  >
                    {user.isBanned ? "Unban" : "Ban"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
