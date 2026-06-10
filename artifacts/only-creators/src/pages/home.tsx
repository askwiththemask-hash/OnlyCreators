import { MainLayout } from "@/components/layout/MainLayout";
import { useGetTrendingSamples, useGetFeaturedCreators, useGetHomeStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats } = useGetHomeStats();
  const { data: trending, isLoading: isLoadingTrending } = useGetTrendingSamples({ limit: 4 });
  const { data: featured, isLoading: isLoadingFeatured } = useGetFeaturedCreators();

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 pt-24 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0" />
        <div className="container relative z-10 px-4 mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Level Up Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Content</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Hire the best Minecraft builders, video editors, and GFX artists. The premium marketplace for gaming creators.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/browse" className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-[0_0_30px_-5px_hsl(var(--primary))]">
              Explore Services
            </Link>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSds-0u86FHTjqDWZuVz5dtkDVR75P3-Dj0OYfFaeVNgKVl2ag/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-white/10 bg-black/50 hover:bg-white/5 font-bold transition-colors"
            >
              Apply For Creator
            </a>
          </div>
          
          {stats && (
            <div className="flex justify-center gap-12 mt-20 text-center">
              <div>
                <p className="text-4xl font-bold text-white">{stats.totalCreators}+</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Creators</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{stats.totalSamples}+</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Projects</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{stats.totalCategories}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Categories</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl font-bold">Trending Categories</h2>
          <Link href="/browse" className="text-primary hover:underline font-medium">View All</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: "Thumbnail Designing", slug: "thumbnail-designing" },
            { name: "Video Editing", slug: "video-editing" },
            { name: "Server Developers", slug: "server-developers" },
            { name: "Custom Models", slug: "custom-models" },
            { name: "Hire Builder", slug: "hire-builder" },
            { name: "GFX", slug: "gfx" },
          ].map((cat) => (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className="group block aspect-square relative rounded-xl overflow-hidden border border-white/10 bg-card hover:border-primary/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
              <div className="absolute inset-0 p-4 flex flex-col justify-end z-20">
                <span className="font-bold text-white group-hover:text-primary transition-colors">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Featured Samples */}
      <section className="py-24 border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl font-bold">Trending Drops</h2>
          </div>
          {isLoadingTrending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending?.map(sample => (
                <Link key={sample.id} href={`/sample/${sample.id}`} className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/30 transition-all">
                  <div className="aspect-video bg-muted relative">
                    {sample.previewImageUrl && <img src={sample.previewImageUrl} alt={sample.title} className="object-cover w-full h-full" />}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1 truncate">{sample.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{sample.creatorName}</p>
                    <div className="flex justify-between mt-4">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-white/5">{sample.category}</span>
                      {sample.budget && <span className="font-bold text-primary">₹{sample.budget}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
