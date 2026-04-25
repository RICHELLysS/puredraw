import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/db/api";
import { Profile, Message, Commission, CommissionStatus } from "@/types";
import { supabase } from "@/db/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Plus, Calendar, CreditCard, ChevronRight, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Chat() {
  const { id: otherUserId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 约稿相关
  const [activeCommission, setActiveCommission] = useState<Commission | null>(null);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    description: "",
    price: 70,
    sketch_deadline: format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
    final_deadline: format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (!profile || !otherUserId) return;

    const initChat = async () => {
      // 1. 获取对方信息
      const { data: uData } = await api.getProfile(otherUserId);
      setOtherUser(uData);

      // 2. 获取历史消息
      const { data: mData } = await api.getChatMessages(profile.id, otherUserId);
      setMessages(mData || []);

      // 3. 获取正在进行的约稿
      const { data: cData } = await api.getCommissions(profile.id, profile.role);
      const active = (cData || []).find(c => 
        (c.artist_id === otherUserId || c.client_id === otherUserId) && 
        !['completed', 'refunded'].includes(c.status)
      );
      setActiveCommission(active || null);

      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    initChat();

    // 4. 实时监听新消息
    const channel = supabase
      .channel(`chat:${profile.id}:${otherUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `or(and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id}))`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 50);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, otherUserId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !profile || !otherUserId) return;

    const { error } = await api.sendMessage(profile.id, otherUserId, newMessage);
    if (error) {
      toast.error("消息发送失败");
    } else {
      setNewMessage("");
    }
  };

  const handleCreateCommission = async () => {
    if (!profile || !otherUserId || !otherUser) return;
    if (commForm.price < 70) return toast.error("价格不得低于 70 元");

    setLoading(true);
    try {
      const { data, error } = await api.createCommission({
        client_id: profile.id,
        artist_id: otherUserId,
        description: commForm.description,
        price: commForm.price,
        deposit: 30,
        sketch_deadline: new Date(commForm.sketch_deadline).toISOString(),
        final_deadline: new Date(commForm.final_deadline).toISOString(),
      });

      if (error) throw error;
      
      setActiveCommission(data);
      setIsCommissionDialogOpen(false);
      
      // 发送一条提示消息
      await api.sendMessage(profile.id, otherUserId, `[系统消息] 我发起了一份约稿需求，请查收。需求描述：${commForm.description.slice(0, 20)}...`);
      toast.success("约稿需求已发送");
    } catch (err: any) {
      toast.error("发起约稿失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCommission = async () => {
    if (!activeCommission) return;
    setLoading(true);
    try {
      await api.updateCommissionStatus(activeCommission.id, 'agreed');
      setActiveCommission({ ...activeCommission, status: 'agreed' });
      await api.sendMessage(profile!.id, otherUserId!, `[系统消息] 我已接受您的约稿需求，请支付定金。`);
      toast.success("已接受约稿");
    } catch (err: any) {
      toast.error("操作失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !otherUser) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto sketch-card bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${otherUser?.id}`)}>
          <Avatar>
            <AvatarImage src={otherUser?.avatar_url || ""} />
            <AvatarFallback>{otherUser?.username?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold">{otherUser?.username}</h3>
            <p className="text-xs text-muted-foreground">{otherUser?.role === 'artist' ? '认证画师' : '约稿人'}</p>
          </div>
        </div>
        
        {/* Active Commission Summary */}
        {activeCommission && (
          <div 
            className="hidden md:flex items-center gap-4 p-2 px-4 rounded-xl border bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => navigate(`/commission/${activeCommission.id}`)}
          >
            <div className="text-xs text-right">
              <p className="font-bold text-primary">当前约稿</p>
              <p className="text-muted-foreground">{getStatusText(activeCommission.status)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 pb-4">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>打个招呼吧，开启一段纯净的艺术交流 🐾</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender_id === profile?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] space-y-1 ${msg.sender_id === profile?.id ? "items-end" : "items-start"}`}>
                      <div className={`p-3 rounded-2xl text-sm ${
                        msg.sender_id === profile?.id 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted rounded-tl-none"
                      }`}>
                        {msg.content.startsWith('[系统消息]') ? (
                          <div className="flex items-center gap-2 italic">
                            <AlertCircle className="w-4 h-4" />
                            {msg.content}
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-muted/10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-full h-12 w-12 border-2">
                    <Plus className="h-6 w-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>发起约稿需求</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>需求描述</Label>
                      <Textarea 
                        placeholder="请详细描述您的约稿需求，如风格、构图、用途等..." 
                        rows={4}
                        value={commForm.description}
                        onChange={(e) => setCommForm({...commForm, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>约稿价格 (起价 ¥70)</Label>
                        <Input 
                          type="number" 
                          min={70} 
                          value={commForm.price}
                          onChange={(e) => setCommForm({...commForm, price: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>定金 (固定)</Label>
                        <Input disabled value="¥30" className="bg-muted" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>草图截止时间</Label>
                        <Input 
                          type="date" 
                          value={commForm.sketch_deadline}
                          onChange={(e) => setCommForm({...commForm, sketch_deadline: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>成图截止时间</Label>
                        <Input 
                          type="date" 
                          value={commForm.final_deadline}
                          onChange={(e) => setCommForm({...commForm, final_deadline: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-12 text-lg font-bold cat-button" onClick={handleCreateCommission} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : "发送需求"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Input 
                placeholder="在此输入消息..." 
                className="flex-1 h-12 rounded-full border-2 focus-visible:ring-primary"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <Button type="submit" size="icon" className="shrink-0 rounded-full h-12 w-12 cat-button">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar - Desktop Only */}
        {activeCommission && (
          <div className="hidden lg:flex w-72 border-l p-4 bg-muted/5 flex-col gap-4 overflow-y-auto">
            <h4 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">当前约稿状态</h4>
            <Card className="sketch-card p-0 shadow-sm border-2">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  约稿进度
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold">{getStatusText(activeCommission.status)}</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${getStatusProgress(activeCommission.status)}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  <p className="flex justify-between"><span>总价:</span> <span className="font-bold">¥{activeCommission.price}</span></p>
                  <p className="flex justify-between"><span>定金:</span> <span className="text-primary font-bold">¥{activeCommission.deposit}</span></p>
                  <p className="flex justify-between"><span>截止时间:</span> <span>{format(new Date(activeCommission.final_deadline), 'MM-dd')}</span></p>
                </div>

                {activeCommission.status === 'pending_agreement' && profile?.id === activeCommission.artist_id && (
                  <Button className="w-full cat-button font-bold" onClick={handleAcceptCommission}>
                    接受并启动约稿
                  </Button>
                )}
                
                {activeCommission.status === 'agreed' && profile?.id === activeCommission.client_id && (
                  <Button className="w-full cat-button font-bold" onClick={() => navigate(`/commission/${activeCommission.id}`)}>
                    支付定金 (¥30)
                  </Button>
                )}

                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate(`/commission/${activeCommission.id}`)}>
                  查看完整详情
                </Button>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <div className="space-y-2 mt-auto">
              <p className="text-[10px] text-muted-foreground text-center">约稿由纯画平台全程担保 🐾</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusText(status: CommissionStatus) {
  const map: Record<string, string> = {
    pending_agreement: "协商需求中",
    agreed: "待付定金",
    deposit_paid: "制作草图中",
    sketch_uploaded: "草图确认中",
    final_uploaded: "制作成图中",
    completed: "已完成",
    reported: "反馈下架审核中",
    refunded: "已退款"
  };
  return map[status] || status;
}

function getStatusProgress(status: CommissionStatus) {
  const map: Record<string, number> = {
    pending_agreement: 10,
    agreed: 20,
    deposit_paid: 40,
    sketch_uploaded: 60,
    final_uploaded: 80,
    completed: 100,
    reported: 90,
    refunded: 0
  };
  return map[status] || 0;
}
