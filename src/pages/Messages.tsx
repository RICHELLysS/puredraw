import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/db/api";
import { Message, Profile, Commission, CommissionStatus } from "@/types";
import { supabase } from "@/db/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageCircle, ChevronRight, Clock, ShieldCheck, Send, Plus,
         CreditCard, AlertCircle, Bot, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

const AI_ASSISTANT_ID = "00000000-0000-0000-0000-000000000001";

interface ChatSession {
  user: Profile;
  lastMessage: Message;
}

function getStatusText(status: CommissionStatus, t: (k: string) => string) {
  const map: Record<string, string> = {
    pending_agreement: t("chat.statusNegotiating"),
    agreed: t("chat.statusAgreed"),
    deposit_paid: t("chat.statusSketching"),
    sketch_uploaded: t("chat.statusSketchReview"),
    final_uploaded: t("chat.statusFinalizing"),
    completed: t("chat.statusCompleted"),
    reported: t("chat.statusDisputed"),
    refunded: t("chat.statusRefunded"),
  };
  return map[status] || status;
}

function getStatusProgress(status: CommissionStatus) {
  const map: Record<string, number> = {
    pending_agreement: 10, agreed: 20, deposit_paid: 40, sketch_uploaded: 60,
    final_uploaded: 80, completed: 100, reported: 90, refunded: 0,
  };
  return map[status] || 0;
}

