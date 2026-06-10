import { MainLayout } from "@/components/layout/MainLayout";
import { useGetTrendingSamples, useGetFeaturedCreators, useGetHomeStats, useGetCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ICONS: Record<string, string> = {
  "thumbnail-designing": "🖼️",
  "video-editing": "🎬",
  "resource-packs": "📦",
  "vfx": "✨",
  "gfx": "🎨",
  "custom-models": "🧱",
  "server-developers": "🖥️",
  "recording-managers": "🎙️",
  "plugin-makers": "🔧",
  "cinematics": "🎥",
  "hire-builder": "🏰",
  "custom-skin": "👕",
  "mods": "⚙️",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "thumbnail-designing": "from-orange-600/40 to-orange-900/20",
  "video-editing": "from-blue-600/40 to-blue-900/20",
  "resource-packs": "from-emerald-600/40 to-emerald-900/20",
  "vfx": "from-yellow-500/40 to-yellow-900/20",
  "gfx": "from-pink-600/40 to-pink-900/20",
  "custom-models": "from-stone-500/40 to-stone-900/20",
  "server-developers": "from-cyan-600/40 to-cyan-900/20",
  "recording-managers": "from-red-600/40 to-red-900/20",
  "plugin-makers": "from-violet-600/40 to-violet-900/20",
  "cinematics": "from-indigo-600/40 to-indigo-900/20",
  "hire-builder": "from-amber-600/40 to-amber-900/20",
  "custom-skin": "from-teal-600/40 to-teal-900/20",
  "mods": "from-green-600/40 to-green-900/20",
};

export default function Home() {
  const { data: stats } = useGetHomeStats();
  const { data: trending, isLoading: isLoadingTrending } = useGetTrendingSamples({ limit: 4 });
  const { data: featured } = useGetFeaturedCreators();
  const { data: categories, isLoading: categoriesLoading } = useGetCategories();

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

      {/* All Categories */}
      <section className="py-24 container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold">All Categories</h2>
            <p className="text-muted-foreground mt-1">Find the perfect creator for every need</p>
          </div>
          <Link href="/browse" className="text-primary hover:underline font-medium">View All →</Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 13 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories?.map((cat) => {
              const icon = CATEGORY_ICONS[cat.slug] ?? cat.icon ?? "🎮";
              const gradient = CATEGORY_GRADIENTS[cat.slug] ?? "from-primary/30 to-primary/10";
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group relative aspect-[4/3] flex flex-col items-center justify-center rounded-2xl overflow-hidden border border-white/10 hover:border-primary/60 transition-all duration-300 hover:shadow-[0_0_35px_-8px_hsl(var(--primary)/0.6)] hover:scale-[1.03] cursor-pointer"
                >
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-90 transition-opacity duration-300`} />
                  {/* Glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {/* Neon border glow on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_0_20px_0_hsl(var(--primary)/0.2)]" />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center px-3 gap-2">
                    <span className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">{icon}</span>
                    <p className="font-bold text-white text-sm group-hover:text-primary transition-colors duration-200 leading-tight">{cat.name}</p>
                    {cat.sampleCount > 0 && (
                      <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{cat.sampleCount} samples</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Trending Drops */}
      <section className="py-24 border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold">Trending Drops</h2>
              <p className="text-muted-foreground mt-1">Freshest approved work from the community</p>
            </div>
            <Link href="/browse" className="text-primary hover:underline font-medium">View All →</Link>
          </div>
          {isLoadingTrending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}
            </div>
          ) : trending?.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/5 bg-card text-muted-foreground">
              <p className="text-4xl mb-3">🎮</p>
              <p className="font-semibold">No approved samples yet</p>
              <p className="text-sm mt-1">Creators need admin approval — check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trending?.map(sample => (
                <Link
                  key={sample.id}
                  href={`/sample/${sample.id}`}
                  className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {sample.previewImageUrl && (
                      <img src={sample.previewImageUrl} alt={sample.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1 truncate group-hover:text-primary transition-colors">{sample.title}</h3>
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

      {/* Featured Creators */}
      {featured && featured.length > 0 && (
        <section className="py-24 container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">Featured Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(creator => (
              <Link
                key={creator.id}
                href={`/creator/${creator.id}`}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-card hover:border-primary/40 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)] transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white flex-shrink-0 overflow-hidden">
                  {creator.avatarUrl
                    ? <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" />
                    : creator.displayName[0].toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold truncate group-hover:text-primary transition-colors">{creator.displayName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{creator.servicesOffered}</p>
                  <p className="text-xs text-muted-foreground mt-1">❤️ {creator.totalLikes} likes</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Mods Marketplace CTA */}
      <section className="py-16 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-900/20 to-background p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">⚙️ Mods Marketplace</h2>
              <p className="text-muted-foreground">Explore custom mods, plugins, and resource packs for your favourite games.</p>
            </div>
            <Link href="/mods">
              <Button variant="outline" className="border-green-500/40 hover:border-green-500 hover:bg-green-500/10 text-green-400 flex-shrink-0">
                Browse Mods →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
