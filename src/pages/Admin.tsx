import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "@/db/api";
import { supabase } from "@/db/supabase";
import { Profile, Artwork, ARTIST_TAGS, translateTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ShieldAlert, CheckCircle, XCircle, User, AlertTriangle,
         Bot, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm } from "react-hook-form";

interface BotKeyword {
  id: string;
  keyword: string;
  reply: string;
  priority: number;
  show_as_quick_question: boolean;
  created_at: string;
  updated_at: string;
}

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

  // ────────────────────── 关键词管理 ──────────────────────
  function KeywordManager() {
    const [keywords, setKeywords] = useState<BotKeyword[]>([]);
    const [kwLoading, setKwLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<BotKeyword | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm<{ keyword: string; reply: string; priority: number; show_as_quick_question: boolean }>({
      defaultValues: { keyword: "", reply: "", priority: 0, show_as_quick_question: false },
    });

    const loadKeywords = async () => {
      setKwLoading(true);
      const { data, error } = await (supabase as any)
        .from("bot_keywords")
        .select("*")
        .order("priority", { ascending: false });
      if (!error) setKeywords(data || []);
      setKwLoading(false);
    };

    useEffect(() => { loadKeywords(); }, []);

    const openCreate = () => {
      setEditTarget(null);
      form.reset({ keyword: "", reply: "", priority: 0, show_as_quick_question: false });
      setDialogOpen(true);
    };

    const openEdit = (kw: BotKeyword) => {
      setEditTarget(kw);
      form.reset({ keyword: kw.keyword, reply: kw.reply, priority: kw.priority, show_as_quick_question: kw.show_as_quick_question });
      setDialogOpen(true);
    };

    const handleSave = async (values: { keyword: string; reply: string; priority: number; show_as_quick_question: boolean }) => {
      if (!values.keyword.trim() || !values.reply.trim()) {
        toast.error(t("admin.keywords.emptyCheck"));
        return;
      }
      setSaving(true);
      try {
        if (editTarget) {
          const { error } = await (supabase as any)
            .from("bot_keywords")
            .update({ keyword: values.keyword, reply: values.reply, priority: values.priority, show_as_quick_question: values.show_as_quick_question })
            .eq("id", editTarget.id);
          if (error) throw error;
          toast.success(t("admin.keywords.updated"));
        } else {
          const { error } = await (supabase as any)
            .from("bot_keywords")
            .insert({ keyword: values.keyword, reply: values.reply, priority: values.priority, show_as_quick_question: values.show_as_quick_question });
          if (error) throw error;
          toast.success(t("admin.keywords.added"));
        }
        setDialogOpen(false);
        loadKeywords();
      } catch (err: any) {
        toast.error(t("admin.keywords.saveFailed") + "：" + (err.message || ""));
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (id: string) => {
      const { error } = await (supabase as any).from("bot_keywords").delete().eq("id", id);
      if (error) { toast.error(t("admin.keywords.deleteFailed")); return; }
      toast.success(t("admin.keywords.deleted"));
      setDeleteId(null);
      loadKeywords();
    };

    const adjustPriority = async (kw: BotKeyword, delta: number) => {
      const { error } = await (supabase as any)
        .from("bot_keywords")
        .update({ priority: kw.priority + delta })
        .eq("id", kw.id);
      if (!error) loadKeywords();
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-black text-lg">{t("admin.keywords.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("admin.keywords.desc")}</p>
            </div>
          </div>
          <Button className="cat-button gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {t("admin.keywords.add")}
          </Button>
        </div>

        {kwLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : keywords.length === 0 ? (
          <Card className="sketch-card border-2">
            <CardContent className="py-20 text-center text-muted-foreground">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{t("admin.keywords.empty")}</p>
              <p className="text-sm mt-1">{t("admin.keywords.emptyDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keywords.map((kw) => (
              <Card key={kw.id} className="sketch-card border-2 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* 优先级控制 */}
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <button
                        onClick={() => adjustPriority(kw, 10)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-primary">{kw.priority}</span>
                      <button
                        onClick={() => adjustPriority(kw, -10)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                          #{kw.keyword}
                        </Badge>
                        {kw.show_as_quick_question && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            ⚡ {t("quickQ.title")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                        {kw.reply}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(kw)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(kw.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 新增 / 编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editTarget ? t("admin.keywords.editTitle") : t("admin.keywords.addTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="keyword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.keywords.keywordLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("admin.keywords.keywordPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.keywords.replyLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("admin.keywords.replyPlaceholder")}
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.keywords.priorityLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="show_as_quick_question"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            ⚡ {t("admin.keywords.showQuick")}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            {t("admin.keywords.showQuickTip")}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t("admin.keywords.cancel")}
                  </Button>
                  <Button type="submit" className="cat-button" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("admin.keywords.deleteTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">{t("admin.keywords.deleteDesc")}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>{t("admin.keywords.cancel")}</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
                {t("admin.keywords.confirmDelete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
        <TabsList className="grid w-fit grid-cols-3 mb-8 bg-muted/50 p-1 h-12 rounded-xl">
          <TabsTrigger value="verifications" className="px-8 rounded-lg">
            {t('admin.verificationTab')} ({pendingArtists.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="px-8 rounded-lg">
            {t('admin.reportTab')}
          </TabsTrigger>
          <TabsTrigger value="keywords" className="px-8 rounded-lg">
            {t("admin.keywords.tab")}
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
        <TabsContent value="keywords" className="space-y-6">
          <KeywordManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

