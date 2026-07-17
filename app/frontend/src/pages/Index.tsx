import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Lock, Mail, Eye, EyeOff, KeyRound } from "lucide-react";

const AUTH_KEY = "admin_authenticated";
const CREDENTIALS_KEY = "admin_credentials";

interface AdminCredentials {
  email: string;
  password: string;
}

function getCredentials(): AdminCredentials {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_e) { /* ignore parse errors */ }
  return { email: "admin@ttb.exchange", password: "admin123" };
}

function saveCredentials(creds: AdminCredentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function adminLogout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export default function IndexPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settings change state
  const [showSettings, setShowSettings] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    const loggedIn = isAdminLoggedIn();
    setIsAuthenticated(loggedIn);
    setLoading(false);
    if (loggedIn) {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogin = () => {
    const creds = getCredentials();
    if (loginEmail === creds.email && loginPassword === creds.password) {
      localStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setLoginError("");
      toast.success("تم تسجيل الدخول بنجاح!");
      navigate("/admin");
    } else {
      setLoginError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
  };

  const handleChangeCredentials = () => {
    const creds = getCredentials();
    if (currentPassword !== creds.password) {
      toast.error("كلمة المرور الحالية غير صحيحة");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    const updatedCreds: AdminCredentials = {
      email: newEmail.trim() || creds.email,
      password: newPassword || creds.password,
    };
    saveCredentials(updatedCreds);
    toast.success("تم تحديث بيانات الدخول بنجاح!");
    setShowSettings(false);
    setCurrentPassword("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center p-4" dir="rtl">
      {/* Background effects */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Settings className="h-10 w-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            TTB Exchange
          </h1>
          <p className="text-gray-400 mt-2">لوحة تحكم المسؤول</p>
        </div>

        {/* Login Card */}
        {!showSettings ? (
          <Card className="bg-[#1F2937] border-[#374151] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold">تسجيل الدخول</h2>
              <p className="text-gray-400 text-sm mt-1">
                أدخل بيانات الاعتماد للوصول إلى لوحة التحكم
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@ttb.exchange"
                  className="bg-[#111827] border-[#374151] text-white focus:border-amber-500"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#111827] border-[#374151] text-white focus:border-amber-500 pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                  {loginError}
                </p>
              )}

              <Button
                onClick={handleLogin}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full py-3 text-lg shadow-lg shadow-amber-500/20"
              >
                تسجيل الدخول
              </Button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full text-center text-sm text-gray-500 hover:text-amber-400 transition-colors mt-4"
              >
                تغيير بيانات الدخول ⚙️
              </button>
            </div>
          </Card>
        ) : (
          /* Change Credentials Card */
          <Card className="bg-[#1F2937] border-[#374151] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <Settings className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold">تغيير بيانات الدخول</h2>
              <p className="text-gray-400 text-sm mt-1">
                أدخل كلمة المرور الحالية لتأكيد التغيير
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">كلمة المرور الحالية</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  className="bg-[#111827] border-[#374151] text-white focus:border-amber-500"
                />
              </div>

              <div className="border-t border-[#374151] pt-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">البريد الإلكتروني الجديد (اختياري)</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="اترك فارغاً للإبقاء على الحالي"
                    className="bg-[#111827] border-[#374151] text-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="اترك فارغاً للإبقاء على الحالية"
                  className="bg-[#111827] border-[#374151] text-white focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">تأكيد كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  className="bg-[#111827] border-[#374151] text-white focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleChangeCredentials}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  حفظ التغييرات
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSettings(false);
                    setCurrentPassword("");
                    setNewEmail("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 TTB Exchange - لوحة تحكم المسؤول
        </p>
      </div>
    </div>
  );
}