import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isDemo, setDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErr('Harap lengkapi semua bidang.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await login(email, password);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string, roleName: string) => {
    setLoading(true);
    setErr(null);
    try {
      await login(targetEmail, 'password123');
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[85vh] px-4 py-8" id="login_screen_wrapper">
      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-6" id="login_card_inner">
        {/* Branding Title */}
        <div className="text-center flex flex-col items-center" id="idn_logo_and_brand">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3.5 text-white font-black text-2xl border border-primary/20 shadow-lg shadow-blue-100 select-none">
            AG
          </div>
          <h1 className="text-2.5xl font-black tracking-tight text-slate-850">AbsenGuru</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-primary mt-1.5 leading-none">Politeknik IDN Boarding School</p>
        </div>

        {isDemo && (
          <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-2xl text-xs text-amber-900" id="demo_indicator_login">
            <div className="flex items-center gap-1.5 font-bold mb-1 col-span-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Sistem dalam Mode Simulasi Offline</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 mb-2">
              Hubungkan Firebase di panel samping untuk menggunakan cloud asli. Saat ini Anda dapat menguji seluruh alur kerja menggunakan akun sampel di bawah ini.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                id="quick-login-admin"
                type="button"
                onClick={() => handleQuickLogin('Maskokolive@gmail.com', 'Admin')}
                className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Masuk Admin
              </button>
              <button
                id="quick-login-guru"
                type="button"
                onClick={() => handleQuickLogin('ahmad@idn.sch.id', 'Guru')}
                className="p-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Masuk Guru
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-700 flex gap-2 items-center" id="credentials_error_banner">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="login_form">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input 
                id="email-input"
                type="email"
                placeholder="nama@idn.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="w-full flex justify-between">
              <label className="text-xs font-semibold text-slate-600">Kata Sandi</label>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input 
                id="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition"
                required
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-primary hover:bg-primary/95 font-bold text-white rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5" />
                MASUK SEKARANG
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-400 font-sans mt-2">
          Gunakan sandi default <code className="p-0.5 px-1 bg-slate-100 rounded text-slate-600 font-mono">password123</code> untuk testing user demo apa saja.
        </div>
      </div>
    </div>
  );
};
