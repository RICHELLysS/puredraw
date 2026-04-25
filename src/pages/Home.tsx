import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/db/api";
import { Profile, Artwork } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Image as ImageIcon, Paintbrush, ChevronRight, ShieldCheck, Banknote, BadgeCheck, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const [artists, setArtists] = useState<(Profile & { artworks: Artwork[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { images } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function loadData() {
      const { data } = await api.getArtists();
      setArtists(data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const rules = [
    { icon: <Banknote className="w-6 h-6" />, title: t('home.rules.minPrice.title'), desc: t('home.rules.minPrice.desc') },
    { icon: <ShieldCheck className="w-6 h-6" />, title: t('home.rules.noAI.title'), desc: t('home.rules.noAI.desc') },
    { icon: <BadgeCheck className="w-6 h-6" />, title: t('home.rules.certified.title'), desc: t('home.rules.certified.desc') },
    { icon: <Lock className="w-6 h-6" />, title: t('home.rules.escrow.title'), desc: t('home.rules.escrow.desc') },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-secondary p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex-1 space-y-6 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            {t('home.hero.badge')}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            {t('home.hero.title1')} <br />
            <span className="text-primary italic">{t('home.hero.title2')}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
            <Button size="lg" className="h-14 px-8 text-lg font-bold cat-button" onClick={() => navigate("/artists")}>
              {t('home.hero.explore')}
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-2" onClick={() => navigate("/gallery")}>
              {t('home.hero.gallery')}
            </Button>
          </div>
        </div>
        <div className="flex-1 relative max-w-sm md:max-w-md">
          <div className="absolute -top-4 -left-4 w-full h-full bg-primary rounded-3xl transform rotate-3"></div>
          <img
            src={images.hero}
            alt="Hero Cat"
            className="relative w-full aspect-square object-cover rounded-3xl border-4 border-card shadow-xl transform transition-transform hover:scale-105"
          />
        </div>
      </section>

      {/* Categories */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          onClick={() => navigate("/artists?style=digital")}
          className="group cursor-pointer sketch-card bg-secondary/50 p-8 flex items-center justify-between overflow-hidden"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">{t('gallery.digital')}</h3>
            <p className="text-muted-foreground">{language === 'en' ? 'Digital illustration, character design, game art' : t('gallery.digitalDesc') || '数字绘画，插画设计，游戏立绘'}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
              {t('common.viewMore')} <ChevronRight className="w-4 h-4" />
            </span>
          </div>
          <ImageIcon className="w-24 h-24 text-primary/40 group-hover:scale-110 transition-transform" />
        </div>
        <div
          onClick={() => navigate("/artists?style=handdrawn")}
          className="group cursor-pointer sketch-card bg-secondary/50 p-8 flex items-center justify-between overflow-hidden"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">{t('gallery.handdrawn')}</h3>
            <p className="text-muted-foreground">{language === 'en' ? 'Watercolor, sketch, oil painting, traditional art' : t('gallery.handdrawnDesc') || '水彩素描，油画国画，传统艺术'}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
              {t('common.viewMore')} <ChevronRight className="w-4 h-4" />
            </span>
          </div>
          <Paintbrush className="w-24 h-24 text-primary/40 group-hover:scale-110 transition-transform" />
        </div>
      </section>

      {/* Rules Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tight">{t('home.rules.title')}</h2>
          <p className="text-muted-foreground">{t('home.rules.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rules.map((rule, i) => (
            <div key={i} className="bg-card border-2 border-border rounded-2xl p-6 space-y-3 hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {rule.icon}
              </div>
              <h3 className="font-bold text-lg">{rule.title}</h3>
              <p className="text-sm text-muted-foreground">{rule.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Artists Showcase */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">{t('home.featuredArtists')}</h2>
            <p className="text-muted-foreground">{t('home.featuredDesc')}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/artists")}>{t('common.viewMore')}</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-3xl bg-muted" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-muted" />
                    <Skeleton className="h-3 w-16 bg-muted" />
                  </div>
                </div>
              </div>
            ))
          ) : artists.length > 0 ? (
            artists.slice(0, 6).map((artist) => (
              <div key={artist.id} className="group space-y-4">
                <Link to={`/profile/${artist.id}`} className="block relative aspect-square overflow-hidden rounded-3xl border-2 hover:border-primary transition-colors">
                  <img
                    src={artist.artworks[0]?.image_url || "https://placehold.co/400x400/f6a15e/white?text=Artist"}
                    alt={artist.username}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="font-bold text-lg">{artist.username}</p>
                    <p className="text-sm opacity-80">
                      {artist.style_preference === 'digital' ? t('gallery.digital') : t('gallery.handdrawn')} · {artist.bio || t('home.noBio')}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <img src={artist.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + artist.username} className="w-8 h-8 rounded-full border" alt="avatar" />
                    <span className="font-medium">{artist.username}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/messages/${artist.id}`)}>{t('artists.commission')}</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
              <p className="text-muted-foreground">{t('home.noArtists')}</p>
              <Button onClick={() => navigate("/verify")} className="mt-4">{t('verify.submitBtn')}</Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary p-12 rounded-3xl text-primary-foreground flex flex-col items-center text-center gap-6">
        <h2 className="text-3xl md:text-5xl font-black">{t('home.cta.title')}</h2>
        <p className="text-primary-foreground/80 max-w-xl text-lg">{t('home.cta.subtitle')}</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Button size="lg" variant="secondary" className="cat-button font-bold px-10 h-14 text-lg" onClick={() => navigate("/auth")}>{t('home.cta.join')}</Button>
          <Button size="lg" className="bg-black/10 hover:bg-black/20 border-white text-white font-bold px-10 h-14 text-lg" onClick={() => navigate("/community")}>{t('home.cta.learnMore')}</Button>
        </div>
      </section>
    </div>
  );
}
