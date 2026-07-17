import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Settings,
  Menu,
  X,
  BarChart3,
  ArrowDownToLine,
} from "lucide-react";

const client = createClient();

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) setUser(res.data);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setUser(null);
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/", label: "الرئيسية", icon: "🏠" },
    { href: "/converter", label: "تحويل العملات", icon: "💱" },
    { href: "/banks", label: "البنوك الإلكترونية", icon: "🏦" },
    { href: "/profits", label: "الأرباح", icon: "📊" },
    { href: "/deposit", label: "إيداع", icon: "📥" },
    { href: "/withdraw", label: "سحب", icon: "💸" },
    { href: "/history", label: "سجل التحويلات", icon: "📋" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#0A0F1C]/95 backdrop-blur-md border-b border-[#374151]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">TTB</span>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">
              TTB Exchange
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/admin")
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                لوحة التحكم
              </Link>
            )}
          </nav>

          {/* Auth - Owner only */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-white/10 rounded-full"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#1F2937] border-[#374151] text-white"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      to="/profits"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4" /> الأرباح
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/deposit"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowDownToLine className="h-4 w-4" /> إيداع
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/withdraw"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowDownToLine className="h-4 w-4" /> سحب الأرباح
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="h-4 w-4" /> لوحة التحكم
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-red-400"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleLogin}
                variant="ghost"
                className="text-gray-400 hover:text-white text-sm"
              >
                <Settings className="h-4 w-4 ml-1" />
                إدارة
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}