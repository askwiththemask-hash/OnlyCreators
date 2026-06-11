import { Link, useParams } from "wouter";
import { useGetSamples, useGetCategories, useGetCreators } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data: categories } = useGetCategories();
  const category = categories?.find((c) => c.slug === slug);
  const { data: samples, isLoading } = useGetSamples({ category: slug });
  const { data: creators } = useGetCreators();

  const categoryCreators = creators?.filter((c) =>
    c.servicesOffered?.toLowerCase().includes(category?.name?.toLowerCase() ?? "")
  );

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* Category Header */}
        <div className="mb-10 pb-10 border-b border-white/10">
          <div className="flex items-center gap-4 mb-4">
            {category && <span className="text-5xl">{category.icon}</span>}
            <div>
              <h1 className="text-4xl font-black">{category?.name ?? slug}</h1>
              <p className="text-muted-foreground mt-1">{category?.description}</p>
            </div>
          </div>
          {category && (
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{category.sampleCount} samples</span>
            </div>
          )}
        </div>

        {/* Creators in this category */}
        {categoryCreators && categoryCreators.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Top Creators</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {categoryCreators.slice(0, 6).map((creator) => (
                <Link key={creator.id} href={`/creator/${creator.id}`} className="flex-shrink-0 w-40 group text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white overflow-hidden mb-2">
                    {creator.avatarUrl ? <img src={creator.avatarUrl} className="w-full h-full object-cover" alt={creator.displayName} /> : creator.displayName[0]}
                  </div>
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{creator.displayName}</p>
                  {creator.verificationStatus !== "normal" && (
                    <span className="text-xs text-primary">{creator.verificationStatus === "premium" ? "⭐ PRO" : "✓ Verified"}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Samples */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Sample Works</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}
            </div>
          ) : samples?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-5xl mb-4">⌛</p>
              <p className="text-lg font-semibold">COMING SOON.....</p>
              <p className="text-sm mt-1">join our discord for updates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    <p className="text-sm text-muted-foreground mt-1">{sample.creatorName}</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="secondary" className="text-xs">❤️ {sample.likeCount ?? 0}</Badge>
                      {sample.budget != null && <span className="font-bold text-primary">₹{sample.budget}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
