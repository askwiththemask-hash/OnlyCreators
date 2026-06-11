import { useState } from "react";
import { Link } from "wouter";
import { useAdminGetSamples, useApproveSample, useRejectSample } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";

function getToken() { return localStorage.getItem("auth_token"); }

async function adminDeleteSample(id: number): Promise<void> {
  const token = getToken();
  const r = await fetch(`/api/admin/samples/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok && r.status !== 204) {
    const text = await r.text().catch(() => "Unknown error");
    throw new Error(text || `Failed to delete (${r.status})`);
  }
}

export default function AdminSamples() {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: samples, isLoading } = useAdminGetSamples({ status: statusFilter });
  const approveSample = useApproveSample();
  const rejectSample = useRejectSample();

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleApprove = (id: number) => {
    approveSample.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminGetSamples"] }) });
  };

  const handleReject = (id: number) => {
    const reason = window.prompt("Rejection reason (optional):");
    rejectSample.mutate({ id, data: { reason: reason ?? undefined } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminGetSamples"] }),
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminDeleteSample(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["adminGetSamples"] });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Sample (Admin)"
        message={`Permanently delete "${deleteTarget?.title}"? This removes it from the database and deletes all associated files from storage.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
        loading={deleting}
      />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-bold text-xl">Sample Management</h1>
        </div>

        {deleteError && (
          <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
            <span>❌ {deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="ml-3 font-bold text-destructive/60 hover:text-destructive">✕</button>
          </div>
        )}

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">⏳ Pending</TabsTrigger>
            <TabsTrigger value="approved">✓ Approved</TabsTrigger>
            <TabsTrigger value="rejected">✗ Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter}>
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : samples?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground rounded-2xl border border-white/5 bg-card">
                <p className="text-4xl mb-3">📭</p>
                <p>No {statusFilter} samples</p>
              </div>
            ) : (
              <div className="space-y-4">
                {samples?.map((sample) => (
                  <div key={sample.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-card">
                    {sample.previewImageUrl && (
                      <img src={sample.previewImageUrl} alt={sample.title} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{sample.title}</p>
                      <p className="text-sm text-muted-foreground">by {sample.creatorName} • {sample.category}</p>
                      {sample.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sample.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={sample.status === "approved" ? "default" : sample.status === "rejected" ? "destructive" : "secondary"}>
                        {sample.status}
                      </Badge>
                      {sample.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(sample.id)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(sample.id)}>Reject</Button>
                        </>
                      )}
                      <Link href={`/sample/${sample.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget({ id: sample.id, title: sample.title })}
                      >
                        🗑
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
