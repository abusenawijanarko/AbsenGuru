import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { AppUser, AttendanceRecord, AttendanceStatus } from '../types';
import { SCHOOL_LAT, SCHOOL_LNG } from '../utils/geoFaceHelpers';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  Download, 
  Edit3, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  FileSpreadsheet,
  MapPin,
  ClipboardPen
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing status modal states
  const [editingLog, setEditingLog] = useState<AttendanceRecord | null>(null);
  const [editingTeacherName, setEditingTeacherName] = useState('');
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('tepat_waktu');
  const [newNotes, setNewNotes] = useState('');
  const [newCheckIn, setNewCheckIn] = useState('07:15');
  const [newCheckOut, setNewCheckOut] = useState('15:30');

  // Daily statistics counts
  const [stats, setStats] = useState({
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all users
      const allUsers = await dbService.getAllUsers();
      const allTeachersList = allUsers.filter(u => u.role === 'guru');
      setTeachers(allTeachersList);

      // 2. Fetch daily attendance records
      const logs = await dbService.getDailyAttendance(selectedDate);
      setAttendanceLogs(logs);

      // 3. Compile statistics
      let hadir = 0;
      let terlambat = 0;
      let tidakHadir = 0;

      // Map to track who checked in
      const checkedInUids = new Set(logs.map(l => l.uid));

      logs.forEach(log => {
        if (log.status === 'tepat_waktu') hadir++;
        else if (log.status === 'terlambat') terlambat++;
        else if (log.status === 'tidak_hadir') tidakHadir++;
      });

      // Active teachers who have NOT logged in yet count as "Tidak Hadir/Alpa"
      allTeachersList.forEach(t => {
        if (t.is_active && !checkedInUids.has(t.uid)) {
          tidakHadir++;
        }
      });

      setStats({ hadir, terlambat, tidakHadir });
    } catch (e) {
      console.error('Failed to load admin daily log listings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Combine teachers and their corresponding logs for display
  const getDislayLogs = (): (AttendanceRecord & { teacherProfile: AppUser })[] => {
    const combined = teachers.map(t => {
      const log = attendanceLogs.find(l => l.uid === t.uid);
      
      const defaultRecord: AttendanceRecord = {
        id: `${t.uid}_${selectedDate}`,
        uid: t.uid,
        date: selectedDate,
        status: 'tidak_hadir',
        notes: 'Belum melakukan absensi mandiri'
      };

      return {
        ...(log || defaultRecord),
        teacherName: t.full_name,
        teacherEmail: t.email,
        teacherPhone: t.phone,
        teacherProfile: t
      };
    });

    // Apply search matches on text names or emails
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return combined.filter(l => 
        l.teacherName?.toLowerCase().includes(q) || 
        l.teacherEmail?.toLowerCase().includes(q)
      );
    }

    return combined;
  };

  // Status correction operation
  const openEditModal = (log: AttendanceRecord, teacherName: string) => {
    setEditingLog(log);
    setEditingTeacherName(teacherName);
    setNewStatus(log.status);
    setNewNotes(log.notes || '');
    setNewCheckIn(log.check_in_time || '07:15');
    setNewCheckOut(log.check_out_time || '15:30');
  };

  const handleSaveStatusOverride = async () => {
    if (!editingLog) return;
    try {
      const payload: AttendanceRecord = {
        ...editingLog,
        status: newStatus,
        notes: newNotes || 'Koreksi administratif oleh Admin',
        check_in_time: newStatus === 'tidak_hadir' ? undefined : newCheckIn,
        check_out_time: newStatus === 'tidak_hadir' ? undefined : newCheckOut,
        modified_by_admin: true,
        modified_at: new Date().toISOString()
      };

      // Set placeholder coordinates if marked present manually
      if (newStatus !== 'tidak_hadir') {
        payload.lat_in = payload.lat_in || SCHOOL_LAT;
        payload.lng_in = payload.lng_in || SCHOOL_LNG;
        payload.face_verified_in = payload.face_verified_in ?? true;
        payload.is_within_area = payload.is_within_area ?? true;
      }

      await dbService.saveAttendanceRecord(payload);
      setEditingLog(null);
      await loadData();
    } catch (err) {
      console.error('Override save failed:', err);
    }
  };

  // Compile and prompt standard `.csv` download link in browser
  const handleExportCSV = () => {
    const currentList = getDislayLogs();
    
    // Header string
    const headers = ['Nama Guru', 'Email', 'No HP', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Koordinat GPS', 'Catatan', 'Konfirmasi Admin'];
    
    const rows = currentList.map(item => [
      item.teacherName || '',
      item.teacherEmail || '',
      item.teacherPhone || '',
      item.date,
      item.check_in_time || '-',
      item.check_out_time || '-',
      item.status === 'tepat_waktu' ? 'Tepat Waktu' : item.status === 'terlambat' ? 'Terlambat' : 'Tidak Hadir',
      item.lat_in ? `${item.lat_in};${item.lng_in}` : '-',
      item.notes || '-',
      item.modified_by_admin ? 'YA (Koreksi)' : 'TIDAK (Biometrik)'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Presensi_IDN_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'tepat_waktu':
         return (
           <span className="p-1 px-[10px] bg-emerald-50 text-emerald-700 leading-relaxed font-bold border border-emerald-100 rounded-lg text-[11px]">
             Tepat Waktu
           </span>
         );
      case 'terlambat':
        return (
          <span className="p-1 px-[10px] bg-amber-50 text-amber-700 leading-relaxed font-bold border border-amber-100 rounded-lg text-[11px]">
            Terlambat
          </span>
        );
      case 'tidak_hadir':
        return (
          <span className="p-1 px-[10px] bg-rose-50 text-rose-700 leading-relaxed font-bold border border-rose-100 rounded-lg text-[11px]">
            Tidak Hadir
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6" id="admin-daily-dashboard">
      {/* 1. Filtering toolbar of dates */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="admin_dashboard_toolbar">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-1.5 select-none">
            <ClipboardPen className="w-5.5 h-5.5 text-primary" /> Kehadiran Harian Guru
          </h2>
          <p className="text-xs text-slate-500 font-medium">Pantau absensi biometrik harian guru Politeknik IDN.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto" id="toolbar_actions">
          {/* Calendar Picker for Date */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input 
              id="date-navigator"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none border-none text-slate-700 font-mono cursor-pointer"
            />
          </div>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="p-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98 shrink-0"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* 2. Today Summary KPI widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="daily_kpi_metrics">
        <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Total Guru Aktif</span>
            <div className="text-xl font-black text-slate-800 mt-1">{teachers.filter(t => t.is_active).length}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Tepat Waktu</span>
            <div className="text-xl font-black text-emerald-600 mt-1">{stats.hadir}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Terlambat</span>
            <div className="text-xl font-black text-amber-600 mt-1">{stats.terlambat}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Tidak Hadir (Alpa)</span>
            <div className="text-xl font-black text-rose-600 mt-1">{stats.tidakHadir}</div>
          </div>
        </div>
      </div>

      {/* 3. Core Table of teacher logs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5" id="main_schedule_table_container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4.5" id="table_actions_bar">
          <h3 className="font-black text-slate-800 tracking-tight text-sm select-none">
            Daftar Kehadiran Periode Presensi
          </h3>

          <div className="relative w-full sm:w-60" id="search_box_wrapper">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-teacher-input"
              type="text"
              placeholder="Cari guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-primary/50 text-xs rounded-xl focus:outline-none transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="w-full flex justify-center py-12" id="attendance_loading_state">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full" id="attendance_table_viewport">
            {getDislayLogs().length === 0 ? (
              <div className="text-center py-10 text-slate-400" id="empty-results-statement">Tidak ada data guru/absen yang cocok dengan pencarian Anda.</div>
            ) : (
              <table className="w-full border-collapse text-left" id="attendance_data_table">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                    <th className="pb-3 bg-white font-black">Informasi Guru</th>
                    <th className="pb-3 bg-white font-black text-center">Masuk</th>
                    <th className="pb-3 bg-white font-black text-center">Pulang</th>
                    <th className="pb-3 bg-white font-black text-center">Status</th>
                    <th className="pb-3 bg-white font-black">Catatan Guru</th>
                    <th className="pb-3 bg-white font-black text-right">Opsi Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-650" id="teacher_logs_tbody">
                  {getDislayLogs().map((item) => (
                    <tr key={item.uid} className="hover:bg-slate-50/50 transition">
                      {/* Guru Profil */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden text-slate-600 shrink-0 flex items-center justify-center font-bold font-sans select-none border border-slate-200">
                            {item.teacherProfile.photo_url ? (
                              <img src={item.teacherProfile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              item.teacherProfile.full_name.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 leading-snug">{item.teacherName}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{item.teacherEmail} {!item.teacherProfile.is_active && '• (Nonaktif)'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Check In */}
                      <td className="py-3.5 text-center font-mono font-bold text-slate-700">
                        {item.check_in_time ? (
                          <span className="bg-slate-50 p-1 px-2.5 rounded-lg border border-slate-100 text-[11px]">{item.check_in_time}</span>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>

                      {/* Check Out */}
                      <td className="py-3.5 text-center font-mono font-bold text-slate-700">
                        {item.check_out_time ? (
                          <span className="bg-slate-50 p-1 px-2.5 rounded-lg border border-slate-100 text-[11px]">{item.check_out_time}</span>
                        ) : (
                          <span className="text-slate-350">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 text-center select-none">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Notes with limit */}
                      <td className="py-3.5 max-w-[200px] truncate pr-4">
                        <span className="text-slate-500 italic">"{item.notes || 'Hadir mengajar rutin'}"</span>
                        {item.modified_by_admin && (
                          <div className="text-[10px] text-blue-650 font-bold mt-1">Dicatat Admin</div>
                        )}
                      </td>

                      {/* Action trigger */}
                      <td className="py-3.5 text-right">
                        <button
                          id={`edit-status-btn-${item.uid}`}
                          onClick={() => openEditModal(item, item.teacherName || '')}
                          disabled={!item.teacherProfile.is_active}
                          className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-slate-700 text-[11px] flex items-center gap-1 leading-relaxed transition ml-auto disabled:opacity-40 select-none"
                        >
                          <Edit3 className="w-3 h-3 text-slate-650" />
                          Ubah Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 4. Correcting logs overlay popup modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="override_status_dialog">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200" id="dialog_content">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4" id="dialog_header">
              <h3 className="text-base font-black text-slate-800">Koreksi Kehadiran Administratif</h3>
              <button 
                id="close-modal-btn"
                onClick={() => setEditingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-650 transition rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 text-xs" id="dialog_form">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Nama Guru</label>
                <span className="text-sm font-black text-slate-800 font-sans">{editingTeacherName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3" id="edit-timestamps">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-600">Pukul Masuk (Check-In)</label>
                  <input
                    id="new-checkin-input"
                    type="text"
                    placeholder="07:15"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    disabled={newStatus === 'tidak_hadir'}
                    className="p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none font-mono font-bold text-slate-700 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-600">Pukul Pulang (Check-Out)</label>
                  <input
                    id="new-checkout-input"
                    type="text"
                    placeholder="15:30"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    disabled={newStatus === 'tidak_hadir'}
                    className="p-2.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none font-mono font-bold text-slate-700 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-600">Pilih Status Baru</label>
                <div className="grid grid-cols-3 gap-2" id="status-choices-container">
                  {(['tepat_waktu', 'terlambat', 'tidak_hadir'] as const).map(style => (
                    <button
                      id={`status-choice-${style}`}
                      key={style}
                      type="button"
                      onClick={() => setNewStatus(style)}
                      className={`p-2 py-2.5 rounded-xl font-bold transition text-center ${
                        newStatus === style 
                          ? 'bg-primary text-white shadow-sm' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {style === 'tepat_waktu' ? 'Tepat Waktu' : style === 'terlambat' ? 'Terlambat' : 'Tidak Hadir'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-600">Keterangan/Alasan Koreksi</label>
                <textarea
                  id="new-notes-textarea"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Misalnya: 'Surat dokter terlampir', 'Mencatat absen manual karena HP rusak', dll."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:outline-none text-xs rounded-xl h-20 resize-none font-sans text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <button
                id="save-override-btn"
                onClick={handleSaveStatusOverride}
                className="w-full mt-2 py-3 bg-primary hover:bg-primary/95 text-white font-black text-center rounded-xl cursor-pointer shadow-sm transition active:scale-98"
              >
                SIMPAN PERUBAHAN STATUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
