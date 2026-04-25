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
import { zhCN, enUS } from "date-fns/locale";
import QRCodeDataUrl from "@/components/ui/qrcodedataurl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CommissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const dateLocale = language === "en" ? enUS : zhCN;
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
    toast.info(t("commission.payModal.scanOpened"));
  };

  const simulatePaymentSuccess = async () => {
    if (!commission) return;
    const nextStatus = payType === 'deposit' ? 'deposit_paid' : 'completed';
    
    const { error } = await api.updateCommissionStatus(commission.id, nextStatus as CommissionStatus);
    if (!error) {
      toast.success(payType === 'deposit' ? t("commission.toast.depositPaid") : t("commission.toast.finalPaid"));
      setShowPayQR(false);
      loadData();
      await api.sendMessage(profile!.id, profile!.role === 'artist' ? commission.client_id : commission.artist_id, t("commission.toast.paymentMsg"));
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

      toast.success(type === 'sketch' ? t("commission.toast.sketchUploaded") : t("commission.toast.finalUploaded"));
      loadData();
      await api.sendMessage(profile!.id, commission.client_id, type === 'sketch' ? t("commission.toast.sketchMsg") : t("commission.toast.finalMsg"));
    } catch (err: any) {
      toast.error(t("commission.toast.uploadFailed") + ": " + err.message);
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
      toast.success(t("commission.toast.sketchConfirmed"));
      loadData();
    }
  };

  const handleRefund = async () => {
    if (!commission) return;
    // 规则：退 25 元定金找下一个
    const { error } = await api.updateCommissionStatus(commission.id, 'refunded');
    if (!error) {
      toast.success(t("commission.toast.refunded"));
      navigate("/artists");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!commission) return <div className="text-center py-20">{t("commission.notFound")}</div>;

  const isArtist = profile?.id === commission.artist_id;
  const isClient = profile?.id === commission.client_id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> {t("commission.backToMessages")}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="sketch-card border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black">{t("commission.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("commission.orderId")}: {commission.id.slice(0, 8)}</p>
              </div>
              <Badge className="px-4 py-1 h-fit text-sm" variant={commission.status === 'completed' ? 'secondary' : 'default'}>
                {getStatusText(commission.status, t as (k: string) => string)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-primary" /> {t("commission.description")}
                </h4>
                <div className="p-4 bg-muted/30 rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                  {commission.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("commission.deadlineLabel")}</p>
                  <p className="font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(new Date(commission.final_deadline), language === 'en' ? 'yyyy-MM-dd' : 'yyyy-MM-dd', { locale: dateLocale })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("commission.totalLabel")}</p>
                  <p className="font-bold text-2xl text-primary flex items-center gap-1">
                    <DollarSign className="w-5 h-5" />
                    {commission.price}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h4 className="font-bold">{t("commission.deliveryArea")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sketch Box */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t("commission.sketchSection")}</p>
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
                            label={t("commission.uploadSketch")}
                            aspectRatio="video"
                          />
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">{t("commission.noSketch")}</p>
                        </div>
                      )}
                    </div>
                    {isClient && commission.status === 'sketch_uploaded' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 cat-button font-bold" onClick={() => handleConfirm(true)}>{t("commission.confirmSketch")}</Button>
                        <Button size="sm" variant="outline" onClick={() => toast.info(t("commission.revisionTip"))}>{t("commission.requestRevision")}</Button>
                      </div>
                    )}
                  </div>

                  {/* Final Box */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t("commission.finalSection")}</p>
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
                            label={t("commission.uploadFinal")}
                            aspectRatio="video"
                          />
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-muted-foreground">{t("commission.noFinal")}</p>
                        </div>
                      )}
                    </div>
                    {isClient && commission.status === 'final_uploaded' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 cat-button font-bold" onClick={() => handleConfirm(false)}>{t("commission.confirmAndPay")}</Button>
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
                <h3 className="text-2xl font-black">{t("commission.depositTitle")}</h3>
                <p className="text-muted-foreground mt-2">{t("commission.depositDesc")}</p>
              </div>
              <Button size="lg" className="h-14 px-12 text-xl font-bold cat-button" onClick={() => handlePay('deposit')}>{t("commission.payDepositBtn")}</Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sketch-card overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">{t("commission.counterpart")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={(isArtist ? commission.client?.avatar_url : commission.artist?.avatar_url) || ""} />
                  <AvatarFallback>{(isArtist ? commission.client?.username : commission.artist?.username)?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{(isArtist ? commission.client?.username : commission.artist?.username)}</p>
                  <p className="text-xs text-muted-foreground">{isArtist ? t("commission.clientLabel") : t("commission.artistLabel")}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/messages/${isArtist ? commission.client_id : commission.artist_id}`)}>
                <MessageCircle className="w-4 h-4 mr-2" /> {t("commission.sendMessage")}
              </Button>
            </CardContent>
          </Card>

          <Card className="sketch-card overflow-hidden bg-muted/10 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" />{t("commission.afterSale")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 text-xs text-muted-foreground">
              <p>1. {t("commission.afterSale1")}</p>
              <p>2. {t("commission.afterSale2")}</p>
              <p>3. {t("commission.afterSale3")}</p>
              
              {isClient && ['deposit_paid', 'sketch_uploaded'].includes(commission.status) && (
                <Button variant="ghost" size="sm" className="w-full text-red-500 h-8 hover:text-red-600 hover:bg-red-50" onClick={handleRefund}>
                  {t("commission.terminateBtn")}
                </Button>
              )}
              
              {isClient && commission.status === 'completed' && (
                <Button variant="ghost" size="sm" className="w-full text-orange-500 h-8" onClick={() => toast.info(t("commission.reportPending"))}>{t("commission.reportAI")}</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pay Modal */}
      <Dialog open={showPayQR} onOpenChange={setShowPayQR}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{payType === 'deposit' ? t("commission.payModal.deposit") : t("commission.payModal.balance")}</DialogTitle>
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
              <p className="text-sm text-muted-foreground">{t("commission.payModal.scanTip")}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3 h-3" />
              {t("commission.payModal.wechat")}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full cat-button" onClick={simulatePaymentSuccess}>{t("commission.payModal.testBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusText(status: CommissionStatus, t: (k: string) => string) {
  const map: Record<string, string> = {
    pending_agreement: t("commission.statusMap.pending_agreement"),
    agreed: t("commission.statusMap.agreed"),
    deposit_paid: t("commission.statusMap.deposit_paid"),
    sketch_uploaded: t("commission.statusMap.sketch_uploaded"),
    final_uploaded: t("commission.statusMap.final_uploaded"),
    completed: t("commission.statusMap.completed"),
    reported: t("commission.statusMap.reported"),
    refunded: t("commission.statusMap.refunded"),
  };
  return map[status] || status;
}
