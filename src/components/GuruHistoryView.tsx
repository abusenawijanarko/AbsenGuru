import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  FileText, 
  Filter, 
  ChevronRight,
  Sparkles,
  UserCheck
} from 'lucide-react';

export const GuruHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Date selector state
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;

  const [filterMonth, setFilterMonth] = useState<string>(monthStr);
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats summaries
  const [stats, setStats] = useState({
    tepatWaktu: 0,
    terlambat: 0,
    tidakHadir: 0
  });

  const monthsList = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const fetchLogs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const logs = await dbService.getTeacherAttendance(currentUser.uid);
      
      // Filter client-side by month/year matching
      const filtered = logs.filter(l => {
        const [y, m] = l.date.split('-');
        return y === filterYear.toString() && m === filterMonth;
      });

      setHistory(filtered);

      // Compute statistics tallies
      let tepatWaktu = 0;
      let terlambat = 0;
      let tidakHadir = 0;

      filtered.forEach(log => {
        if (log.status === 'tepat_waktu') tepatWaktu++;
        else if (log.status === 'terlambat') terlambat++;
        else if (log.status === 'tidak_hadir') tidakHadir++;
      });

      setStats({ tepatWaktu, terlambat, tidakHadir });
    } catch (e) {
      console.error('Failed to query teacher logs history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser, filterMonth, filterYear]);

  const parseIndonesianDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Manual parser if Date construction fails on older strings
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return dateString;
    }
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusStyle = (status: AttendanceStatus) => {
    switch (status) {
      case 'tepat_waktu':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'terlambat':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'tidak_hadir':
        return 'bg-rose-50 text-rose-800 border-rose-100';
    }
  };

  const statusLabels: Record<AttendanceStatus, string> = {
    tepat_waktu: 'Tepat Waktu',
    terlambat: 'Terlambat',
    tidak_hadir: 'Tidak Hadir'
  };

  return (
    <div className="flex flex-col gap-6" id="teacher-history-view">
      {/* Search and Period filters bar */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="history_filter_toolbar">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Riwayat Kehadiran Anda
          </h2>
          <p className="text-xs text-slate-500 font-medium">Lihat dan saring daftar kehadiran Anda per bulan.</p>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto" id="history_dropdowns">
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="month-select"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="p-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:outline-none focus:border-primary/50 transition cursor-pointer"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <select
            id="year-select"
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="p-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:outline-none focus:border-primary/50 transition cursor-pointer"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary Dashboard */}
      <div className="grid grid-cols-3 gap-3" id="history_quick_stats">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tepat Waktu</span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 mt-1">{stats.tepatWaktu}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Hari Kehadiran</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Terlambat</span>
          <span className="text-xl md:text-2xl font-black text-amber-600 mt-1">{stats.terlambat}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Hari Kehadiran</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tidak Hadir / Alpa</span>
          <span className="text-xl md:text-2xl font-black text-rose-600 mt-1">{stats.tidakHadir}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Hari Kerja</span>
        </div>
      </div>

      {/* Main logging lists */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100" id="history-logs-main-container">
        {loading ? (
          <div className="w-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="flex flex-col gap-4.5" id="history_records_grid">
            {history.map((log) => (
              <div 
                key={log.id} 
                className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-slate-50"
                id={`record-${log.id}`}
              >
                {/* Date and Basic Info */}
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 font-sans">{parseIndonesianDate(log.date)}</span>
                    {log.modified_by_admin && (
                      <span className="p-0.5 px-1.5 bg-blue-50 text-blue-700 font-bold border border-blue-150 text-[10px] rounded-md flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Dikoreksi Admin
                      </span>
                    )}
                  </div>
                  
                  {/* Notes mapping */}
                  <div className="text-xs text-slate-500 italic mt-1 leading-relaxed max-w-lg flex items-start gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Catatan: "{log.notes || 'Hadir mengajar rutin'}"</span>
                  </div>
                </div>

                {/* Grid Timestamps */}
                <div className="flex flex-wrap items-center gap-4.5 shrink-0" id="record-details-layout">
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Masuk:</span>
                    <span className="font-bold text-slate-700 font-mono bg-white border border-slate-200 p-1 px-2 rounded-lg">{log.check_in_time || '--:--'}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Pulang:</span>
                    <span className="font-bold text-slate-700 font-mono bg-white border border-slate-200 p-1 px-2 rounded-lg">{log.check_out_time || '--:--'}</span>
                  </div>

                  {log.lat_in && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-slate-500 font-medium">GPS:</span>
                      <span className="font-mono">{log.lat_in.toFixed(4)}, {log.lng_in?.toFixed(4)}</span>
                    </div>
                  )}

                  {/* Badged Status */}
                  <span className={`p-1 px-3 border rounded-xl text-xs font-bold leading-relaxed shrink-0 ${getStatusStyle(log.status)}`}>
                    {statusLabels[log.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium flex flex-col items-center gap-2" id="empty-history-indicator">
            <Info className="w-10 h-10 text-slate-300" />
            <span>Belum ada riwayat absensi terekam untuk periode {monthsList.find(m => m.value === filterMonth)?.label} {filterYear}.</span>
          </div>
        )}
      </div>
    </div>
  );
};
