import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/db/api";
import { Post, Comment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageCircle, Heart, Share2, Plus, ImageIcon, Loader2, Clock, Send, Sparkles, Image as ImageIconIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { ImageUpload } from "@/components/ImageUpload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Community() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await api.getPosts();
    setPosts(data || []);
    setLoading(false);
  };

  const handleUploadSuccess = (url: string) => {
    setUploadedImages(prev => [...prev, url]);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!profile) return toast.error("请先登录");
    if (!newPost.title || !newPost.content) return toast.error("请填写标题和内容");

    setIsSubmitting(true);
    try {
      const { error } = await api.createPost({
        author_id: profile.id,
        title: newPost.title,
        content: newPost.content,
        image_urls: uploadedImages
      });

      if (error) throw error;
      toast.success(t('community.publishSuccess'));
      setNewPost({ title: "", content: "" });
      setUploadedImages([]);
      setIsPostDialogOpen(false);
      loadPosts();
    } catch (err: any) {
      toast.error(t('community.publishFailed') + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary/10 p-8 rounded-3xl border-2 border-primary/20">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full font-bold text-xs">
            <Sparkles className="w-3 h-3" />
            {t('community.title')}
          </div>
          <h1 className="text-3xl font-black tracking-tight">{t('community.title')}</h1>
          <p className="text-muted-foreground">{t('community.subtitle')}</p>
        </div>
        
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-14 px-8 text-lg font-bold cat-button">
              <Plus className="w-5 h-5 mr-2" /> {t('community.newPost')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('community.newPost')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Input 
                  placeholder={t('community.titlePlaceholder')}
                  className="h-12 text-lg font-bold border-2 rounded-xl"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Textarea 
                  placeholder={t('community.postPlaceholder')}
                  className="min-h-[150px] border-2 rounded-xl p-4"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold">{t('community.addImage')} ({t('community.maxImages')})</p>
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border-2 border-primary/20">
                      <img src={url} alt="uploaded" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {uploadedImages.length < 4 && (
                    <ImageUpload 
                      onUploadSuccess={handleUploadSuccess}
                      folder="community"
                      label={t('community.uploadImage')}
                      aspectRatio="video"
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full h-12 text-lg font-bold cat-button" onClick={handleCreatePost} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : t('community.publish')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-8">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="sketch-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-muted" />
                  <Skeleton className="h-3 w-16 bg-muted" />
                </div>
              </div>
              <Skeleton className="h-6 w-1/2 bg-muted" />
              <Skeleton className="h-20 w-full bg-muted" />
            </Card>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-8">
          {posts.map((post) => (
            <Card key={post.id} className="sketch-card overflow-hidden hover:shadow-lg transition-shadow border-2">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={post.author?.avatar_url || ""} />
                  <AvatarFallback>{post.author?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{post.author?.username}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: language === 'en' ? enUS : zhCN })}
                  </div>
                </div>
                <Badge variant="outline" className="h-6">{t('community.original')}</Badge>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <h2 className="text-2xl font-black tracking-tight">{post.title}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                {post.image_urls && post.image_urls.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {post.image_urls.map((url, idx) => (
                      <img key={idx} src={url} className="rounded-2xl border-2 w-full object-cover aspect-video" />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Button variant="ghost" size="sm" className="hover:text-primary h-9" onClick={() => toast.info(t('community.likedMsg'))}>
                    <Heart className="w-4 h-4 mr-2" /> {t('community.like')}
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-primary h-9" onClick={() => toast.info(t('community.commentSoon'))}>
                    <MessageCircle className="w-4 h-4 mr-2" /> {t('community.comment')}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="h-9" onClick={() => toast.info(t('community.shareSuccess'))}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-40 border-2 border-dashed rounded-3xl bg-muted/20">
          <h3 className="text-2xl font-bold">{t('community.noPost')}</h3>
          <p className="text-muted-foreground mt-2">{t('community.noPostDesc')}</p>
        </div>
      )}
    </div>
  );
}
