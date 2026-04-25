import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/db/api";
import { supabase } from "@/db/supabase";
import { toast } from "sonner";
import { Loader2, Lock, User, Palette, UserCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Auth() {
  const { signInWithUsername, signUpWithUsername, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'artist' | 'client'>('client');

  const from = location.state?.from || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error(t('auth.fillFields'));
    
    setLoading(true);
    const { error } = await signInWithUsername(username, password);
    if (error) {
      toast.error(t('auth.loginFailed') + ": " + error.message);
      setLoading(false);
    } else {
      toast.success(t('auth.welcomeBack'));
      await refreshProfile();
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error(t('auth.fillFields'));
    if (username.length < 3) return toast.error(t('auth.usernameTooShort'));
    
    setLoading(true);
    const { error } = await signUpWithUsername(username, password);
    if (error) {
      toast.error(t('auth.registerFailed') + ": " + error.message);
      setLoading(false);
    } else {
      // 注册成功后获取当前会话，更新用户角色
      setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          await api.updateProfile(sessionData.session.user.id, { role });
          toast.success(t('auth.registerSuccess'));
          await refreshProfile();
          navigate(role === 'artist' ? "/verify" : from, { replace: true });
        } else {
          setLoading(false);
        }
      }, 500);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 md:py-20">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-14 rounded-2xl">
          <TabsTrigger value="login" className="rounded-xl font-bold text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('auth.login')}
          </TabsTrigger>
          <TabsTrigger value="register" className="rounded-xl font-bold text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('auth.joinPureDraw')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <Card className="sketch-card overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black">{t('auth.welcomeBackTitle')}</CardTitle>
              <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="username" 
                      placeholder={t('auth.usernamePlaceholder')}
                      className="pl-10 h-12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full h-12 text-lg font-bold cat-button" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth.loginBtn')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card className="sketch-card overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black">{t('auth.createAccount')}</CardTitle>
              <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>{t('auth.myRole')}</Label>
                  <RadioGroup 
                    defaultValue="client" 
                    onValueChange={(val) => setRole(val as any)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="role-client"
                      className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer hover:bg-muted/50 transition-all ${role === 'client' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <RadioGroupItem value="client" id="role-client" className="sr-only" />
                      <UserCircle className={`h-8 w-8 mb-2 ${role === 'client' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-bold">{t('auth.roleClient')}</span>
                      <span className="text-xs text-muted-foreground mt-1">{t('auth.roleClientDesc')}</span>
                    </Label>
                    <Label
                      htmlFor="role-artist"
                      className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer hover:bg-muted/50 transition-all ${role === 'artist' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <RadioGroupItem value="artist" id="role-artist" className="sr-only" />
                      <Palette className={`h-8 w-8 mb-2 ${role === 'artist' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-bold">{t('auth.roleArtist')}</span>
                      <span className="text-xs text-muted-foreground mt-1">{t('auth.roleArtistDesc')}</span>
                    </Label>
                  </RadioGroup>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">{t('auth.username')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="reg-username" 
                        placeholder={t('auth.regUsernamePlaceholder')}
                        className="pl-10 h-12"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="reg-password" 
                        type="password" 
                        placeholder={t('auth.passwordPlaceholder')}
                        className="pl-10 h-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full h-12 text-lg font-bold cat-button" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth.registerBtn')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
      
      <p className="text-center text-sm text-muted-foreground mt-8 px-6">
        {t('auth.agreeTerms')}<span className="text-primary hover:underline cursor-pointer">{t('auth.termsOfService')}</span>{t('auth.and')}<span className="text-primary hover:underline cursor-pointer">{t('auth.privacyPolicy')}</span>
      </p>
    </div>
  );
}
