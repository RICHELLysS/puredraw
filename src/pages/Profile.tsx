import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/db/api";
import { Profile, Artwork, ARTIST_TAGS, translateTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, CheckCircle2, Image as ImageIcon, Palette, Calendar, Loader2, Camera } from "lucide-react";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { profile: currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    const { data: pData } = await api.getProfile(id!);
    setProfile(pData);
    if (pData?.role === 'artist') {
      const { data: aData } = await api.getArtworks(id!);
      setArtworks(aData || []);
    }
    setLoading(false);
  };

  const handleAvatarUploadSuccess = async (url: string) => {
    if (!currentUser) return;
    try {
      await api.updateProfile(currentUser.id, { avatar_url: url });
      await refreshProfile();
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
      setIsAvatarDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update avatar:", err);
    }
  };

  const dateLocale = language === 'en' ? enUS : zhCN;
  const dateFormat = language === 'en' ? 'MMM yyyy' : 'yyyy年MM月';

  if (loading) return (
    <div className="max-w-6xl mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Skeleton className="w-32 h-32 rounded-full bg-muted" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-4 w-full max-w-md bg-muted" />
        </div>
      </div>
    </div>
  );

  if (!profile) return <div className="text-center py-20">{t('profile.userNotFound')}</div>;

  const isOwnProfile = currentUser?.id === profile.id;
  const isVerifiedArtist = profile.role === 'artist' && profile.verification_status === 'verified';
  const isArtist = profile.role === 'artist';

  // 角色标签文本
  const getRoleBadgeText = () => {
    if (profile.role === 'admin') return language === 'en' ? 'Admin' : '管理员';
    if (profile.role === 'artist' && isVerifiedArtist) return t('profile.verified');
    if (profile.role === 'artist') return t('profile.artist');
    return t('profile.client');
  };

  // 画师标签（只取 ARTIST_TAGS 中已知的）
  const knownTags = (profile.artist_tags || []).filter(k => ARTIST_TAGS.find(t => t.key === k));

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10 px-4">
      {/* ── 个人信息头部 ── */}
      <div className="flex flex-col md:flex-row gap-8 items-start bg-card p-8 rounded-3xl border-2 shadow-sm">
        {/* 头像 */}
        <div className="relative group shrink-0">
          <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-lg">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="text-4xl font-bold">{profile.username[0]}</AvatarFallback>
          </Avatar>

          {isOwnProfile && (
            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
              <DialogTrigger asChild>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('profile.changeAvatar')}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <ImageUpload
                    onUploadSuccess={handleAvatarUploadSuccess}
                    folder="avatars"
                    label={t('profile.changeAvatar')}
                    aspectRatio="square"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isVerifiedArtist && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg border-4 border-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* 信息区 */}
        <div className="flex-1 space-y-4">
          <div className="space-y-3">
            {/* 用户名 + 角色标签 */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black tracking-tight">{profile.username}</h1>
              <Badge
                variant={isVerifiedArtist ? 'default' : profile.role === 'artist' ? 'secondary' : 'outline'}
                className="px-3 py-1 text-sm"
              >
                {getRoleBadgeText()}
              </Badge>
            </div>

            {/* 画师风格标签组 */}
            {isArtist && knownTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {knownTags.map(key => (
                  <Badge key={key} variant="outline" className="px-3 py-1 text-xs flex items-center gap-1">
                    {ARTIST_TAGS.find(t => t.key === key)?.category === 'digital'
                      ? <ImageIcon className="w-3 h-3" />
                      : <Palette className="w-3 h-3" />}
                    {translateTag(key, language)}
                  </Badge>
                ))}
              </div>
            )}

            {/* 仅有 style_preference 但无 artist_tags 的兼容展示 */}
            {isArtist && knownTags.length === 0 && profile.style_preference && (
              <Badge variant="outline" className="px-3 py-1 text-sm flex items-center gap-1 w-fit">
                {profile.style_preference === 'digital' ? <ImageIcon className="w-3 h-3" /> : <Palette className="w-3 h-3" />}
                {profile.style_preference === 'digital' ? t('profile.digital') : t('profile.handdrawn')}
              </Badge>
            )}

            <p className="text-muted-foreground text-lg italic">
              "{profile.bio || (language === 'en' ? 'Every stroke carries warmth 🐾' : '每一笔都是心意，每一画都是温度 🐾')}"
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {t('profile.joinedAt')} {format(new Date(profile.created_at), dateFormat, { locale: dateLocale })}
          </div>

          {/* 操作按钮 */}
          {!isOwnProfile && isArtist && isVerifiedArtist && (
            <div className="flex gap-3 pt-4">
              <Button size="lg" className="cat-button font-bold px-8" onClick={() => navigate(`/messages/${profile.id}`)}>
                <MessageCircle className="w-5 h-5 mr-2" /> {t('profile.commission')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate(`/messages/${profile.id}`)}>
                {t('profile.sendMessage')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── 画师作品 Tab ── */}
      {isArtist && (
        <Tabs defaultValue="showcase" className="w-full">
          <TabsList className="grid w-fit grid-cols-2 mb-8 bg-muted/50 p-1 h-12 rounded-xl">
            <TabsTrigger value="showcase" className="px-8 rounded-lg">
              {t('profile.showcase')} ({artworks.length})
            </TabsTrigger>
            <TabsTrigger value="about" className="px-8 rounded-lg">
              {t('profile.about')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="showcase" className="space-y-6">
            {artworks.length === 0 ? (
              <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/40 mb-6">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold">{t('profile.noArtwork')}</h3>
                <p className="text-muted-foreground mt-2">{t('profile.noArtworkDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {artworks.map((art) => (
                  <Card key={art.id} className="sketch-card overflow-hidden group border-2">
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      <img
                        src={art.image_url}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-white font-bold text-lg">{art.title}</p>
                      </div>
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold line-clamp-1">{art.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(art.created_at), language === 'en' ? 'MMM d, yyyy' : 'yyyy-MM-dd', { locale: dateLocale })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {art.type === 'digital' ? t('profile.digital') : t('profile.handdrawn')}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about">
            <Card className="sketch-card p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{t('profile.bio')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {profile.bio || t('profile.noBio')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase">{t('profile.speciality')}</p>
                  {knownTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {knownTags.map(key => (
                        <span key={key} className="px-2 py-1 text-sm bg-primary/10 text-primary rounded-lg font-medium">
                          {translateTag(key, language)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-lg font-bold flex items-center gap-2">
                      {profile.style_preference === 'digital'
                        ? <><ImageIcon className="w-5 h-5 text-primary" /> {t('profile.digitalArt')}</>
                        : <><Palette className="w-5 h-5 text-primary" /> {t('profile.handdrawnArt')}</>}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase">{t('profile.certStatus')}</p>
                  <p className="text-lg font-bold flex items-center gap-2">
                    {isVerifiedArtist
                      ? <><CheckCircle2 className="w-5 h-5 text-green-500" /> {t('profile.certVerified')}</>
                      : <><Loader2 className="w-5 h-5 text-orange-500" /> {t('profile.certPending')}</>}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t space-y-4">
                <h4 className="font-bold">{t('profile.commissionNotes')}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(['note1', 'note2', 'note3', 'note4'] as const).map(n => (
                    <li key={n} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{t(`profile.${n}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── 约稿人页面 ── */}
      {profile.role === 'client' && (
        <Card className="sketch-card p-12 text-center space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold">{t('profile.clientTitle')}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('profile.clientDesc')}
          </p>
          {isOwnProfile && (
            <Button className="cat-button mt-6" onClick={() => navigate("/verify")}>
              {t('profile.applyArtist')}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

