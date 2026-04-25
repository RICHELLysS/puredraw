import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/db/supabase";
import { Artwork, Profile, ARTIST_TAGS, translateTag } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

// 演示图片 URL 映射（根据主题切换）
const DEMO_IMG_GREEN = "https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-aw0f9nbxnpxc.jpg";
const DEMO_IMG_PINK  = "https://miaoda-conversation-file.cdn.bcebos.com/user-a7npi41ahnnk/conv-a7q1uwj0b668/20260411/file-avxjpu9snpc0.jpg";

type ArtworkWithArtist = Artwork & {
  artist: Profile;
};

export default function Gallery() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [artworks, setArtworks] = useState<ArtworkWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // 根据主题映射演示图片 URL，真实上传的作品不受影响
  const resolveImageUrl = (url: string) => {
    if (url === DEMO_IMG_GREEN && theme === 'pink') return DEMO_IMG_PINK;
    if (url === DEMO_IMG_PINK  && theme === 'green') return DEMO_IMG_GREEN;
    return url;
  };

  const loadArtworks = useCallback(async (pageNum: number) => {
    if (pageNum === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data, error } = await supabase
        .from('artworks')
        .select(`
          *,
          artist:profiles!artworks_artist_id_fkey(*)
        `)
        .eq('is_for_verification', false)
        .order('created_at', { ascending: false })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const newArtworks = (data || []) as ArtworkWithArtist[];

      if (pageNum === 0) {
        setArtworks(newArtworks);
      } else {
        setArtworks(prev => [...prev, ...newArtworks]);
      }

      setHasMore(newArtworks.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Failed to load artworks:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadArtworks(0);
  }, [loadArtworks]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadArtworks(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasMore, loadingMore, loading, page, loadArtworks]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div style={{ columnCount: 2, columnGap: '1.5rem' }}>
          {Array(12).fill(0).map((_, i) => {
            const heights = [240, 300, 360, 280, 320, 400, 260, 340, 380, 290, 350, 310];
            return (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
                <div className="rounded-2xl border-2 border-muted overflow-hidden">
                  <Skeleton className="w-full bg-muted" style={{ height: `${heights[i]}px` }} />
                  <div className="p-4 flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                    <Skeleton className="h-4 flex-1 bg-muted" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      {artworks.length > 0 ? (
        <MasonryGrid
          artworks={artworks}
          resolveImageUrl={resolveImageUrl}
          navigate={navigate}
          t={t}
          language={language}
        />
      ) : (
        <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
          <h3 className="text-2xl font-bold">{t('gallery.empty')}</h3>
          <p className="text-muted-foreground mt-2">{t('gallery.emptyDesc')}</p>
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <div ref={observerTarget} className="h-10" />

      {!hasMore && artworks.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t('gallery.end')}
        </div>
      )}
    </div>
  );
}

// 独立的 MasonryGrid 组件
function MasonryGrid({
  artworks,
  resolveImageUrl,
  navigate,
  t,
  language,
}: {
  artworks: ArtworkWithArtist[];
  resolveImageUrl: (url: string) => string;
  navigate: (path: string) => void;
  t: (key: Parameters<ReturnType<typeof useLanguage>['t']>[0]) => string;
  language: 'zh' | 'en';
}) {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1280) setColumns(4);
      else if (w >= 1024) setColumns(3);
      else if (w >= 640) setColumns(2);
      else setColumns(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 将 artworks 分配到各列（瀑布流）
  const cols: ArtworkWithArtist[][] = Array.from({ length: columns }, () => []);
  artworks.forEach((artwork, i) => { cols[i % columns].push(artwork); });

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {col.map((artwork) => {
            // 获取画师标签（翻译后）
            const artistTags = (artwork.artist?.artist_tags || [])
              .filter(k => ARTIST_TAGS.find(tag => tag.key === k))
              .slice(0, 2);

            return (
              <Card
                key={artwork.id}
                className="group cursor-pointer overflow-hidden border-2 hover:border-primary/40 transition-all hover:shadow-lg"
                onClick={() => navigate(`/profile/${artwork.artist_id}`)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={resolveImageUrl(artwork.image_url)}
                    alt={artwork.title}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg mb-2">{artwork.title}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {/* 优先展示 artist_tags；无则回退到 type 标签 */}
                        {artistTags.length > 0
                          ? artistTags.map(k => (
                              <span key={k} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs">
                                {translateTag(k, language)}
                              </span>
                            ))
                          : (
                              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs">
                                {artwork.type === 'digital' ? t('gallery.digital') : t('gallery.handdrawn')}
                              </span>
                            )
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-2">
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${artwork.artist_id}`); }}
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary/20 shrink-0">
                      <AvatarImage src={artwork.artist?.avatar_url || ""} />
                      <AvatarFallback>{artwork.artist?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{artwork.artist?.username}</span>
                  </div>
                  {/* 右下角类型小标签 */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {artwork.type === 'digital' ? t('gallery.digital') : t('gallery.handdrawn')}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

