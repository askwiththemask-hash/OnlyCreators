import { useState } from "react";
import { Link } from "wouter";
import { useGetSamples } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Star, Search } from "lucide-react";

const GAME_TYPES = ["All", "Minecraft", "Roblox", "Fortnite", "Valorant", "GTA", "Other"];
const MOD_TYPES = [
  { label: "All Mods", value: "" },
  { label: "Free", value: "free" },
  { label: "Premium", value: "premium" },
];

export default function ModsMarketplace() {
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [modType, setModType] = useState("");

  const { data: samples, isLoading } = useGetSamples({
    category: "mods",
    search: search || undefined,
    game: gameFilter || undefined,
  });

  const filteredMods = samples ?? [];

  return (
    <MainLayout>
      {/* Hero */}
      <div className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/30 via-background to-background" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">⚙️</span>
            <div>
              <h1 className="text-4xl md:text-5xl font-black">Mods Marketplace</h1>
              <p className="text-muted-foreground mt-1">Discover and download custom mods for your favourite games</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              ⚙️ Custom Mods
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              ⭐ Premium & Free
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold">
              🔧 Plugin Support
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search mods..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {search && <Button variant="ghost" onClick={() => setSearch("")}>Clear</Button>}
          </div>

          {/* Game type filters */}
          <div className="flex gap-2 flex-wrap">
            {GAME_TYPES.map(g => (
              <button
                key={g}
                onClick={() => setGameFilter(g === "All" ? "" : g)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${(g === "All" ? !gameFilter : gameFilter === g) ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary))]" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Mod type tabs */}
        <div className="flex gap-2 mb-8">
          {MOD_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setModType(t.value)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all border ${modType === t.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : filteredMods.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">⚙️</p>
            <h2 className="text-xl font-bold mb-2">No mods found</h2>
            <p className="text-muted-foreground mb-6">Be the first to upload a mod to the marketplace!</p>
            <Link href="/dashboard/upload">
              <Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">Upload a Mod</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMods.map(mod => (
              <Link
                key={mod.id}
                href={`/sample/${mod.id}`}
                className="group block rounded-xl overflow-hidden bg-card border border-white/5 hover:border-green-500/40 transition-all hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.2)]"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {mod.previewImageUrl ? (
                    <img src={mod.previewImageUrl} alt={mod.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-900/30 to-background">⚙️</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={mod.budget ? "bg-yellow-500/90 text-black" : "bg-green-500/90 text-black"}>
                      {mod.budget ? "💎 Premium" : "🆓 Free"}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white">
                      ❤️ {mod.likeCount ?? 0}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-1 truncate group-hover:text-green-400 transition-colors">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground truncate mb-3">{mod.creatorName}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      {mod.gameType && <Badge variant="outline" className="text-xs">{mod.gameType}</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      {mod.budget ? (
                        <span className="font-bold text-yellow-400 text-sm">₹{mod.budget}</span>
                      ) : (
                        <span className="font-bold text-green-400 text-sm flex items-center gap-1">
                          <Download className="w-3 h-3" />Free
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Creator CTA */}
        <div className="mt-16 rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-900/20 to-background p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Are you a mod developer?</h2>
          <p className="text-muted-foreground mb-6">Share your mods with the community and earn money from premium releases</p>
          <Link href="/dashboard/upload">
            <Button className="shadow-[0_0_20px_-5px_hsl(var(--primary))]">Upload Your Mod</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
