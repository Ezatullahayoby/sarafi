import React, { useState, useMemo } from 'react';
import { User, UserPermission, AuditLog } from '../types';
import { AuthService, ALL_PERMISSIONS, DEFAULT_EMPLOYEE_PERMISSIONS } from '../services/auth';
import { DatabaseService } from '../services/db';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  UserX,
  UserCheck,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
}

export const UsersManagementView: React.FC<Props> = ({ onRefresh }) => {
  const isSuperAdmin = AuthService.isSuperAdmin();
  const currentUser = AuthService.getCurrentUser();
  const users = DatabaseService.getUsers();
  const auditLogs = DatabaseService.getAuditLogs();

  const [activeTab, setActiveTab] = useState<'employees' | 'audit_logs'>('employees');

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // New employee form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpConfirmPassword, setNewEmpConfirmPassword] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpStatus, setNewEmpStatus] = useState<'active' | 'inactive'>('active');
  const [newEmpPermissions, setNewEmpPermissions] = useState<UserPermission[]>(DEFAULT_EMPLOYEE_PERMISSIONS);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Reset password form state
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetPassError, setResetPassError] = useState('');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(userSearch));
      return matchSearch;
    });
  }, [users, userSearch]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchUser = selectedUserFilter === 'all' || log.userId === selectedUserFilter;
      const matchSearch =
        log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.date && log.date.includes(logSearch));
      return matchUser && matchSearch;
    });
  }, [auditLogs, selectedUserFilter, logSearch]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Check if current user has permission to see this page
  if (!isSuperAdmin) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-base font-black text-rose-950">دسترسی مسدود است</h2>
        <p className="text-xs text-rose-700 leading-relaxed">
          بخش مدیریت کارمندان و تنظیمات امنیتی کاربران تنها برای «مدیر کل صرافی» مجاز است.
        </p>
      </div>
    );
  }

  // Handle Add Employee Submit
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newEmpName.trim()) {
      setFormError('لطفاً نام کارمند را وارد کنید.');
      return;
    }
    if (!newEmpUsername.trim()) {
      setFormError('لطفاً نام کاربری را وارد کنید.');
      return;
    }
    if (!newEmpPassword.trim() || newEmpPassword.length < 6) {
      setFormError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (newEmpPassword !== newEmpConfirmPassword) {
      setFormError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    const res = AuthService.createEmployee({
      name: newEmpName,
      username: newEmpUsername,
      password: newEmpPassword,
      phone: newEmpPhone,
      permissions: newEmpPermissions,
      status: newEmpStatus,
    });

    if (res.success) {
      setIsAddModalOpen(false);
      setNewEmpName('');
      setNewEmpUsername('');
      setNewEmpPassword('');
      setNewEmpConfirmPassword('');
      setNewEmpPhone('');
      setNewEmpPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
      showSuccess(`کارمند جدید (${newEmpUsername}) با موفقیت ایجاد شد.`);
      onRefresh();
    } else {
      setFormError(res.error || 'خطا در ثبت کارمند جدید.');
    }
  };

  // Handle Edit Employee Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');

    const res = AuthService.updateEmployee(editingUser.id, {
      name: editingUser.name,
      phone: editingUser.phone,
      status: editingUser.status,
      permissions: editingUser.permissions,
    });

    if (res.success) {
      setEditingUser(null);
      showSuccess('مشخصات و سطح دسترسی کارمند با موفقیت به‌روز شد.');
      onRefresh();
    } else {
      setFormError(res.error || 'خطا در ویرایش کارمند.');
    }
  };

  // Handle Password Reset
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setResetPassError('');

    if (!newResetPassword.trim() || newResetPassword.length < 6) {
      setResetPassError('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetPassError('رمز عبور و تکرار آن مطابقت ندارند.');
      return;
    }

    const res = AuthService.resetEmployeePassword(resetPasswordUser.id, newResetPassword);
    if (res.success) {
      setResetPasswordUser(null);
      setNewResetPassword('');
      setConfirmResetPassword('');
      showSuccess(`رمز عبور کارمند (${resetPasswordUser.username}) با موفقیت تغییر یافت.`);
      onRefresh();
    } else {
      setResetPassError(res.error || 'خطا در تغییر رمز عبور.');
    }
  };

  // Toggle user active/inactive
  const handleToggleStatus = (u: User) => {
    if (u.role === 'admin') return;
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    AuthService.updateEmployee(u.id, { status: newStatus });
    showSuccess(`وضعیت حساب کارمند به «${newStatus === 'active' ? 'فعال' : 'غیرفعال'}» تغییر یافت.`);
    onRefresh();
  };

  // Handle Delete Employee
  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    const res = AuthService.deleteEmployee(deleteConfirmUser.id);
    if (res.success) {
      setDeleteConfirmUser(null);
      showSuccess(`حساب کارمند (${deleteConfirmUser.username}) با موفقیت حذف شد.`);
      onRefresh();
    } else {
      alert(res.error || 'خطا در حذف کارمند.');
    }
  };

  // Permission Grouping Helper
  const permissionsByCategory = useMemo(() => {
    const groups: { [cat: string]: typeof ALL_PERMISSIONS } = {};
    ALL_PERMISSIONS.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg text-xs font-black flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight">مدیریت کاربران و کارمندان صرافی</h1>
              <p className="text-xs text-slate-300 font-medium">
                تعریف کارمند جدید، تعیین دقیق سطح دسترسی، فعال/غیرفعال‌سازی و نظارت بر فعالیت‌ها
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن کارمند جدید</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>لیست کاربران و کارمندان ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>گزارش فعالیت کاربران ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Employees List */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="جستجو بر اساس نام، نام کاربری یا شماره تماس..."
              className="w-full text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black">
                    <th className="py-3.5 px-4">کاربر / کارمند</th>
                    <th className="py-3.5 px-4">نام کاربری</th>
                    <th className="py-3.5 px-4">نقش سازمانی</th>
                    <th className="py-3.5 px-4">شماره تماس</th>
                    <th className="py-3.5 px-4">وضعیت حساب</th>
                    <th className="py-3.5 px-4">سطح دسترسی‌ها</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredUsers.map((u) => {
                    const isRoot = u.role === 'admin';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                                isRoot ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {u.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isRoot && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-black">
                                    اصلی
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {u.lastLoginAt ? `آخرین ورود: ${new Date(u.lastLoginAt).toLocaleTimeString('fa-IR')}` : 'بدون سابقه ورود'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-3.5 px-4 font-mono text-slate-800 text-xs font-black" dir="ltr">
                          @{u.username}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {isRoot ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              مدیر کل صرافی
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              کارمند صرافی
                            </span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {u.phone || <span className="text-slate-300 font-sans">ثبت نشده</span>}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isRoot ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              همیشه فعال
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                              }`}
                              title="برای تغییر وضعیت کلیک کنید"
                            >
                              {u.status === 'active' ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>فعال</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                  <span>غیرفعال</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Permissions */}
                        <td className="py-3.5 px-4">
                          {isRoot ? (
                            <span className="text-[11px] text-emerald-700 font-bold">دسترسی تام و نامحدود (Super Admin)</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                                {u.permissions.length} مجوز فعال
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          {isRoot ? (
                            <span className="text-[10px] text-slate-400">تغییر در بخش امنیت</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingUser(JSON.parse(JSON.stringify(u)))}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="ویرایش مشخصات و سطح دسترسی"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setResetPasswordUser(u);
                                  setNewResetPassword('');
                                  setConfirmResetPassword('');
                                  setResetPassError('');
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                title="تغییر و بازنشانی رمز عبور"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmUser(u)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="حذف حساب کارمند"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Audit Logs */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">فیلتر کاربر:</span>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="all">همه کاربران صرافی</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username}) - {u.role === 'admin' ? 'مدیر کل' : 'کارمند'}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="جستجو در شرح، تاریخ، ساعت یا شناسه..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">هیچ فعالیت ثبت‌شده‌ای یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black">
                      <th className="py-3 px-4">کاربر</th>
                      <th className="py-3 px-4">نقش</th>
                      <th className="py-3 px-4">عملیات</th>
                      <th className="py-3 px-4">شرح دقیق رویداد</th>
                      <th className="py-3 px-4">تاریخ و ساعت</th>
                      <th className="py-3 px-4 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-900">{log.userName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              log.userRole === 'مدیر کل'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.userRole || 'کارمند'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 text-[11px] leading-relaxed max-w-md">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.date || ''} {log.time || ''}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3" />
                            موفق
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Add New Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">تعریف و ثبت کارمند جدید صرافی</h3>
                  <p className="text-[11px] text-slate-300">تخصیص نام کاربری، رمز عبور و مجوزهای دقیق عملیاتی</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نام و تخلص کارمند *</label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="مثال: احمد رحیمی"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نام کاربری (Username یکتا) *</label>
                  <input
                    type="text"
                    value={newEmpUsername}
                    onChange={(e) => setNewEmpUsername(e.target.value)}
                    placeholder="مثال: ahmad01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">رمز عبور اولیه * (حداقل ۶ رقم)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newEmpPassword}
                      onChange={(e) => setNewEmpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-3.5 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">تکرار رمز عبور *</label>
                  <input
                    type="password"
                    value={newEmpConfirmPassword}
                    onChange={(e) => setNewEmpConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">شماره تماس (اختیاری)</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="0799000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">وضعیت حساب اولیه</label>
                  <select
                    value={newEmpStatus}
                    onChange={(e) => setNewEmpStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="active">فعال (امکان ورود فوری)</option>
                    <option value="inactive">غیرفعال (مسدود موقت)</option>
                  </select>
                </div>
              </div>

              {/* Permissions Header & Quick Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      تعیین دقیق سطح دسترسی کارمند (RBAC)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      هر گزینه‌ای که علامت بزنید، برای این کارمند فعال خواهد شد.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNewEmpPermissions(DEFAULT_EMPLOYEE_PERMISSIONS)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      پیش‌فرض استاندارد
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEmpPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold cursor-pointer"
                    >
                      انتخاب همه
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEmpPermissions([])}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl font-bold cursor-pointer"
                    >
                      حذف همه
                    </button>
                  </div>
                </div>

                {/* Categorized Permissions Grid */}
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(([catName, perms]) => (
                    <div key={catName} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <h5 className="text-[11px] font-black text-slate-800 border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                        <span>ماژول {catName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {perms.filter((p) => newEmpPermissions.includes(p.id)).length} از {perms.length}
                        </span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {perms.map((p) => {
                          const isChecked = newEmpPermissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-xl border transition-colors cursor-pointer text-xs ${
                                isChecked
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewEmpPermissions([...newEmpPermissions, p.id]);
                                  } else {
                                    setNewEmpPermissions(newEmpPermissions.filter((id) => id !== p.id));
                                  }
                                }}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <div className="leading-tight">{p.label}</div>
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
                                  {p.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت و ایجاد کارمند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Employee & Permissions */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scale-up">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black">
                  ویرایش کارمند: {editingUser.name} ({editingUser.username})
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نام و تخلص کارمند</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نام کاربری (غیرقابل تغییر)</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-500 outline-none cursor-not-allowed"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">شماره تماس</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">وضعیت حساب</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="active">فعال (مجاز به ورود)</option>
                    <option value="inactive">غیرفعال (مسدود شده)</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 mb-3">تنظیم سطح دسترسی کارمند</h4>
                <div className="space-y-3">
                  {Object.entries(permissionsByCategory).map(([catName, perms]) => (
                    <div key={catName} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="text-[11px] font-black text-slate-700">{catName}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const isChecked = editingUser.permissions.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingUser({
                                      ...editingUser,
                                      permissions: [...editingUser.permissions, p.id],
                                    });
                                  } else {
                                    setEditingUser({
                                      ...editingUser,
                                      permissions: editingUser.permissions.filter((id) => id !== p.id),
                                    });
                                  }
                                }}
                                className="mt-0.5 rounded text-emerald-600"
                              />
                              <div>
                                <div>{p.label}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{p.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm cursor-pointer"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset Password */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="bg-amber-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-black">تغییر رمز عبور: {resetPasswordUser.name}</h3>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {resetPassError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold">
                  {resetPassError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
                <input
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500"
                  required
                  dir="ltr"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">تکرار رمز عبور جدید</label>
                <input
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500"
                  required
                  dir="ltr"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>ثبت رمز جدید</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Confirm */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-6 text-center space-y-4 animate-scale-up">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-slate-900">حذف دائمی حساب کارمند</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف حساب کارمند <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.username}) اطمینان دارید؟ این عمل غیرقابل بازگشت است.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-sm cursor-pointer"
              >
                بله، حذف کن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
