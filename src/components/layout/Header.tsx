import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, User, LogOut, CheckCircle, ShieldAlert, Menu } from "lucide-react";

export function Header() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme, images } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVerifiedArtist = profile?.role === 'artist' && profile?.verification_status === 'verified';
  const isPendingArtist = profile?.role === 'artist' && profile?.verification_status === 'pending';
  const isAdmin = profile?.role === 'admin';

  const navLinks = [
    { name: t('nav.discover'), path: "/" },
    { name: t('nav.artists'), path: "/artists" },
    { name: t('nav.gallery'), path: "/gallery" },
    { name: t('nav.community'), path: "/community" },
  ];

  const handleMobileNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4 md:gap-8">
        {/* 移动端汉堡菜单 */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 p-6 border-b">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/20">
                  <img src={images.logo} alt="纯画 Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-xl tracking-tighter">PureDraw</span>
              </div>

              <nav className="flex flex-col gap-1 p-4 flex-1">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleMobileNav(link.path)}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-secondary ${
                      location.pathname === link.path
                        ? "bg-secondary text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {link.name}
                  </button>
                ))}

                {profile && (
                  <div className="mt-4 border-t pt-4 flex flex-col gap-1">
                    {isAdmin && (
                      <button
                        onClick={() => handleMobileNav("/admin")}
                        className="text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" /> {t('nav.admin')}
                      </button>
                    )}
                    {profile.role === 'artist' && (
                      <button
                        onClick={() => !isVerifiedArtist && handleMobileNav("/verify")}
                        disabled={isVerifiedArtist}
                        className="text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isVerifiedArtist ? t('nav.verified') : isPendingArtist ? t('nav.pending') : t('nav.verify')}
                      </button>
                    )}
                    <button
                      onClick={() => handleMobileNav(`/profile/${profile.id}`)}
                      className="text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> {t('nav.profile')}
                    </button>
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="text-left px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-secondary flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> {t('nav.logout')}
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
            <img src={images.logo} alt="纯画 Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-2xl tracking-tighter hidden sm:block">
            {language === 'en' ? 'PureDraw' : '纯画'}
          </span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.path ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* 语言切换按钮 */}
        <button
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-border hover:border-primary hover:text-primary transition-all text-muted-foreground"
          title={language === 'zh' ? 'Switch to English' : '切换为中文'}
        >
          {language === 'zh' ? 'EN' : '中'}
        </button>

        {/* 主题切换圆点 */}
        <button
          onClick={toggleTheme}
          className="w-6 h-6 rounded-full bg-primary hover:scale-110 transition-transform cursor-pointer border-2 border-primary/20 hover:border-primary"
          aria-label={t('nav.switchTheme')}
          title={theme === 'pink' ? '切换到绿色主题' : '切换到粉色主题'}
        />

        {profile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="hidden md:flex gap-1">
                <ShieldAlert className="w-4 h-4" />
                {t('nav.admin')}
              </Button>
            )}

            {profile.role === 'artist' && (
              <Button
                variant={isVerifiedArtist ? "secondary" : "default"}
                size="sm"
                onClick={() => navigate("/verify")}
                className="hidden md:flex gap-1"
                disabled={isVerifiedArtist}
              >
                {isVerifiedArtist ? (
                  <><CheckCircle className="w-4 h-4" />{t('nav.verified')}</>
                ) : isPendingArtist ? (
                  t('nav.pending')
                ) : (
                  t('nav.verify')
                )}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
                    <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile.role === 'artist' ? t('artists.verified') : t('auth.roleClient')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/profile/${profile.id}`)}>
                  <User className="mr-2 h-4 w-4" />
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/messages")}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('nav.messages')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button onClick={() => navigate("/auth")} className="cat-button">
            {t('nav.login')}
          </Button>
        )}
      </div>
    </header>
  );
}
