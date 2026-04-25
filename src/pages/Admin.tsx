import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "@/db/api";
import { Profile, Artwork, ARTIST_TAGS, translateTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ShieldAlert, CheckCircle, XCircle, User, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [pendingArtists, setPendingArtists] = useState<(Profile & { artworks: Artwork[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      navigate("/");
      return;
    }
    loadPendingArtists();
  }, [profile]);

  const loadPendingArtists = async () => {
    setLoading(true);
    const { data } = await api.getPendingVerifications();
    setPendingArtists(data || []);
    setLoading(false);
  };

  const handleVerify = async (userId: string, status: 'verified' | 'rejected', feedback?: string) => {
    try {
      const { error } = await api.updateProfile(userId, {
        verification_status: status,
        verification_feedback: feedback,
      });
      if (error) throw error;
      toast.success(status === 'verified' ? t('admin.approveSuccess') : t('admin.rejectSuccess'));
      loadPendingArtists();
    } catch (err: any) {
      toast.error(t('admin.actionFailed') + ': ' + err.message);
    }
  };

  if (loading && pendingArtists.length === 0)
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{t('admin.title')}</h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="verifications" className="w-full">
        <TabsList className="grid w-fit grid-cols-2 mb-8 bg-muted/50 p-1 h-12 rounded-xl">
          <TabsTrigger value="verifications" className="px-8 rounded-lg">
            {t('admin.verificationTab')} ({pendingArtists.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="px-8 rounded-lg">
            {t('admin.reportTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="space-y-6">
          {pendingArtists.length === 0 ? (
            <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
              <p className="text-muted-foreground">{t('admin.noVerifications')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pendingArtists.map((artist) => {
                const knownTags = (artist.artist_tags || []).filter(k => ARTIST_TAGS.find(tag => tag.key === k));
                return (
                  <Card key={artist.id} className="sketch-card overflow-hidden flex flex-col">
                    <CardHeader className="p-4 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{artist.username}</CardTitle>
                          {/* 优先显示 artist_tags，否则回退到 style_preference */}
                          {knownTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {knownTags.map(k => (
                                <span key={k} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {translateTag(k, language)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {artist.style_preference === 'digital'
                                ? t('admin.styleDigital')
                                : t('admin.styleHanddrawn')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{t('admin.pending')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {artist.artworks?.map((art) => (
                          <div key={art.id} className="aspect-square rounded-lg overflow-hidden border">
                            <img src={art.image_url} className="w-full h-full object-cover" alt={art.title} />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">{t('admin.artistBio')}</p>
                        <p className="text-sm line-clamp-3 italic">
                          "{artist.bio || t('admin.defaultBio')}"
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 gap-3">
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600 cat-button"
                        onClick={() => handleVerify(artist.id, 'verified')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> {t('admin.approveBtn')}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          const feedback = prompt(t('admin.rejectPrompt'));
                          if (feedback) handleVerify(artist.id, 'rejected', feedback);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> {t('admin.rejectBtn')}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted/40 mb-6">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold">{t('admin.noReports')}</h3>
            <p className="text-muted-foreground mt-2">{t('admin.noReportsDesc')}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

