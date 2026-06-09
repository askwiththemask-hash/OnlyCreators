import { useState } from "react";
import { Link } from "wouter";
import { useGetRequests, useGetCategories } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function Requests() {
  const [category, setCategory] = useState("");
  const { isLoggedIn } = useAuth();
  const { data: categories } = useGetCategories();
  const { data: requests, isLoading } = useGetRequests({ category: category || undefined });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black">Work Requests</h1>
            <p className="text-muted-foreground mt-1">Clients looking for creators — find your next gig!</p>
          </div>
          {isLoggedIn && (
            <Link href="/requests/new">
              <Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">+ Post Request</Button>
            </Link>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button
            onClick={() => setCategory("")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${!category ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategory(category === cat.slug ? "" : cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${category === cat.slug ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : requests?.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-semibold">No requests yet</p>
            <p className="text-sm mt-1">Be the first to post a work request!</p>
            {isLoggedIn && <Link href="/requests/new"><Button variant="outline" className="mt-6">Post a Request</Button></Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests?.map((req) => (
              <div key={req.id} className="rounded-xl border border-white/10 bg-card p-5 hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-lg leading-tight">{req.title}</h3>
                  {req.budget != null && (
                    <span className="text-primary font-black text-xl flex-shrink-0">₹{req.budget}</span>
                  )}
                </div>
                {req.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{req.description}</p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary">{req.category}</Badge>
                  {req.gameType && <Badge variant="outline">{req.gameType}</Badge>}
                  {req.deadline && (
                    <span className="text-xs text-muted-foreground">📅 Due {new Date(req.deadline).toLocaleDateString()}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">by {req.username}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoggedIn && (
          <div className="mt-12 text-center py-8 rounded-2xl border border-white/10 bg-card">
            <p className="text-lg font-semibold mb-2">Want to post a work request?</p>
            <p className="text-muted-foreground text-sm mb-4">Create an account to let creators find you</p>
            <Link href="/register"><Button>Sign Up Free</Button></Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
