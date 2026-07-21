import { useState } from "react";
import { Link } from "wouter";
import { useGetSamples, useGetCategories, useGetCreators } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SampleCard({ sample }: { sample: { id: number; title: string; creatorName?: string | null; category: string; budget?: number | null; previewImageUrl?: string | null; likeCount?: number } }) {
  return (
    <Link href={`/sample/${sample.id}`} className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {sample.previewImageUrl ? (
          <img src={sample.previewImageUrl} alt={sample.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">🎮</div>
        )}
        <div className="absolute top-2 right-2">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white">
            ❤️ {sample.likeCount ?? 0}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-1 truncate group-hover:text-primary transition-colors">{sample.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{sample.creatorName}</p>
        <div className="flex justify-between items-center mt-3">
          <Badge variant="secondary" className="text-xs">{sample.category}</Badge>
          {sample.budget != null && <span className="font-bold text-primary text-sm">₹{sample.budget}</span>}
        </div>
      </div>
    </Link>
  );
}

function CreatorCard({ creator }: { creator: { id: number; displayName: string; servicesOffered?: string | null; avatarUrl?: string | null; verificationStatus?: string; totalLikes?: number; totalSamples?: number } }) {
  return (
    <Link href={`/creator/${creator.id}`} className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/40 transition-all p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white flex-shrink-0 overflow-hidden">
          {creator.avatarUrl ? <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" /> : creator.displayName[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate group-hover:text-primary transition-colors">{creator.displayName}</h3>
            {creator.verificationStatus !== "normal" && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold flex-shrink-0">
                {creator.verificationStatus === "premium" ? "⭐ PRO" : "✓"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{creator.servicesOffered}</p>
        </div>
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>❤️ {creator.totalLikes ?? 0} likes</span>
        <span>📁 {creator.totalSamples ?? 0} works</span>
      </div>
    </Link>
  );
}

export default function Browse() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeTab, setActiveTab] = useState("samples");

  const { data: categories } = useGetCategories();
  const { data: samples, isLoading: samplesLoading } = useGetSamples({ search: search || undefined, category: category || undefined });
  const { data: creators, isLoading: creatorsLoading } = useGetCreators({ search: search || undefined });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Browse</h1>
          <p className="text-muted-foreground">Discover top gaming creators and their work</p>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <Input
            placeholder="Search samples, creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          {search && <Button variant="ghost" onClick={() => setSearch("")}>Clear</Button>}
        </div>

        {/* Category filters */}
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="samples">Samples & Work</TabsTrigger>
            <TabsTrigger value="creators">Creators</TabsTrigger>
          </TabsList>

          <TabsContent value="samples">
            {samplesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}
              </div>
            ) : samples?.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <p className="text-5xl mb-4">🎮</p>
                <p className="text-lg font-semibold">No samples found</p>
                <p className="text-sm mt-1">Try changing your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {samples?.map((s) => <SampleCard key={s.id} sample={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators">
            {creatorsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            ) : creators?.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <p className="text-5xl mb-4">👤</p>
                <p className="text-lg font-semibold">No creators found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators?.map((c) => <CreatorCard key={c.id} creator={c} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
