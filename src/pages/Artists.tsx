import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/db/api";
import { Profile, Artwork } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Image as ImageIcon, Paintbrush, Loader2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Artists() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [artists, setArtists] = useState<(Profile & { artworks: Artwork[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const styleFilter = searchParams.get("style") || "all";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data } = await api.getArtists(styleFilter === 'all' ? undefined : styleFilter as any);
      setArtists(data || []);
      setLoading(false);
    }
    loadData();
  }, [styleFilter]);

  const filteredArtists = artists.filter(a => 
    a.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-card p-6 rounded-3xl border shadow-sm sticky top-20 z-40">
        <div className="flex-1 w-full space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black">{t('artists.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('artists.subtitle')}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t('artists.searchPlaceholder')}
              className="pl-10 h-12 rounded-xl border-2 focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-primary/60 italic px-2">{t('artists.pricingNote')}</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <ToggleGroup
            type="single"
            value={styleFilter}
            onValueChange={(val) => { if (val) setSearchParams({ style: val }) }}
            className="bg-muted p-1 h-12 rounded-xl"
          >
            <ToggleGroupItem value="all" className="rounded-lg data-[state=on]:bg-card data-[state=on]:shadow-sm px-4">
              {t('artists.filterAll')}
            </ToggleGroupItem>
            <ToggleGroupItem value="digital" className="rounded-lg data-[state=on]:bg-card data-[state=on]:shadow-sm px-4 flex gap-2">
              <ImageIcon className="w-4 h-4" /> {t('artists.filterDigital')}
            </ToggleGroupItem>
            <ToggleGroupItem value="handdrawn" className="rounded-lg data-[state=on]:bg-card data-[state=on]:shadow-sm px-4 flex gap-2">
              <Paintbrush className="w-4 h-4" /> {t('artists.filterHanddrawn')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="sketch-card overflow-hidden bg-card border-2">
              <Skeleton className="aspect-square bg-muted" />
              <div className="p-4 flex flex-col items-center gap-3">
                <Skeleton className="h-16 w-16 -mt-12 rounded-full border-4 border-card bg-muted" />
                <div className="text-center space-y-2 w-full">
                  <Skeleton className="h-5 w-24 mx-auto bg-muted" />
                  <Skeleton className="h-3 w-32 mx-auto bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredArtists.map((artist) => (
            <Card key={artist.id} className="sketch-card overflow-hidden group border-2">
              <Link to={`/profile/${artist.id}`} className="block relative aspect-square overflow-hidden bg-muted">
                {artist.artworks[0] ? (
                  <img
                    src={artist.artworks[0].image_url}
                    alt={artist.username}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <span className="text-xs">{t('profile.noArtwork')}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-card/90 text-foreground hover:bg-card border-2">
                    {artist.style_preference === 'digital' ? t('gallery.digital') : t('gallery.handdrawn')}
                  </Badge>
                </div>
              </Link>
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <Avatar className="h-16 w-16 -mt-12 border-4 border-white shadow-md ring-2 ring-primary/20">
                  <AvatarImage src={artist.avatar_url || ""} />
                  <AvatarFallback>{artist.username[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg">{artist.username}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{artist.bio || t('profile.noBio')}</p>
                </div>
                <div className="flex items-center justify-between w-full pt-2 gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => navigate(`/profile/${artist.id}`)}>
                    {t('artists.viewProfile')}
                  </Button>
                  <Button className="flex-1 h-8 text-xs cat-button font-bold" onClick={() => navigate(`/messages/${artist.id}`)}>
                    {t('artists.commission')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/40 mb-6">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold">{t('artists.noResults')}</h3>
          <p className="text-muted-foreground mt-2">{t('artists.noResultsDesc')}</p>
          <Button variant="link" onClick={() => {setSearchTerm(""); setSearchParams({ style: "all" })}} className="mt-4">
            {t('common.refresh')}
          </Button>
        </div>
      )}
    </div>
  );
}
