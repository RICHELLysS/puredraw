import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/db/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { X, Loader2, CheckCircle2, Clock, ChevronRight, ChevronLeft, Sparkles, Brush, Monitor } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { ARTIST_TAGS, ArtistTag, inferStylePreference } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function Verify() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [artworkUrls, setArtworkUrls] = useState<string[]>([]);

  if (!profile) return null;

  // ── 状态页：已提交待审核 ──
  if (profile.verification_status === 'pending') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Clock className="w-20 h-20 text-primary" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary animate-ping" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">{t('verify.pendingTitle')}</h2>
        <p className="text-muted-foreground">{t('verify.pendingDesc')}</p>
        <Button onClick={() => navigate("/")} className="cat-button">{t('verify.pendingBackHome')}</Button>
      </div>
    );
  }

  // ── 状态页：已认证 ──
  if (profile.verification_status === 'verified') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">{t('verify.verifiedTitle')}</h2>
        <p className="text-muted-foreground">{t('verify.verifiedDesc')}</p>
        <Button onClick={() => navigate(`/profile/${profile.id}`)} className="cat-button">
          {t('verify.verifiedGoProfile')}
        </Button>
      </div>
    );
  }

  const toggleTag = (key: string) => {
    setSelectedTags(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleUploadSuccess = (url: string) => {
    setArtworkUrls(prev => [...prev, url]);
  };

  const removeArtwork = (index: number) => {
    setArtworkUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedTags.length === 0) {
        toast.error(t('verify.selectAtLeastOne'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (artworkUrls.length < 3) {
        toast.error(t('verify.uploadAtLeastThree'));
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const stylePreference = inferStylePreference(selectedTags);
      await api.updateProfile(profile.id, {
        style_preference: stylePreference,
        artist_tags: selectedTags,
        verification_status: 'pending',
      });
      for (let i = 0; i < artworkUrls.length; i++) {
        await api.createArtwork({
          artist_id: profile.id,
          title: `${t('verify.artworkTitleBase')} ${i + 1}`,
          image_url: artworkUrls[i],
          type: stylePreference,
          is_for_verification: true,
        });
      }
      toast.success(t('verify.submitSuccess'));
      await refreshProfile();
      setStep(3);
    } catch (error: any) {
      toast.error(t('verify.submitFailed') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── 分组标签 ──
  const handdrawnTags = ARTIST_TAGS.filter(t => t.category === 'handdrawn');
  const digitalTags = ARTIST_TAGS.filter(t => t.category === 'digital');

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* 进度条 */}
      {step <= 3 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all",
                  step > s
                    ? "bg-primary border-primary text-primary-foreground"
                    : step === s
                    ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/30"
                    : "bg-muted border-border text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                <span className={cn(
                  "text-xs text-center font-medium leading-tight hidden sm:block",
                  step === s ? "text-primary" : "text-muted-foreground"
                )}>
                  {s === 1 ? t('verify.step1.title')
                    : s === 2 ? t('verify.step2.title')
                    : t('verify.step3.title').split('，')[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-1.5 bg-muted rounded-full mx-5">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 步骤 1：选择标签 ── */}
      {step === 1 && (
        <Card className="sketch-card border-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-2xl font-black">{t('verify.step1.title')}</CardTitle>
            </div>
            <CardDescription>{t('verify.step1.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 手绘类 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brush className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{t('verify.step1.handdrawn')}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {handdrawnTags.map((tag: ArtistTag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                      selectedTags.includes(tag.key)
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {language === 'en' ? tag.en : tag.zh}
                  </button>
                ))}
              </div>
            </div>

            {/* 板绘类 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{t('verify.step1.digital')}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {digitalTags.map((tag: ArtistTag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                      selectedTags.includes(tag.key)
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    {language === 'en' ? tag.en : tag.zh}
                  </button>
                ))}
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-xs text-muted-foreground mr-1 self-center">{t('verify.selectedTags')}</span>
                {selectedTags.map(k => {
                  const found = ARTIST_TAGS.find(t => t.key === k);
                  return (
                    <span key={k} className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg">
                      {language === 'en' ? found?.en : found?.zh}
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 font-bold cat-button" onClick={handleNext}>
              {t('verify.next')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── 步骤 2：上传作品 ── */}
      {step === 2 && (
        <Card className="sketch-card border-2">
          <CardHeader>
            <CardTitle className="text-2xl font-black">{t('verify.step2.title')}</CardTitle>
            <CardDescription>{t('verify.step2.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {artworkUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm">
                  <img src={url} alt={`artwork-${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeArtwork(idx)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-card/80 backdrop-blur-sm rounded-lg text-[10px] font-bold">
                    {idx + 1}
                  </div>
                </div>
              ))}
              {artworkUrls.length < 9 && (
                <ImageUpload
                  onUploadSuccess={handleUploadSuccess}
                  folder={`artworks/${profile.id}`}
                  label={t('verify.uploadTitle')}
                  aspectRatio="square"
                />
              )}
            </div>

            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border text-sm",
              artworkUrls.length >= 3
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-orange-50 border-orange-200 text-orange-700"
            )}>
              {artworkUrls.length >= 3
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <Clock className="w-4 h-4 shrink-0" />}
              <span className="font-medium">
                {artworkUrls.length >= 3
                  ? `${artworkUrls.length} ${t('verify.uploadedReady')}`
                  : `${t('verify.step2.minHint')} (${artworkUrls.length}/3)`}
              </span>
            </div>

            {/* 审核未通过反馈 */}
            {profile.verification_status === 'rejected' && (
              <div className="p-4 bg-destructive/5 text-destructive rounded-2xl text-sm border-2 border-destructive/20 flex gap-3">
                <X className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('verify.rejectedTitle')}</p>
                  <p className="text-xs opacity-80 mt-1">
                    {profile.verification_feedback || t('verify.rejectedDesc')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button variant="outline" className="h-12" onClick={() => setStep(1)} disabled={loading}>
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('verify.prev')}
            </Button>
            <Button
              className="flex-1 h-12 font-bold cat-button"
              onClick={handleNext}
              disabled={loading || artworkUrls.length < 3}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : t('verify.submit')}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── 步骤 3：提交完成 ── */}
      {step === 3 && (
        <Card className="sketch-card border-2 text-center">
          <CardContent className="py-16 space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">{t('verify.step3.title')}</h2>
              <p className="text-primary font-bold">{t('verify.step3.subtitle')}</p>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
              {t('verify.step3.desc')}
            </p>
            <Button onClick={() => navigate("/")} className="cat-button h-12 px-8 font-bold">
              {t('verify.step3.backHome')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
