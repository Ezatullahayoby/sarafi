/**
 * Authentication and Authorization Service
 * Complete Role-Based Access Control (RBAC)
 * Enforces secure password hashing, brute-force lockout, and granular permissions.
 */

import { User, Role, UserPermission, AuditLog } from '../types';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  DEFAULT_ADMIN_SALT,
  DEFAULT_ADMIN_HASH,
  BruteForceGuard,
} from '../utils/security';
import { DatabaseService } from './db';
import { getAfghanTodayFull } from '../utils/afghanDate';

const SESSION_KEY = 'sarafi_auth_session_user';
const SESSION_TOKEN_KEY = 'sarafi_auth_token';

export interface PermissionDefinition {
  id: UserPermission;
  label: string;
  category: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Customers
  {
    id: 'view_customers',
    label: 'مشاهده مشتریان',
    category: 'مشتریان',
    description: 'امکان دیدن لیست مشتریان دائمی و رهروی',
  },
  {
    id: 'manage_customers',
    label: 'ثبت و ویرایش مشتری',
    category: 'مشتریان',
    description: 'امکان تعریف مشتری جدید و تغییر مشخصات',
  },
  {
    id: 'delete_customers',
    label: 'حذف مشتری',
    category: 'مشتریان',
    description: 'امکان پاک کردن رکورد مشتری از سیستم',
  },
  {
    id: 'view_customer_accounts',
    label: 'مشاهده حساب و گردش مشتری',
    category: 'مشتریان',
    description: 'دیدن ریز گردش حساب، مانده‌ها و صورتحساب',
  },

  // Trades
  {
    id: 'create_trades',
    label: 'ثبت معاملات خرید و فروش',
    category: 'معاملات اسعار',
    description: 'امکان ثبت تبادله و خرید یا فروش ارز',
  },
  {
    id: 'view_trades',
    label: 'مشاهده معاملات',
    category: 'معاملات اسعار',
    description: 'مشاهده لیست تمام معاملات ثبت‌شده در صرافی',
  },
  {
    id: 'delete_trades',
    label: 'حذف و ابطال معامله',
    category: 'معاملات اسعار',
    description: 'امکان حذف معامله ثبت‌شده',
  },

  // Receipts / Bards (Ledger entries)
  {
    id: 'create_entries',
    label: 'ثبت رسید و برد',
    category: 'رسیدها و اسناد',
    description: 'امکان واریز (رسید) یا برداشت (برد) به حساب مشتری',
  },
  {
    id: 'view_entries',
    label: 'مشاهده رسیدها و اسناد',
    category: 'رسیدها و اسناد',
    description: 'مشاهده و چاپ فیش رسید یا برد',
  },
  {
    id: 'delete_entries',
    label: 'حذف اسناد و رسیدها',
    category: 'رسیدها و اسناد',
    description: 'امکان پاک کردن سند از دفترچه حسابات',
  },

  // Banks
  {
    id: 'create_bank_tx',
    label: 'ثبت تراکنش بانک',
    category: 'بانک‌ها',
    description: 'ثبت رسید یا برد بانکی (تومان بانکی، شماره پیگیری و کارت)',
  },
  {
    id: 'view_banks',
    label: 'مشاهده بانک‌ها و تراکنش‌ها',
    category: 'بانک‌ها',
    description: 'دیدن موجودی حساب‌های بانکی و تراکنش‌ها',
  },
  {
    id: 'manage_banks',
    label: 'ایجاد و ویرایش بانک‌ها',
    category: 'بانک‌ها',
    description: 'تعریف بانک جدید یا تغییر شماره کارت و موجودی اولیه',
  },
  {
    id: 'approve_transactions',
    label: 'تأیید یا رد تراکنش‌های معلق',
    category: 'بانک‌ها',
    description: 'تأیید اسناد معلق بانکی یا معامله و اعمال به حساب مشتری',
  },

