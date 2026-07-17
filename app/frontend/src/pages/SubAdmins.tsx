import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Trash2,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Settings,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  Eye,
  LogOut,
} from "lucide-react";
import { isAdminLoggedIn, adminLogout } from "./Admin";

const SUB_ADMINS_KEY = "ttb_sub_admins";

interface SubAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

function loadSubAdmins(): SubAdmin[] {
  try {
    const stored = localStorage.getItem(SUB_ADMINS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_e) { /* ignore parse errors */ }
  return [];
}

function saveSubAdmins(data: SubAdmin[]) {
  localStorage.setItem(SUB_ADMINS_KEY, JSON.stringify(data));
}

const PERMISSIONS = [
  { key: "manage_withdrawals", label: "إدارة طلبات السحب", icon: <ArrowDownToLine className="h-4 w-4" /> },
  { key: "manage_deposits", label: "إدارة طلبات الإيداع", icon: <ArrowUpFromLine className="h-4 w-4" /> },
  { key: "manage_pairs", label: "إدارة أزواج العملات", icon: <Calculator className="h-4 w-4" /> },
  { key: "manage_fees", label: "إدارة الرسوم", icon: <Settings className="h-4 w-4" /> },
  { key: "view_reports", label: "عرض التقارير", icon: <Eye className="h-4 w-4" /> },
  { key: "manage_users", label: "إدارة المستخدمين", icon: <Users className="h-4 w-4" /> },
];

export default function SubAdminsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // New sub-admin form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("مدير فرعي");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    const loggedIn = isAdminLoggedIn();
    setIsAuthenticated(loggedIn);
    if (loggedIn) {
      setSubAdmins(loadSubAdmins());
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    adminLogout();
    setIsAuthenticated(false);
  };

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === PERMISSIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(PERMISSIONS.map((p) => p.key));
    }
  };

  const handleAddSubAdmin = () => {
    if (!newEmail.trim() || !newName.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }

    // Check for duplicate email
    if (subAdmins.some((a) => a.email === newEmail.trim())) {
      toast.error("هذا البريد الإلكتروني مسجل بالفعل");
      return;
    }

    const newAdmin: SubAdmin = {
      id: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: newEmail.trim(),
      name: newName.trim(),
      role: newRole.trim() || "مدير فرعي",
      permissions: [...selectedPermissions],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const updated = [newAdmin, ...subAdmins];
    setSubAdmins(updated);
    saveSubAdmins(updated);

    toast.success(`تمت إضافة المدير الفرعي "${newName.trim()}" بنجاح`);
    setNewEmail("");
    setNewName("");
    setNewRole("مدير فرعي");
    setSelectedPermissions([]);
  };

  const handleToggleActive = (adminId: string) => {
    const updated = subAdmins.map((a) =>
      a.id === adminId ? { ...a, is_active: !a.is_active } : a
    );
    setSubAdmins(updated);
    saveSubAdmins(updated);

    const admin = updated.find((a) => a.id === adminId);
    toast.success(admin?.is_active ? `تم تفعيل "${admin.name}"` : `تم تعطيل "${admin?.name}"`);
  };

  const handleDelete = (admin: SubAdmin) => {
    if (!confirm(`هل أنت متأكد من حذف المدير الفرعي "${admin.name}"؟`)) return;
    const updated = subAdmins.filter((a) => a.id !== admin.id);
    setSubAdmins(updated);
    saveSubAdmins(updated);
    toast.success(`تم حذف "${admin.name}" بنجاح`);
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">إدارة المدراء الفرعيين</h2>
          <p className="text-gray-400 mb-6">يرجى تسجيل الدخول من صفحة لوحة التحكم أولاً</p>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            الذهاب لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="h-7 w-7 text-amber-400" />
              إدارة المدراء الفرعيين
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              إضافة وإدارة المدراء الفرعيين وتحديد صلاحياتهم
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSubAdmins(loadSubAdmins())}
              className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#1F2937]"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 ml-2" />
              خروج
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1F2937] border-[#374151] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">إجمالي المدراء</p>
                <p className="text-2xl font-bold text-white">{subAdmins.length}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-green-400 text-xs">نشط</p>
                <p className="text-2xl font-bold text-green-400">
                  {subAdmins.filter((a) => a.is_active).length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 text-xs">معطل</p>
                <p className="text-2xl font-bold text-red-400">
                  {subAdmins.filter((a) => !a.is_active).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Add New Sub-Admin Form */}
        <Card className="bg-[#1F2937] border-amber-500/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#374151]">
            <UserPlus className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-lg">إضافة مدير فرعي جديد</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-gray-300">الاسم الكامل *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                className="bg-[#111827] border-[#374151] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">البريد الإلكتروني *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                className="bg-[#111827] border-[#374151] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">المسمى الوظيفي</Label>
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="مثال: مدير فرعي"
                className="bg-[#111827] border-[#374151] text-white"
              />
            </div>
          </div>

          {/* Permissions Selection */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 font-semibold">الصلاحيات *</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151] text-xs"
              >
                {selectedPermissions.length === PERMISSIONS.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERMISSIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    onClick={() => handleTogglePermission(perm.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                        : "bg-[#111827] border-[#374151] text-gray-400 hover:border-[#4B5563]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? "bg-amber-500 border-amber-500" : "border-[#4B5563]"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={isSelected ? "text-amber-400" : "text-gray-400"}>{perm.icon}</span>
                    <span className="text-sm font-medium">{perm.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleAddSubAdmin}
            disabled={!newEmail.trim() || !newName.trim() || selectedPermissions.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full sm:w-auto px-8"
          >
            <UserPlus className="h-4 w-4 ml-2" />
            إضافة مدير فرعي
          </Button>
        </Card>

        {/* Sub-Admins List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            قائمة المدراء الفرعيين ({subAdmins.length})
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-600 mx-auto animate-spin" />
              <p className="text-gray-400 mt-3">جاري التحميل...</p>
            </div>
          ) : subAdmins.length === 0 ? (
            <Card className="bg-[#1F2937] border-[#374151] p-12 text-center">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">لا يوجد مدراء فرعيون</p>
              <p className="text-gray-500 text-sm mt-2">أضف مدراء فرعيين لمساعدتك في إدارة الموقع</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {subAdmins.map((admin) => (
                <Card
                  key={admin.id}
                  className={`border p-5 transition-all ${
                    admin.is_active
                      ? "bg-[#1F2937] border-[#374151]"
                      : "bg-[#1F2937]/50 border-red-500/20 opacity-70"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Admin Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          admin.is_active ? "bg-amber-500/20" : "bg-gray-500/20"
                        }`}
                      >
                        <Shield className={`h-6 w-6 ${admin.is_active ? "text-amber-400" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white text-lg">{admin.name}</p>
                          <Badge
                            className={
                              admin.is_active
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {admin.is_active ? "نشط" : "معطل"}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{admin.role}</Badge>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{admin.email}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          تاريخ الإضافة: {new Date(admin.created_at).toLocaleDateString("ar-SA")}
                        </p>

                        {/* Permissions */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {admin.permissions.map((key) => {
                            const found = PERMISSIONS.find((p) => p.key === key);
                            return (
                              <Badge key={key} className="bg-[#111827] text-gray-300 border-[#374151] text-xs">
                                {found?.label || key}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(admin.id)}
                        className={
                          admin.is_active
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }
                      >
                        {admin.is_active ? (
                          <>
                            <ShieldAlert className="h-4 w-4 ml-1" />
                            تعطيل
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 ml-1" />
                            تفعيل
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(admin)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}