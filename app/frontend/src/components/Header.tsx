import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Bell,
} from "lucide-react";
import WalletButton from "@/components/WalletButton";
import { isAdminLoggedIn } from "@/pages/Admin";

const client = createClient();

// Notification polling for bank requests
const POLL_INTERVAL = 15000; // 15 seconds

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const prevPendingRef = useRef(0);
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

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  }, []);

  // Poll for pending bank requests
  const fetchPendingRequests = useCallback(async () => {
    const isAdmin = isAdminLoggedIn();
    if (!isAdmin) return;

    const API_URL = localStorage.getItem("ttb_api_url") || "https://tbb-jchj.onrender.com";
    try {
      const res = await fetch(`${API_URL}/api/bank-requests?limit=50`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || [];
        const pending = items.filter((r: any) => r.status === "pending");
        const newCount = pending.length;

        // Send browser notification if new requests arrived
        if (newCount > prevPendingRef.current && prevPendingRef.current >= 0) {
          const diff = newCount - prevPendingRef.current;
          if (diff > 0 && notifPermission === "granted") {
            new Notification("TTB Exchange - طلبات جديدة", {
              body: `لديك ${diff} طلب${diff > 1 ? "ات" : ""} بنكي${diff > 1 ? "ة" : ""} جديد${diff > 1 ? "ة" : ""}`,
              icon: "/favicon.ico",
            });
          }
        }

        prevPendingRef.current = newCount;
        setPendingCount(newCount);
      }
    } catch {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem("ttb_bank_requests");
        if (stored) {
          const items = JSON.parse(stored);
          const pending = items.filter((r: any) => r.status === "pending");
          setPendingCount(pending.length);
        }
      } catch { /* ignore */ }
    }
  }, [notifPermission]);

  // Polling interval
  useEffect(() => {
    if (!isAdminLoggedIn()) return;

    fetchPendingRequests(); // Initial fetch
    const interval = setInterval(fetchPendingRequests, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPendingRequests]);

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
    { href: "/token", label: "العملة الرقمية", icon: "🪙" },
    { href: "/banks", label: "البنوك الإلكترونية", icon: "🏦" },
    { href: "/profits", label: "الأرباح", icon: "📊" },
    { href: "/deposit", label: "إيداع", icon: "📥" },
    { href: "/withdraw", label: "سحب", icon: "💸" },
    { href: "/history", label: "سجل التحويلات", icon: "📋" },
    { href: "/bot-conversions", label: "تحويلات البوت", icon: "🤖" },
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

          {/* Wallet & Auth */}
          <div className="flex items-center gap-3">
            {/* Notification Bell for Admin */}
            {isAdminLoggedIn() && (
              <Link to="/admin" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:text-white hover:bg-white/10 rounded-full relative"
                  onClick={requestNotifPermission}
                >
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold border-0 px-1 rounded-full">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            <WalletButton />
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