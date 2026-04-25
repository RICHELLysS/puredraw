import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/db/api";
import { Commission, CommissionStatus, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Calendar, DollarSign, ArrowLeft, MessageCircle, AlertTriangle, CheckCircle2, FileImage, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import QRCodeDataUrl from "@/components/ui/qrcodedataurl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";

export default function CommissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayQR, setShowPayQR] = useState(false);
  const [payType, setPayType] = useState<'deposit' | 'balance'>('deposit');

  useEffect(() => {
    if (!id || !profile) return;
    loadData();
  }, [id, profile]);

  const loadData = async () => {
    // 重新获取约稿列表并找到当前约稿 (api.getCommissions 获取关联数据)
    const { data } = await api.getCommissions(profile!.id, profile!.role);
    const item = (data || []).find(c => c.id === id);
    setCommission(item || null);
    setLoading(false);
  };

  const handlePay = async (type: 'deposit' | 'balance') => {
    setPayType(type);
    setShowPayQR(true);
    
    // 模拟支付逻辑：轮询或直接提供支付按钮
    toast.info("支付通道已建立，请扫码支付 🐾");
  };

  const simulatePaymentSuccess = async () => {
    if (!commission) return;
    const nextStatus = payType === 'deposit' ? 'deposit_paid' : 'completed';
    
    const { error } = await api.updateCommissionStatus(commission.id, nextStatus as CommissionStatus);
    if (!error) {
      toast.success(payType === 'deposit' ? "定金支付成功，订单已开启！" : "尾款支付成功，交易已完成！");
      setShowPayQR(false);
      loadData();
      await api.sendMessage(profile!.id, profile!.role === 'artist' ? commission.client_id : commission.artist_id, `[系统消息] 我已完成支付，请查收。`);
    }
  };

  const handleUploadSuccess = async (type: 'sketch' | 'final', url: string) => {
    if (!commission) return;
    try {
      // 更新状态
      const nextStatus = type === 'sketch' ? 'sketch_uploaded' : 'final_uploaded';
      const updates = type === 'sketch' ? { sketch_url: url } : { final_url: url };
      
      const { error } = await api.updateCommissionStatus(commission.id, nextStatus as CommissionStatus, updates);
      if (error) throw error;

      toast.success(type === 'sketch' ? "草图已上传！" : "成图已上传，请等待约稿人确认。");
      loadData();
      await api.sendMessage(profile!.id, commission.client_id, `[系统消息] 我已上传了${type === 'sketch' ? '草图' : '成图'}，请前往详情页查看。`);
    } catch (err: any) {
      toast.error("保存失败: " + err.message);
    }
  };

  const handleConfirm = async (isSketch: boolean) => {
    if (!commission) return;
    const nextStatus = isSketch ? 'deposit_paid' : 'completed'; // 草图确认后继续进行，成图确认后支付尾款并完成
    
    if (!isSketch) {
      // 触发支付尾款流程
      handlePay('balance');
      return;
    }

    const { error } = await api.updateCommissionStatus(commission.id, 'deposit_paid');
    if (!error) {
      toast.success("草图已确认，请画师继续完成成图！");
      loadData();
    }
  };

  const handleRefund = async () => {
    if (!commission) return;
    // 规则：退 25 元定金找下一个
    const { error } = await api.updateCommissionStatus(commission.id, 'refunded');
    if (!error) {
      toast.success("已为您退回 25 元定金，欢迎寻找下一位心仪画师 🐾");
      navigate("/artists");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!commission) return <div className="text-center py-20">约稿未找到 🐾</div>;

  const isArtist = profile?.id === commission.artist_id;
  const isClient = profile?.id === commission.client_id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> 返回消息
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="sketch-card border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black">约稿详情</CardTitle>
                <p className="text-sm text-muted-foreground">订单 ID: {commission.id.slice(0, 8)}</p>
              </div>
              <Badge className="px-4 py-1 h-fit text-sm" variant={commission.status === 'completed' ? 'secondary' : 'default'}>
                {getStatusText(commission.status)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-primary" /> 需求描述
                </h4>
                <div className="p-4 bg-muted/30 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                  {commission.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">截止时间</p>
                  <p className="font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(new Date(commission.final_deadline), 'yyyy-MM-dd', { locale: zhCN })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">约稿总额</p>
                  <p className="font-bold text-2xl text-primary flex items-center gap-1">
                    <DollarSign className="w-5 h-5" />
                    {commission.price}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h4 className="font-bold">作品交付区</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sketch Box */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">草图环节</p>
                    <div className="aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                      {commission.sketch_url ? (
                        <div className="w-full h-full">
                          <img src={commission.sketch_url} className="w-full h-full object-cover" />
                        </div>
                      ) : isArtist && commission.status === 'deposit_paid' ? (
                        <div className="w-full p-2">
                          <ImageUpload 
                            onUploadSuccess={(url) => handleUploadSuccess('sketch', url)}
                            folder={`commissions/${commission.id}`}
                            label="上传草图"
                            aspectRatio="video"
                          />
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">暂无草图</p>
                        </div>
                      )}
                    </div>
                    {isClient && commission.status === 'sketch_uploaded' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 cat-button font-bold" onClick={() => handleConfirm(true)}>确认草图</Button>
                        <Button size="sm" variant="outline" onClick={() => toast.info("请通过对话框与画师沟通修改需求")}>申请修改</Button>
                      </div>
                    )}
                  </div>

                  {/* Final Box */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">成图环节</p>
                    <div className="aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                      {commission.final_url ? (
                        <div className="w-full h-full">
                          <img src={commission.final_url} className="w-full h-full object-cover" />
                        </div>
                      ) : isArtist && (commission.status === 'sketch_uploaded' || commission.status === 'deposit_paid') ? (
                        <div className="w-full p-2">
                          <ImageUpload 
                            onUploadSuccess={(url) => handleUploadSuccess('final', url)}
                            folder={`commissions/${commission.id}`}
                            label="上传成图"
                            aspectRatio="video"
                          />
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">暂无成图</p>
                        </div>
                      )}
                    </div>
                    {isClient && commission.status === 'final_uploaded' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 cat-button font-bold" onClick={() => handleConfirm(false)}>确认收货并付尾款</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isClient && commission.status === 'agreed' && (
            <div className="bg-primary/10 border-2 border-primary rounded-3xl p-8 text-center space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black">协商达成，请支付定金</h3>
                <p className="text-muted-foreground mt-2">支付定金后画师将开始创作。定金由平台托管，确保双方权益 🐾</p>
              </div>
              <Button size="lg" className="h-14 px-12 text-xl font-bold cat-button" onClick={() => handlePay('deposit')}>
                支付定金 ¥30
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sketch-card overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">约稿对象</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={(isArtist ? commission.client?.avatar_url : commission.artist?.avatar_url) || ""} />
                  <AvatarFallback>{(isArtist ? commission.client?.username : commission.artist?.username)?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{(isArtist ? commission.client?.username : commission.artist?.username)}</p>
                  <p className="text-xs text-muted-foreground">{isArtist ? "约稿人" : "画师"}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/messages/${isArtist ? commission.client_id : commission.artist_id}`)}>
                <MessageCircle className="w-4 h-4 mr-2" /> 发送消息
              </Button>
            </CardContent>
          </Card>

          <Card className="sketch-card overflow-hidden bg-muted/10 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                售后保障
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 text-xs text-muted-foreground">
              <p>1. 画师交付草图前，您可以随时终止约稿，定金不予退还。</p>
              <p>2. 草图阶段若不满意，可申请重画或终止约稿并退回 ¥25 定金。</p>
              <p>3. 收到成图后若发现 AI 生成迹象，24 小时内可发起举报，核实后退款 80%。</p>
              
              {isClient && ['deposit_paid', 'sketch_uploaded'].includes(commission.status) && (
                <Button variant="ghost" size="sm" className="w-full text-red-500 h-8 hover:text-red-600 hover:bg-red-50" onClick={handleRefund}>
                  终止约稿并退 25 元
                </Button>
              )}
              
              {isClient && commission.status === 'completed' && (
                <Button variant="ghost" size="sm" className="w-full text-orange-500 h-8" onClick={() => toast.info("举报功能开发中，请在收到图后24h内联系客服")}>
                  举报 AI 生成
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pay Modal */}
      <Dialog open={showPayQR} onOpenChange={setShowPayQR}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{payType === 'deposit' ? '支付定金' : '支付尾款'}</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="p-4 bg-card rounded-2xl shadow-inner border">
              <QRCodeDataUrl 
                text={`https://puredraw.app/pay/${commission.id}/${payType}`} 
                className="w-48 h-48"
              />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-primary">¥{payType === 'deposit' ? 30 : commission.price - 30}</p>
              <p className="text-sm text-muted-foreground">请使用微信扫码支付</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3 h-3" />
              微信支付加密协议
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full cat-button" onClick={simulatePaymentSuccess}>
              模拟支付成功 (测试用)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusText(status: CommissionStatus) {
  const map: Record<string, string> = {
    pending_agreement: "协商需求中",
    agreed: "待付定金",
    deposit_paid: "进行中",
    sketch_uploaded: "草图已上传",
    final_uploaded: "成图已上传",
    completed: "已完成",
    reported: "举报仲裁中",
    refunded: "已退款"
  };
  return map[status] || status;
}
