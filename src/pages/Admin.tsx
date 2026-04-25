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

    const form = useForm<{ keyword: string; reply: string; priority: number }>({
      defaultValues: { keyword: "", reply: "", priority: 0 },
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
      form.reset({ keyword: "", reply: "", priority: 0 });
      setDialogOpen(true);
    };

    const openEdit = (kw: BotKeyword) => {
      setEditTarget(kw);
      form.reset({ keyword: kw.keyword, reply: kw.reply, priority: kw.priority });
      setDialogOpen(true);
    };

    const handleSave = async (values: { keyword: string; reply: string; priority: number }) => {
      if (!values.keyword.trim() || !values.reply.trim()) {
        toast.error("关键词和回复内容不能为空");
        return;
      }
      setSaving(true);
      try {
        if (editTarget) {
          const { error } = await (supabase as any)
            .from("bot_keywords")
            .update({ keyword: values.keyword, reply: values.reply, priority: values.priority })
            .eq("id", editTarget.id);
          if (error) throw error;
          toast.success("关键词已更新");
        } else {
          const { error } = await (supabase as any)
            .from("bot_keywords")
            .insert({ keyword: values.keyword, reply: values.reply, priority: values.priority });
          if (error) throw error;
          toast.success("关键词已添加");
        }
        setDialogOpen(false);
        loadKeywords();
      } catch (err: any) {
        toast.error("保存失败：" + (err.message || "未知错误"));
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (id: string) => {
      const { error } = await (supabase as any).from("bot_keywords").delete().eq("id", id);
      if (error) { toast.error("删除失败"); return; }
      toast.success("已删除");
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
              <h3 className="font-black text-lg">蜗牛猫关键词回复管理</h3>
              <p className="text-xs text-muted-foreground">优先级越高的关键词越先被匹配。消息中含多个关键词时，返回优先级最高的回复。</p>
            </div>
          </div>
          <Button className="cat-button gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            新增关键词
          </Button>
        </div>

        {kwLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : keywords.length === 0 ? (
          <Card className="sketch-card border-2">
            <CardContent className="py-20 text-center text-muted-foreground">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">暂无关键词</p>
              <p className="text-sm mt-1">点击"新增关键词"添加第一条回复规则</p>
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
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                          #{kw.keyword}
                        </Badge>
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
              <DialogTitle>{editTarget ? "编辑关键词回复" : "新增关键词回复"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="keyword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>关键词（用户消息包含此词即触发）</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：认证、价格、退款..." {...field} />
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
                      <FormLabel>自动回复内容</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="输入蜗牛猫小助手的回复内容..."
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
                      <FormLabel>优先级（数字越大越优先匹配）</FormLabel>
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    取消
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
              <DialogTitle>确认删除</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">删除后该关键词将不再触发自动回复，确认继续？</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
                确认删除
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
            关键词回复
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