  // Operations & Reporting
  {
    id: 'view_cashbox',
    label: 'مشاهده دخل نقدی (صندوق)',
    category: 'عملیات مالی',
    description: 'دیدن موجودی فیزیکی صندوق صرافی به تفکیک ارزها',
  },
  {
    id: 'view_balance',
    label: 'مشاهده بلانس و تراز',
    category: 'عملیات مالی',
    description: 'دیدن تراز کل طلب‌ها، بدهی‌ها و وضعیت دارایی‌ها',
  },
  {
    id: 'view_reports',
    label: 'مشاهده گزارشات مالی',
    category: 'عملیات مالی',
    description: 'گزارش سود و زیان، دفاتر و عملکرد روزانه',
  },
];

// Default permissions assigned to standard employee
export const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermission[] = [
  'view_customers',
  'manage_customers',
  'view_customer_accounts',
  'create_trades',
  'view_trades',
  'create_entries',
  'view_entries',
  'create_bank_tx',
  'view_banks',
  'view_reports',
];

export class AuthService {
  /**
   * Initializes super admin user if not present.
   * Username: adminsaraf
   * Password: admin2026@
   */
  static initializeRootAdmin(): void {
    const users = DatabaseService.getUsers();
    const adminExists = users.some((u) => u.role === 'admin');

    if (!adminExists) {
      const rootAdmin: User = {
        id: 'usr_super_admin',
        username: 'adminsaraf',
        name: 'مدیر کل صرافی',
        role: 'admin',
        status: 'active',
        passwordHash: DEFAULT_ADMIN_HASH,
        salt: DEFAULT_ADMIN_SALT,
        permissions: ALL_PERMISSIONS.map((p) => p.id),
        createdAt: new Date().toISOString(),
      };
      DatabaseService.saveUsers([rootAdmin, ...users.filter((u) => u.username !== 'admin')]);
    } else {
      // Ensure existing admin has passwordHash and salt
      const admin = users.find((u) => u.role === 'admin')!;
      if (!admin.passwordHash || !admin.salt) {
        admin.passwordHash = DEFAULT_ADMIN_HASH;
        admin.salt = DEFAULT_ADMIN_SALT;
        admin.status = 'active';
        if (!admin.username) admin.username = 'adminsaraf';
        DatabaseService.saveUsers(users);
      }
    }
  }

