import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  UserPlus,
  Users,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  Save,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE || "";

interface SubAdmin {
  id: number;
  user_id: string;
  email: string;
  name: string;
  permissions: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

interface Permission {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: "view_deposits",
    label: "عرض الإيداعات",
    description: "يمكنه رؤية جميع طلبات الإيداع",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    id: "view_withdrawals",
    label: "عرض السحوبات",
    description: "يمكنه رؤية جميع طلبات السحب",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    id: "approve_transactions",
    label: "الموافقة على المعاملات",
    description: "يمكنه قبول أو رفض المعاملات",
    icon: <Check className="h-4 w-4" />,
  },
  {
    id: "manage_fees",
    label: "إدارة الرسوم",
    description: "يمكنه تعديل رسوم التحويل",
    icon: <Edit2 className="h-4 w-4" />,
  },
  {
    id: "manage_pairs",
    label: "إدارة أزواج العملات",
    description: "يمكنه إضافة أو تعديل أزواج العملات",
    icon: <Edit2 className="h-4 w-4" />,
  },
];

export default function SubAdminsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchSubAdmins();
  }, [isAdmin, navigate]);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sub_admins/?limit=100`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSubAdmins(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch sub-admins:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubAdmin = async () => {
    if (!formEmail || !formName) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (formPermissions.length === 0) {
      toast.error("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/sub_admins/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formEmail,
          name: formName,
          user_id: formEmail, // Use email as user_id placeholder until they login
          permissions: JSON.stringify(formPermissions),
          is_active: true,
          notes: formNotes || "",
        }),
      });

      if (res.ok) {
        toast.success("تمت إضافة المسؤول الفرعي بنجاح");
        resetForm();
        fetchSubAdmins();
      } else {
        toast.error("فشل في إضافة المسؤول الفرعي");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الإضافة");
    }
  };

  const handleUpdateSubAdmin = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/sub_admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formEmail,
          name: formName,
          permissions: JSON.stringify(formPermissions),
          is_active: true,
          notes: formNotes || "",
        }),
      });

      if (res.ok) {
        toast.success("تم تحديث المسؤول الفرعي بنجاح");
        resetForm();
        setEditingId(null);
        fetchSubAdmins();
      } else {
        toast.error("فشل في تحديث المسؤول الفرعي");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  const handleToggleActive = async (subAdmin: SubAdmin) => {
    try {
      const res = await fetch(`${API_BASE}/api/sub_admins/${subAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...subAdmin,
          is_active: !subAdmin.is_active,
        }),
      });

      if (res.ok) {
        toast.success(
          subAdmin.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب"
        );
        fetchSubAdmins();
      }
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المسؤول الفرعي؟")) return;

    try {
      const res = await fetch(`${API_BASE}/api/sub_admins/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("تم حذف المسؤول الفرعي");
        fetchSubAdmins();
      } else {
        toast.error("فشل في الحذف");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const startEdit = (subAdmin: SubAdmin) => {
    setEditingId(subAdmin.id);
    setFormEmail(subAdmin.email);
    setFormName(subAdmin.name);
    setFormPermissions(JSON.parse(subAdmin.permissions || "[]"));
    setFormNotes(subAdmin.notes || "");
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormEmail("");
    setFormName("");
    setFormPermissions([]);
    setFormNotes("");
    setShowAddForm(false);
    setEditingId(null);
  };

  const togglePermission = (permId: string) => {
    setFormPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  const getPermissionLabels = (permissionsJson: string) => {
    try {
      const perms = JSON.parse(permissionsJson);
      return perms.map((p: string) => {
        const found = AVAILABLE_PERMISSIONS.find((ap) => ap.id === p);
        return found?.label || p;
      });
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1724] text-white" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a2332] to-[#0F1724] border-b border-[#2a3a4a]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">إدارة المسؤولين الفرعيين</h1>
                <p className="text-sm text-gray-400">
                  إضافة وإدارة حسابات المسؤولين الفرعيين مع صلاحيات محددة
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/admin")}
                variant="outline"
                className="border-[#374151] text-gray-300 hover:bg-[#1F2937]"
              >
                <ChevronLeft className="h-4 w-4 ml-1" />
                لوحة التحكم
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4 ml-1" />
                إضافة مسؤول فرعي
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subAdmins.length}</p>
                <p className="text-xs text-gray-400">إجمالي المسؤولين الفرعيين</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {subAdmins.filter((s) => s.is_active).length}
                </p>
                <p className="text-xs text-gray-400">حسابات نشطة</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {subAdmins.filter((s) => !s.is_active).length}
                </p>
                <p className="text-xs text-gray-400">حسابات معطلة</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit2 className="h-5 w-5 text-yellow-400" />
                  تعديل المسؤول الفرعي
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-purple-400" />
                  إضافة مسؤول فرعي جديد
                </>
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  الاسم الكامل *
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="أدخل اسم المسؤول الفرعي"
                  className="bg-[#0F1724] border-[#374151] text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  البريد الإلكتروني *
                </label>
                <Input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="bg-[#0F1724] border-[#374151] text-white"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-3">
                الصلاحيات *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formPermissions.includes(perm.id)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-[#374151] bg-[#0F1724] hover:border-[#4a5a6a]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`p-1 rounded ${
                          formPermissions.includes(perm.id)
                            ? "bg-purple-500/30 text-purple-300"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {perm.icon}
                      </div>
                      <span className="text-sm font-medium">{perm.label}</span>
                      {formPermissions.includes(perm.id) && (
                        <Check className="h-4 w-4 text-purple-400 mr-auto" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">
                ملاحظات (اختياري)
              </label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                className="bg-[#0F1724] border-[#374151] text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  editingId
                    ? handleUpdateSubAdmin(editingId)
                    : handleAddSubAdmin()
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 ml-1" />
                {editingId ? "حفظ التعديلات" : "إضافة المسؤول الفرعي"}
              </Button>
              <Button
                onClick={resetForm}
                variant="outline"
                className="border-[#374151] text-gray-300 hover:bg-[#1F2937]"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Sub-Admins List */}
        <div className="space-y-4">
          {subAdmins.length === 0 ? (
            <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-12 text-center">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg mb-2">
                لا يوجد مسؤولين فرعيين حتى الآن
              </p>
              <p className="text-gray-500 text-sm mb-4">
                أضف مسؤولين فرعيين لمساعدتك في إدارة المنصة
              </p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4 ml-1" />
                إضافة أول مسؤول فرعي
              </Button>
            </div>
          ) : (
            subAdmins.map((subAdmin) => (
              <div
                key={subAdmin.id}
                className={`bg-[#1a2332] border rounded-xl p-5 transition-all ${
                  subAdmin.is_active
                    ? "border-[#2a3a4a]"
                    : "border-red-900/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        subAdmin.is_active
                          ? "bg-purple-500/20"
                          : "bg-red-500/20"
                      }`}
                    >
                      <Shield
                        className={`h-5 w-5 ${
                          subAdmin.is_active
                            ? "text-purple-400"
                            : "text-red-400"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{subAdmin.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            subAdmin.is_active
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {subAdmin.is_active ? "نشط" : "معطل"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3" dir="ltr">
                        {subAdmin.email}
                      </p>

                      {/* Permissions badges */}
                      <div className="flex flex-wrap gap-2">
                        {getPermissionLabels(subAdmin.permissions).map(
                          (label: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded-md bg-[#0F1724] border border-[#374151] text-gray-300"
                            >
                              {label}
                            </span>
                          )
                        )}
                      </div>

                      {subAdmin.notes && (
                        <p className="text-xs text-gray-500 mt-2">
                          📝 {subAdmin.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleActive(subAdmin)}
                      size="sm"
                      variant="outline"
                      className={`border-[#374151] ${
                        subAdmin.is_active
                          ? "text-red-400 hover:bg-red-500/10"
                          : "text-green-400 hover:bg-green-500/10"
                      }`}
                    >
                      {subAdmin.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => startEdit(subAdmin)}
                      size="sm"
                      variant="outline"
                      className="border-[#374151] text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(subAdmin.id)}
                      size="sm"
                      variant="outline"
                      className="border-[#374151] text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}