export default function Messages() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id: chatUserId } = useParams<{ id: string }>();
  const { t, language } = useLanguage();

  // ── 会话列表 ──
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // ── 当前选中对话 ──
  const [selectedUserId, setSelectedUserId] = useState<string | null>(chatUserId || null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  // 约稿相关
  const [activeCommission, setActiveCommission] = useState<Commission | null>(null);
  const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    description: "",
    price: 70,
    sketch_deadline: format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"),
    final_deadline: format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"),
  });

  // 移动端：是否显示聊天窗口
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // 快捷问题
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── 快捷问题加载（AI 对话时从 bot_keywords 读取） ──
  useEffect(() => {
    const loadQuickQuestions = async () => {
      const { data } = await (supabase as any)
        .from("bot_keywords")
        .select("keyword")
        .eq("show_as_quick_question", true)
        .order("priority", { ascending: false })
        .limit(6);
      if (data) setQuickQuestions((data as { keyword: string }[]).map((d) => d.keyword));
    };
    loadQuickQuestions();
  }, []);
  const dateLocale = language === "en" ? enUS : zhCN;

  // ── 加载会话列表 ──
  const loadChats = useCallback(async () => {
    if (!profile) return;
    setListLoading(true);
    const { data } = await api.getRecentChats(profile.id);
    const list: ChatSession[] = data || [];

    // 确保 AI 助手始终置顶（即使还没有消息也检查是否有 profile）
    const hasAI = list.some((c) => c.user.id === AI_ASSISTANT_ID);
    if (!hasAI) {
      const { data: aiProfile } = await api.getProfile(AI_ASSISTANT_ID);
      if (aiProfile) {
        // 构造一条占位 session（无消息时）
        list.unshift({
          user: aiProfile,
          lastMessage: {
            id: "placeholder",
            sender_id: AI_ASSISTANT_ID,
            receiver_id: profile.id,
            content: t("messages.aiWelcomePreview"),
            commission_id: null,
            is_read: true,
            created_at: new Date().toISOString(),
          },
        });
      }
    } else {
      // 已有 AI 消息，确保它排在最前
      const aiIdx = list.findIndex((c) => c.user.id === AI_ASSISTANT_ID);
      if (aiIdx > 0) {
        const [ai] = list.splice(aiIdx, 1);
        list.unshift(ai);
      }
    }

    setChats(list);
    setListLoading(false);

    // 首次加载时自动选中 AI 助手（若 URL 没有指定对话对象）
    setSelectedUserId(prev => {
      if (!prev && list.length > 0) {
        const aiChat = list.find(c => c.user.id === AI_ASSISTANT_ID);
        return aiChat ? aiChat.user.id : list[0].user.id;
      }
      return prev;
    });
  }, [profile, t]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── 当 URL 参数变化时同步选中状态 ──
  useEffect(() => {
    if (chatUserId) {
      setSelectedUserId(chatUserId);
      setMobileShowChat(true);
    }
  }, [chatUserId]);

  // ── 加载选中对话的消息 ──
  useEffect(() => {
    if (!profile || !selectedUserId) return;

    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const initChat = async () => {
      setChatLoading(true);
      const [{ data: uData }, { data: mData }, { data: cData }] = await Promise.all([
        api.getProfile(selectedUserId),
        api.getChatMessages(profile.id, selectedUserId),
        api.getCommissions(profile.id, profile.role),
      ]);

      setOtherUser(uData);
      setMessages(mData || []);

      const active = (cData || []).find(
        (c) =>
          (c.artist_id === selectedUserId || c.client_id === selectedUserId) &&
          !["completed", "refunded"].includes(c.status)
      );
      setActiveCommission(active || null);
      setChatLoading(false);
      setTimeout(() => scrollToBottom(), 100);
    };

    initChat();

    // Realtime 监听
    channelRef = supabase
      .channel(`msgs:${profile.id}:${selectedUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${profile.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === selectedUserId) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => scrollToBottom(), 50);
        }
        loadChats();
      })
      .subscribe();

    return () => {
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [profile, selectedUserId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // ── 选择会话 ──
  const selectChat = (userId: string) => {
    setSelectedUserId(userId);
    setMobileShowChat(true);
    navigate(`/messages/${userId}`, { replace: true });
  };

  // ── 快捷问题点击 ──
  const handleQuickQuestion = (keyword: string) => {
    setNewMessage(keyword);
    // 延迟一帧确保 state 已更新，直接调用 handleSend 逻辑
    setTimeout(() => {
      if (!profile || !selectedUserId) return;
      const msgContent = keyword;
      const optimistic = {
        id: `opt-${Date.now()}`,
        sender_id: profile.id,
        receiver_id: selectedUserId,
        content: msgContent,
        commission_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setNewMessage("");
      setTimeout(() => scrollToBottom(), 50);
      api.sendMessage(profile.id, selectedUserId, msgContent).then(({ error }) => {
        if (error) {
          toast.error(t("messages.sendFailed"));
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          return;
        }
        supabase.functions.invoke("ai-auto-reply", {
          body: { user_id: profile.id, content: msgContent },
        }).then(({ error: fnErr }) => {
          if (fnErr) fnErr.context?.text?.().then((d: string) => console.error("ai-auto-reply:", d));
        });
        loadChats();
      });
    }, 0);
  };

  // ── 发送消息 ──
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !profile || !selectedUserId) return;
    const msgContent = newMessage;
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      sender_id: profile.id,
      receiver_id: selectedUserId,
      content: msgContent,
      commission_id: null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    setTimeout(() => scrollToBottom(), 50);

    const { error } = await api.sendMessage(profile.id, selectedUserId, msgContent);
    if (error) {
      toast.error(t("messages.sendFailed"));
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      return;
    }

    // 向 AI bot 发消息后触发关键词自动回复
    if (isAiChat) {
      const { error: fnErr } = await supabase.functions.invoke("ai-auto-reply", {
        body: { user_id: profile.id, content: msgContent },
      });
      if (fnErr) {
        const detail = await fnErr?.context?.text?.();
        console.error("ai-auto-reply error:", detail || fnErr.message);
      }
    }

    loadChats();
  };

  // ── 发起约稿 ──
  const handleCreateCommission = async () => {
    if (!profile || !selectedUserId || !otherUser) return;
    if (commForm.price < 70) return toast.error(t("messages.priceMin"));
    setChatLoading(true);
    try {
      const { data, error } = await api.createCommission({
        client_id: profile.id,
        artist_id: selectedUserId,
        description: commForm.description,
        price: commForm.price,
        deposit: 30,
        sketch_deadline: new Date(commForm.sketch_deadline).toISOString(),
        final_deadline: new Date(commForm.final_deadline).toISOString(),
      });
      if (error) throw error;
      setActiveCommission(data);
      setIsCommDialogOpen(false);
      await api.sendMessage(
        profile.id,
        selectedUserId,
        `${t("chat.systemMsgPrefix")} ${t("chat.commSentMsg")}：${commForm.description.slice(0, 20)}...`
      );
      toast.success(t("messages.commissionSent"));
    } catch (err: any) {
      toast.error(t("messages.commissionFailed") + ": " + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  // ── 接受约稿 ──
  const handleAcceptCommission = async () => {
    if (!activeCommission || !profile || !selectedUserId) return;
    setChatLoading(true);
    try {
      await api.updateCommissionStatus(activeCommission.id, "agreed");
      setActiveCommission({ ...activeCommission, status: "agreed" });
      await api.sendMessage(profile.id, selectedUserId, t("commission.toast.acceptMsg"));
      toast.success(t("messages.commissionAccepted"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const isAiChat = selectedUserId === AI_ASSISTANT_ID;

  // ── 左侧会话列表 ──
  const ConversationList = (
    <div className="flex flex-col h-full">
      {/* 列表顶部 */}
      <div className="p-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-black text-lg">{t("messages.title")}</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t("messages.subtitle")}</p>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        {listLoading ? (
          <div className="space-y-2 p-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2.5 w-36 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground px-4 text-center">
            <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-bold">{t("messages.noMessages")}</p>
            <p className="text-xs mt-1">{t("messages.noMessagesDesc")}</p>
            <Button size="sm" className="mt-4 cat-button" onClick={() => navigate("/artists")}>
              {t("messages.findArtists")}
            </Button>
          </div>
        ) : (
          <div className="py-2">
            {chats.map((chat) => {
              const isAI = chat.user.id === AI_ASSISTANT_ID;
              const isSelected = selectedUserId === chat.user.id;
              const hasUnread = !chat.lastMessage.is_read && chat.lastMessage.receiver_id === profile.id;

              return (
                <button
                  key={chat.user.id}
                  onClick={() => selectChat(chat.user.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-muted/50
                    ${isSelected ? "bg-primary/10 border-r-2 border-primary" : ""}
                  `}
                >
                  <div className="relative shrink-0">
                    <Avatar className={`h-12 w-12 border-2 ${isAI ? "border-primary/50" : "border-muted"}`}>
                      <AvatarImage src={chat.user.avatar_url || ""} />
                      <AvatarFallback className={isAI ? "bg-primary/10 text-primary" : ""}>
                        {isAI ? <Bot className="w-5 h-5" /> : chat.user.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-bold text-sm truncate ${isSelected ? "text-primary" : ""}`}>
                          {chat.user.username}
                        </span>
                        {isAI && (
                          <Badge className="text-[9px] h-4 px-1 bg-primary/15 text-primary border-primary/20 shrink-0">
                            AI bot
                          </Badge>
                        )}
                      </div>
                      {chat.lastMessage.id !== "placeholder" && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(chat.lastMessage.created_at), {
                            addSuffix: false,
                            locale: dateLocale,
                          })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${hasUnread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {chat.lastMessage.content}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* 底部平台保障 */}
      <div className="shrink-0 border-t p-3 bg-muted/20">
        <div className="flex items-center justify-center gap-4 text-center">
          <div>
            <p className="text-xs font-black text-primary">{t("messages.noAI")}</p>
            <p className="text-[9px] text-muted-foreground">{t("messages.noAIDesc")}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-xs font-black text-primary">{t("messages.depositBadge")}</p>
            <p className="text-[9px] text-muted-foreground">{t("messages.depositBadgeDesc")}</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-xs font-black text-primary">{t("messages.fastReply")}</p>
            <p className="text-[9px] text-muted-foreground">{t("messages.fastReplyDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 右侧聊天窗口 ──
  const ChatPanel = (
    <div className="flex flex-col h-full">
      {selectedUserId && otherUser ? (
        <>
          {/* 聊天顶栏 */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/10 shrink-0">
            <div className="flex items-center gap-3">
              {/* 移动端返回按钮 */}
              <button
                className="lg:hidden p-1 rounded-lg hover:bg-muted mr-1"
                onClick={() => {
                  setMobileShowChat(false);
                  navigate("/messages", { replace: true });
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => !isAiChat && navigate(`/profile/${otherUser.id}`)}
              >
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={otherUser.avatar_url || ""} />
                  <AvatarFallback className={isAiChat ? "bg-primary/10 text-primary" : ""}>
                    {isAiChat ? <Bot className="w-4 h-4" /> : otherUser.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm">{otherUser.username}</h3>
                    {isAiChat && (
                      <Badge className="text-[9px] h-4 px-1 bg-primary/15 text-primary border-primary/20">
                        AI bot
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAiChat
                      ? t("messages.aiSubtitle")
                      : otherUser.role === "artist"
                      ? t("messages.artist")
                      : t("messages.client")}
                  </p>
                </div>
              </div>
            </div>

            {/* 当前约稿摘要 */}
            {activeCommission && !isAiChat && (
              <div
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-primary/5 cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => navigate(`/commission/${activeCommission.id}`)}
              >
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-primary">{t("messages.activeCommission")}</span>
                <span className="text-muted-foreground">{getStatusText(activeCommission.status, t as (k: string) => string)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* 消息区域 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {chatLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <p>{t("chat.sayHi")}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === profile.id;
                const isSystem = msg.content.startsWith("[系统消息]") || msg.content.startsWith("[System]");
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <Avatar className="h-7 w-7 mr-2 mt-1 shrink-0 border border-muted">
                        <AvatarImage src={otherUser?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {isAiChat ? <Bot className="w-3 h-3" /> : otherUser?.username?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[72%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isSystem
                          ? "bg-muted/60 text-muted-foreground italic border text-xs flex items-center gap-1.5"
                          : isMine
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card border rounded-tl-none shadow-sm"
                      }`}>
                        {isSystem && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        {format(new Date(msg.created_at), "HH:mm", { locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 约稿状态侧边栏（内嵌于聊天底部以上的右侧区域） */}
          {activeCommission && !isAiChat && (
            <div className="hidden xl:block border-t bg-muted/10 px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary">{t("messages.activeCommission")}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{getStatusText(activeCommission.status, t as (k: string) => string)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${getStatusProgress(activeCommission.status)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold">¥{activeCommission.price}</span>
                  {activeCommission.status === "pending_agreement" && profile.id === activeCommission.artist_id && (
                    <Button size="sm" className="h-7 text-xs cat-button" onClick={handleAcceptCommission}>
                      {t("messages.acceptCommission")}
                    </Button>
                  )}
                  {activeCommission.status === "agreed" && profile.id === activeCommission.client_id && (
                    <Button size="sm" className="h-7 text-xs cat-button" onClick={() => navigate(`/commission/${activeCommission.id}`)}>
                      {t("messages.payDeposit")}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/commission/${activeCommission.id}`)}>
                    {t("messages.viewDetail")} →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 输入区域 */}
          <div className="border-t bg-background shrink-0">
            {/* 快捷问题按钮区（仅 AI 对话时显示） */}
            {isAiChat && quickQuestions.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium tracking-wide uppercase flex items-center gap-1">
                  <span>⚡</span> {t("quickQ.title")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => handleQuickQuestion(kw)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/40 transition-all duration-150 active:scale-95"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                {/* 发起约稿按钮（非AI对话时显示）*/}
                {!isAiChat && profile.role === "client" && (
                  <Dialog open={isCommDialogOpen} onOpenChange={setIsCommDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-full h-10 w-10 border-2">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t("chat.commissionRequest")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t("chat.reqLabel")}</Label>
                          <Textarea
                            placeholder={t("chat.reqPlaceholder")}
                            rows={4}
                            value={commForm.description}
                            onChange={(e) => setCommForm({ ...commForm, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("chat.priceLabel")}</Label>
                            <Input
                              type="number"
                              min={70}
                              value={commForm.price}
                              onChange={(e) => setCommForm({ ...commForm, price: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("chat.depositFixed")}</Label>
                            <Input disabled value={t("chat.depositFixedValue")} className="bg-muted" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("chat.sketchDeadline")}</Label>
                            <Input
                              type="date"
                              value={commForm.sketch_deadline}
                              onChange={(e) => setCommForm({ ...commForm, sketch_deadline: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("chat.finalDeadline")}</Label>
                            <Input
                              type="date"
                              value={commForm.final_deadline}
                              onChange={(e) => setCommForm({ ...commForm, final_deadline: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="w-full h-12 text-lg font-bold cat-button"
                          onClick={handleCreateCommission}
                          disabled={chatLoading}
                        >
                          {chatLoading ? <Loader2 className="animate-spin" /> : t("chat.sendReq")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                <Input
                  placeholder={t("chat.inputPlaceholder")}
                  className="flex-1 h-10 rounded-full border-2 focus-visible:ring-primary text-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" className="shrink-0 rounded-full h-10 w-10 cat-button">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </>
      ) : (
        // 未选中任何对话时的占位
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
          <div className="p-6 rounded-full bg-muted/40">
            <MessageCircle className="w-12 h-12 opacity-30" />
          </div>
          <div className="text-center">
            <p className="font-bold">{t("messages.selectConversation")}</p>
            <p className="text-sm mt-1">{t("messages.selectConversationDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col py-4">
      {/* 页面容器：大屏左右分栏，小屏根据状态切换 */}
      <div className="flex flex-1 rounded-2xl border-2 overflow-hidden sketch-card bg-card shadow-md min-h-0">

        {/* ── 左侧会话列表 (3/10) ── */}
        <div className={`
          w-full lg:w-[30%] border-r shrink-0 flex flex-col
          ${mobileShowChat ? "hidden lg:flex" : "flex"}
        `}>
          {ConversationList}
        </div>

        {/* ── 右侧聊天窗口 (7/10) ── */}
        <div className={`
          lg:w-[70%] flex flex-col min-w-0
          ${mobileShowChat ? "flex w-full" : "hidden lg:flex"}
        `}>
          {ChatPanel}
        </div>
      </div>
    </div>
  );
}