  /**
   * Authenticate user with username and password
   */
  static login(
    usernameInput: string,
    passwordInput: string
  ): { success: boolean; user?: User; error?: string; remainingSeconds?: number } {
    AuthService.initializeRootAdmin();

    // Check brute force protection
    const lockStatus = BruteForceGuard.isLocked();
    if (lockStatus.locked) {
      const mins = Math.ceil(lockStatus.remainingSeconds / 60);
      return {
        success: false,
        error: `به دلیل ۵ بار تلاش ناموفق، ورود به سیستم مسدود شده است. لطفاً ${mins} دقیقه دیگر تلاش فرمایید.`,
        remainingSeconds: lockStatus.remainingSeconds,
      };
    }

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: 'لطفاً نام کاربری و رمز عبور را وارد کنید.' };
    }

    const users = DatabaseService.getUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      const guard = BruteForceGuard.recordFailedAttempt();
      if (guard.locked) {
        return {
          success: false,
          error: 'تعداد دفعات ورود اشتباه بیش از حد مجاز بود. سیستم به مدت ۵ دقیقه مسدود شد.',
          remainingSeconds: guard.remainingSeconds,
        };
      }
      return {
        success: false,
        error: `نام کاربری یا رمز عبور اشتباه است. (فرصت‌های باقیمانده: ${guard.attemptsLeft})`,
      };
    }

    // Check if account is active
    if (user.status === 'inactive') {
      return {
        success: false,
        error: 'حساب کاربری شما توسط مدیر کل غیرفعال شده است. لطفاً با مدیر صرافی تماس بگیرید.',
      };
    }

    // Verify Password Hash
    const isValid = verifyPassword(cleanPassword, user.salt || '', user.passwordHash || '');
    if (!isValid) {
      const guard = BruteForceGuard.recordFailedAttempt();
      if (guard.locked) {
        return {
          success: false,
          error: 'تعداد دفعات ورود اشتباه بیش از حد مجاز بود. سیستم به مدت ۵ دقیقه مسدود شد.',
          remainingSeconds: guard.remainingSeconds,
        };
      }
      return {
        success: false,
        error: `نام کاربری یا رمز عبور اشتباه است. (فرصت‌های باقیمانده: ${guard.attemptsLeft})`,
      };
    }

    // Successful login -> Reset lockout counter
    BruteForceGuard.reset();

    // Update user's last login
    user.lastLoginAt = new Date().toISOString();
    DatabaseService.saveUsers(users);

    // Save session
    const safeUser: User = {
      ...user,
      passwordHash: undefined,
      salt: undefined,
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
      sessionStorage.setItem(SESSION_TOKEN_KEY, 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
      localStorage.setItem('sarafi_last_auth_user', JSON.stringify(safeUser));
    } catch (e) {
      console.warn('Session storage write error:', e);
    }

    // Log Activity
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: user.id,
      userName: user.name,
      userRole: user.role === 'admin' ? 'مدیر کل' : 'کارمند',
      action: 'login',
      entity: 'auth',
      entityId: user.id,
      details: `ورود موفق به سیستم با حساب ${user.username} (${user.role === 'admin' ? 'مدیر کل' : 'کارمند'})`,
      status: 'success',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sarafi_auth_change'));
    }

    return { success: true, user: safeUser };
  }

  /**
   * Log out user and destroy session
   */
  static logout(): void {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      DatabaseService.addAuditLogDirect({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        timestamp: now.toISOString(),
        date: getAfghanTodayFull(),
        time: timeStr,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role === 'admin' ? 'مدیر کل' : 'کارمند',
        action: 'logout',
        entity: 'auth',
        entityId: currentUser.id,
        details: `خروج از سیستم (${currentUser.username})`,
        status: 'success',
      });
    }

    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem('sarafi_last_auth_user');
    } catch (e) {
      console.warn(e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sarafi_auth_change'));
    }
  }

  /**
   * Get currently authenticated user in session
   */
  static getCurrentUser(): User | null {
    try {
      const sessionRaw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem('sarafi_last_auth_user');
      if (!sessionRaw) return null;
      const parsed: User = JSON.parse(sessionRaw);

      // Verify user still exists in database and is active
      const dbUsers = DatabaseService.getUsers();
      const dbUser = dbUsers.find((u) => u.id === parsed.id);
      if (!dbUser || dbUser.status === 'inactive') {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem('sarafi_last_auth_user');
        return null;
      }

      // Return current db state without sensitive hash
      return {
        ...dbUser,
        passwordHash: undefined,
        salt: undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return AuthService.getCurrentUser() !== null;
  }

  /**
   * Check if user is Super Admin
   */
  static isSuperAdmin(): boolean {
    const user = AuthService.getCurrentUser();
    return user !== null && user.role === 'admin';
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(permission: UserPermission): boolean {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    if (user.status === 'inactive') return false;

    // Super Admin has unrestricted access to everything
    if (user.role === 'admin') return true;

    // Admin-exclusive features can NEVER be accessed by employee
    if (
      permission === 'manage_users' ||
      permission === 'manage_settings' ||
      permission === 'view_audit_logs' ||
      permission === 'change_admin_credentials'
    ) {
      return false;
    }

    return user.permissions.includes(permission);
  }

  /**
   * Change Super Admin Credentials (Username and/or Password)
   */
  static changeAdminCredentials(params: {
    currentPassword: string;
    newUsername: string;
    newPassword?: string;
  }): { success: boolean; error?: string } {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'فقط مدیر کل صرافی مجاز به تغییر اطلاعات مدیر است.' };
    }

    const cleanUsername = params.newUsername.trim();
    if (!cleanUsername) {
      return { success: false, error: 'نام کاربری جدید نمی‌تواند خالی باشد.' };
    }

    const users = DatabaseService.getUsers();
    const adminIndex = users.findIndex((u) => u.id === currentUser.id && u.role === 'admin');
    if (adminIndex === -1) {
      return { success: false, error: 'حساب مدیر کل در سیستم یافت نشد.' };
    }

    const admin = users[adminIndex];

    // Verify current password
    const isCurrentValid = verifyPassword(params.currentPassword, admin.salt || '', admin.passwordHash || '');
    if (!isCurrentValid) {
      return { success: false, error: 'رمز عبور فعلی مدیر کل اشتباه است.' };
    }

    // Check if new username is taken by someone else
    const usernameTaken = users.some(
      (u) => u.id !== admin.id && u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (usernameTaken) {
      return { success: false, error: 'این نام کاربری قبلاً برای کاربر دیگری ثبت شده است.' };
    }

    admin.username = cleanUsername;

    // If new password provided, re-hash with a fresh salt
    if (params.newPassword && params.newPassword.trim() !== '') {
      const newPass = params.newPassword.trim();
      if (newPass.length < 6) {
        return { success: false, error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' };
      }
      const newSalt = generateSalt();
      const newHash = hashPassword(newPass, newSalt);
      admin.salt = newSalt;
      admin.passwordHash = newHash;
    }

    admin.updatedAt = new Date().toISOString();
    users[adminIndex] = admin;
    DatabaseService.saveUsers(users);

    // Update active session
    const safeUser: User = { ...admin, passwordHash: undefined, salt: undefined };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    localStorage.setItem('sarafi_last_auth_user', JSON.stringify(safeUser));

    // Audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: admin.id,
      userName: admin.name,
      userRole: 'مدیر کل',
      action: 'password_change',
      entity: 'user',
      entityId: admin.id,
      details: `تغییر اطلاعات ورود مدیر کل (نام کاربری جدید: ${cleanUsername})`,
      status: 'success',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sarafi_auth_change'));
    }

    return { success: true };
  }

  /**
   * Create a new employee account (Super Admin only)
   */
  static createEmployee(data: {
    name: string;
    username: string;
    password: string;
    phone?: string;
    permissions: UserPermission[];
    status?: 'active' | 'inactive';
  }): { success: boolean; error?: string; user?: User } {
    if (!AuthService.isSuperAdmin()) {
      return { success: false, error: 'تنها مدیر کل صرافی مجاز به ایجاد کارمند جدید است.' };
    }

    const cleanUsername = data.username.trim().toLowerCase();
    const cleanName = data.name.trim();
    const cleanPassword = data.password.trim();

    if (!cleanName) return { success: false, error: 'لطفاً نام کارمند را وارد کنید.' };
    if (!cleanUsername) return { success: false, error: 'لطفاً نام کاربری را وارد کنید.' };
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: 'رمز عبور کارمند باید حداقل ۶ کاراکتر باشد.' };
    }

    const users = DatabaseService.getUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'این نام کاربری قبلاً ثبت شده است. نام کاربری دیگری انتخاب کنید.' };
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(cleanPassword, salt);

    const newEmployee: User = {
      id: 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      username: cleanUsername,
      role: 'employee',
      status: data.status || 'active',
      phone: data.phone?.trim(),
      permissions: data.permissions || DEFAULT_EMPLOYEE_PERMISSIONS,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    users.push(newEmployee);
    DatabaseService.saveUsers(users);

    // Audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentAdmin = AuthService.getCurrentUser()!;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userRole: 'مدیر کل',
      action: 'create',
      entity: 'user',
      entityId: newEmployee.id,
      details: `ایجاد کارمند جدید: ${newEmployee.name} (${newEmployee.username}) با ${newEmployee.permissions.length} مجوز`,
      status: 'success',
    });

    return { success: true, user: newEmployee };
  }

  /**
   * Update employee permissions, name, phone, or status
   */
  static updateEmployee(
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      status?: 'active' | 'inactive';
      permissions?: UserPermission[];
    }
  ): { success: boolean; error?: string } {
    if (!AuthService.isSuperAdmin()) {
      return { success: false, error: 'فقط مدیر کل صرافی مجاز به ویرایش دسترسی کارمندان است.' };
    }

    const users = DatabaseService.getUsers();
    const empIndex = users.findIndex((u) => u.id === userId);
    if (empIndex === -1) {
      return { success: false, error: 'کارمند مورد نظر یافت نشد.' };
    }

    const emp = users[empIndex];
    if (emp.role === 'admin') {
      return { success: false, error: 'دسترسی مدیر کل از این بخش قابل تغییر نیست.' };
    }

    if (updates.name !== undefined) emp.name = updates.name.trim();
    if (updates.phone !== undefined) emp.phone = updates.phone.trim();
    if (updates.status !== undefined) emp.status = updates.status;
    if (updates.permissions !== undefined) emp.permissions = updates.permissions;
    emp.updatedAt = new Date().toISOString();

    users[empIndex] = emp;
    DatabaseService.saveUsers(users);

    // Audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentAdmin = AuthService.getCurrentUser()!;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userRole: 'مدیر کل',
      action: 'update',
      entity: 'user',
      entityId: emp.id,
      details: `ویرایش کارمند ${emp.name} (${emp.username}) - وضعیت: ${emp.status === 'active' ? 'فعال' : 'غیرفعال'}`,
      status: 'success',
    });

    return { success: true };
  }

  /**
   * Reset employee password (Super Admin only)
   */
  static resetEmployeePassword(
    userId: string,
    newPasswordRaw: string
  ): { success: boolean; error?: string } {
    if (!AuthService.isSuperAdmin()) {
      return { success: false, error: 'فقط مدیر کل صرافی مجاز به تغییر رمز کارمندان است.' };
    }

    const cleanPass = newPasswordRaw.trim();
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' };
    }

    const users = DatabaseService.getUsers();
    const empIndex = users.findIndex((u) => u.id === userId);
    if (empIndex === -1) {
      return { success: false, error: 'کارمند یافت نشد.' };
    }

    const emp = users[empIndex];
    const salt = generateSalt();
    emp.salt = salt;
    emp.passwordHash = hashPassword(cleanPass, salt);
    emp.updatedAt = new Date().toISOString();

    users[empIndex] = emp;
    DatabaseService.saveUsers(users);

    // Audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentAdmin = AuthService.getCurrentUser()!;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userRole: 'مدیر کل',
      action: 'password_change',
      entity: 'user',
      entityId: emp.id,
      details: `تغییر و بازنشانی رمز عبور کارمند: ${emp.name} (${emp.username})`,
      status: 'success',
    });

    return { success: true };
  }

  /**
   * Delete an employee account
   */
  static deleteEmployee(userId: string): { success: boolean; error?: string } {
    if (!AuthService.isSuperAdmin()) {
      return { success: false, error: 'فقط مدیر کل مجاز به حذف حساب کارمندان است.' };
    }

    const users = DatabaseService.getUsers();
    const emp = users.find((u) => u.id === userId);
    if (!emp) return { success: false, error: 'کارمند یافت نشد.' };
    if (emp.role === 'admin') return { success: false, error: 'حذف حساب مدیر کل امکان‌پذیر نیست.' };

    const filtered = users.filter((u) => u.id !== userId);
    DatabaseService.saveUsers(filtered);

    // Audit log
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentAdmin = AuthService.getCurrentUser()!;
    DatabaseService.addAuditLogDirect({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: currentAdmin.id,
      userName: currentAdmin.name,
      userRole: 'مدیر کل',
      action: 'delete',
      entity: 'user',
      entityId: emp.id,
      details: `حذف حساب کارمند: ${emp.name} (${emp.username})`,
      status: 'success',
    });

    return { success: true };
  }
}
