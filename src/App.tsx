import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { GuruHomeView } from './components/GuruHomeView';
import { GuruHistoryView } from './components/GuruHistoryView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminRekapView } from './components/AdminRekapView';
import { AdminKelolaGuruView } from './components/AdminKelolaGuruView';

import { 
  LogOut, 
  MapPin, 
  Contact, 
  Sparkles, 
  LayoutDashboard, 
  History, 
  ClipboardCheck, 
  ShieldAlert, 
  ChevronDown,
  UsersRound,
  FileBarChart,
  Grid3X3
} from 'lucide-react';

// Core Navigation Component that renders workspaces
const MainWorkspace: React.FC = () => {
  const { currentUser, logout, isDemo, setDemoUser } = useAuth();
  
  // Navigation tabs selection
  const [activeTeacherPage, setActiveTeacherPage] = useState<'absen' | 'riwayat'>('absen');
  const [activeAdminPage, setActiveAdminPage] = useState<'dashboard' | 'rekap' | 'kelola'>('dashboard');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app_main_workspace">
      {/* 1. Floating Simulator Bar shown only in local demo mode */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-2.5 text-xs text-center border-b border-amber-650 flex flex-wrap items-center justify-center gap-2 shadow-sm font-sans z-50 select-none" id="sim_bar_header">
          <div className="flex items-center gap-1.5 font-extrabold mr-2 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-[spin_4s_linear_infinite]" />
            <span>KONSOL SIMULASI GURU & ADMIN</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" id="sim_account_toggles">
            <span className="text-slate-100 mr-1 text-[11px]">Ganti Akun:</span>
            <button
              id="switch-sim-admin"
              onClick={() => { setDemoUser('demo_admin'); setUserMenuOpen(false); }}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-black tracking-wide border cursor-pointer transition ${
                currentUser.role === 'admin' 
                  ? 'bg-white text-slate-800 border-white font-extrabold' 
                  : 'bg-transparent text-slate-100 hover:bg-white/10 border-white/20'
              }`}
            >
              ADMIN
            </button>
            <button
              id="switch-sim-ahmad"
              onClick={() => { setDemoUser('guru_ahmad'); setUserMenuOpen(false); }}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-black tracking-wide border cursor-pointer transition ${
                currentUser.uid === 'guru_ahmad' 
                  ? 'bg-white text-slate-800 border-white font-extrabold' 
                  : 'bg-transparent text-slate-100 hover:bg-white/10 border-white/20'
              }`}
            >
              PAK AHMAD (GURU)
            </button>
            <button
              id="switch-sim-siti"
              onClick={() => { setDemoUser('guru_siti'); setUserMenuOpen(false); }}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-black tracking-wide border cursor-pointer transition ${
                currentUser.uid === 'guru_siti' 
                  ? 'bg-white text-slate-800 border-white font-extrabold' 
                  : 'bg-transparent text-slate-100 hover:bg-white/10 border-white/20'
              }`}
            >
              BU SITI (GURU)
            </button>
            <button
              id="switch-sim-bambang"
              onClick={() => { setDemoUser('guru_bambang'); setUserMenuOpen(false); }}
              className={`p-1 px-2.5 rounded-lg text-[10px] font-black tracking-wide border cursor-pointer transition ${
                currentUser.uid === 'guru_bambang' 
                  ? 'bg-white text-slate-800 border-white font-extrabold' 
                  : 'bg-transparent text-slate-100 hover:bg-white/10 border-white/20'
              }`}
            >
              PAK BAMBANG (NONAKTIF)
            </button>
          </div>
        </div>
      )}

      {/* 2. Global Top Navbar */}
      <nav className="bg-primary text-white shadow-md sticky top-0 z-40 select-none pb-0.5" id="primary_navbar">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex justify-between items-center" id="nav_bounds">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTeacherPage('absen'); setActiveAdminPage('dashboard'); }} id="nav-brand">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-primary select-none shrink-0">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-white text-[11px] font-sans">AG</div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white leading-none">AbsenGuru</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-white/75 mt-0.5 leading-none">Politeknik IDN Boarding School</span>
            </div>
          </div>

          {/* Core Menu Tabs (Desktop Roles Workspace) */}
          <div className="hidden md:flex items-center gap-1.5" id="desktop_tab_bar">
            {currentUser.role === 'admin' ? (
              <>
                <button
                  id="tab-admin-dashboard"
                  onClick={() => setActiveAdminPage('dashboard')}
                  className={`p-2 px-4 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                    activeAdminPage === 'dashboard' 
                      ? 'bg-white/20 text-white font-extrabold shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard Harian
                </button>
                <button
                  id="tab-admin-rekap"
                  onClick={() => setActiveAdminPage('rekap')}
                  className={`p-2 px-4 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                    activeAdminPage === 'rekap' 
                      ? 'bg-white/20 text-white font-extrabold shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileBarChart className="w-4 h-4" /> Rekap & Laporan
                </button>
                <button
                  id="tab-admin-kelola"
                  onClick={() => setActiveAdminPage('kelola')}
                  className={`p-2 px-4 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                    activeAdminPage === 'kelola' 
                      ? 'bg-white/20 text-white font-extrabold shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <UsersRound className="w-4 h-4" /> Kelola Guru
                </button>
              </>
            ) : (
              <>
                <button
                  id="tab-guru-absen"
                  onClick={() => setActiveTeacherPage('absen')}
                  className={`p-2 px-4 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                    activeTeacherPage === 'absen' 
                      ? 'bg-white/20 text-white font-extrabold shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" /> Ambil Presensi
                </button>
                <button
                  id="tab-guru-riwayat"
                  onClick={() => setActiveTeacherPage('riwayat')}
                  className={`p-2 px-4 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                    activeTeacherPage === 'riwayat' 
                      ? 'bg-white/20 text-white font-extrabold shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <History className="w-4 h-4" /> Riwayat Log
                </button>
              </>
            )}
          </div>

          {/* User Profile Dropdown Drop Menu */}
          <div className="relative" id="profile_menu_container">
            <button
              id="profile-dropdown-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 hover:bg-white/10 p-1.5 px-3 rounded-xl transition cursor-pointer text-white"
            >
              <div className="w-8 h-8 rounded-full bg-[#43A047] border border-white/60 flex items-center justify-center font-bold text-xs shrink-0 select-none uppercase">
                {currentUser.full_name.charAt(0)}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-white max-w-28 truncate">{currentUser.full_name.split(' ')[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl p-2 flex flex-col gap-1 z-50 text-xs animate-in slide-in-from-top-1.5 duration-150 text-slate-800" id="nav_user_dropdown_menu">
                <div className="p-2 border-b border-slate-100 mb-1" id="dropdown_header">
                  <span className="font-bold text-slate-800 block leading-tight">{currentUser.full_name}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block capitalize">Role: {currentUser.role}</span>
                </div>
                <button
                  id="signout-trigger-btn"
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="w-full text-left p-2.5 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Keluar / Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sub Navbar (Sticky on smaller devices only) */}
      <div className="flex md:hidden bg-white border-b border-slate-100 p-1 sticky top-14 z-35 select-none text-xs" id="mobile_tabs_bar">
        {currentUser.role === 'admin' ? (
          <>
            <button
              id="tab-mobile-admin-dashboard"
              onClick={() => setActiveAdminPage('dashboard')}
              className={`flex-1 py-3 text-center font-black ${
                activeAdminPage === 'dashboard' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              Harian
            </button>
            <button
              id="tab-mobile-admin-rekap"
              onClick={() => setActiveAdminPage('rekap')}
              className={`flex-1 py-3 text-center font-black ${
                activeAdminPage === 'rekap' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              Statistik
            </button>
            <button
              id="tab-mobile-admin-kelola"
              onClick={() => setActiveAdminPage('kelola')}
              className={`flex-1 py-3 text-center font-black ${
                activeAdminPage === 'kelola' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              Kelola Guru
            </button>
          </>
        ) : (
          <>
            <button
              id="tab-mobile-guru-absen"
              onClick={() => setActiveTeacherPage('absen')}
              className={`flex-1 py-3 text-center font-black ${
                activeTeacherPage === 'absen' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              Presensi
            </button>
            <button
              id="tab-mobile-guru-riwayat"
              onClick={() => setActiveTeacherPage('riwayat')}
              className={`flex-1 py-3 text-center font-black ${
                activeTeacherPage === 'riwayat' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              Riwayat Saya
            </button>
          </>
        )}
      </div>

      {/* 3. Main Body Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6" id="app_content_body">
        {currentUser.role === 'admin' ? (
          <>
            {activeAdminPage === 'dashboard' && <AdminDashboardView />}
            {activeAdminPage === 'rekap' && <AdminRekapView />}
            {activeAdminPage === 'kelola' && <AdminKelolaGuruView />}
          </>
        ) : (
          <>
            {activeTeacherPage === 'absen' && <GuruHomeView />}
            {activeTeacherPage === 'riwayat' && <GuruHistoryView />}
          </>
        )}
      </main>

      {/* Footer Branding credits */}
      <footer className="bg-white border-t border-slate-100 py-4.5 text-center text-[10px] text-slate-400 font-sans select-none" id="footer-branding">
        <p>&copy; {new Date().getFullYear()} AbsenGuru Politeknik IDN Boarding School. Sistem Hak Cipta Dilindungi.</p>
        <p className="mt-1">Pintu Gerbang Absensi Biometrik Berbasis Pengenalan Wajah & Geofencing GPS Sekolah.</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainWorkspace />
    </AuthProvider>
  );
}
