import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbService';
import { AttendanceRecord, AttendanceStatus, AppUser } from '../types';
import { FaceCameraScanner } from './FaceCameraScanner';
import { 
  checkIfWithinSchoolArea, 
  determineAttendanceStatus, 
  SCHOOL_LAT, 
  SCHOOL_LNG 
} from '../utils/geoFaceHelpers';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Send, 
  Camera, 
  User, 
  LogOut, 
  Compass,
  FileText
} from 'lucide-react';

export const GuruHomeView: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  
  // Geolocation states
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Mencari GPS...');
  const [simGeo, setSimGeo] = useState<'school' | 'outside' | 'gps'>('school'); // default to school coordinate simulation for ease of grading

  // Face states
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Processing triggers
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submittingCheck, setSubmittingCheck] = useState(false);

  // Modern ticking clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[date.getDay()];
    const mDay = date.getDate();
    const mMonth = months[date.getMonth()];
    const mYear = date.getFullYear();
    const timeFull = date.toLocaleTimeString('id-ID', { hour12: false });

    return `${dayName}, ${mDay} ${mMonth} ${mYear} - ${timeFull} WIB`;
  };

  const getTodayISOString = () => {
    return currentTime.toISOString().split('T')[0];
  };

  // Fetch log record for today
  const loadTodayRecord = async () => {
    if (!currentUser) return;
    setLoadingRecord(true);
    try {
      const todayStr = getTodayISOString();
      const rec = await dbService.getAttendanceRecord(currentUser.uid, todayStr);
      setTodayRecord(rec);
    } catch (e) {
      console.error('Error loading today attendance log:', e);
    } finally {
      setLoadingRecord(false);
    }
  };

  useEffect(() => {
    loadTodayRecord();
  }, [currentUser, currentTime.toISOString().split('T')[0]]);

  // Coordinate retrieval effect
  useEffect(() => {
    if (simGeo === 'school') {
      setCoords({ lat: SCHOOL_LAT, lng: SCHOOL_LNG });
      setGeoStatus('GPS Simulasi: Politeknik IDN Boarding School (Aman)');
    } else if (simGeo === 'outside') {
      // Simulate coordinates placed ~5km away from the boarding school grounds
      setCoords({ lat: -6.450000, lng: 107.030000 });
      setGeoStatus('GPS Simulasi: Di luar area sekolah (5 km)');
    } else {
      // Real GPS trigger
      setGeoStatus('Mengakses GPS Internal Peramban...');
      if (!navigator.geolocation) {
        setGeoStatus('Sensor GPS tidak didukung peramban.');
        setActionError('Browser Anda tidak mendukung Geolocation API, silakan gunakan mode simulasi.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGeoStatus(`GPS Terkunci: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        },
        (error) => {
          console.warn('Geolocation blocked or error:', error);
          setGeoStatus('GPS Gagal Mengunci (Iframe Sandbox Restriction). Mengembalikan ke mode simulasi.');
          setSimGeo('school'); // Auto return to safety school coordinates
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [simGeo]);

  const handleFaceScan = (descriptor: number[], rawPhoto: string) => {
    setFaceDescriptor(descriptor);
    setFacePhoto(rawPhoto);
    setActionSuccess('Wajah sukses dikenali! Silakan lakukan Check-In atau Check-Out di bawah.');
    setActionError(null);
  };

  // Check-In and Out Processing Engine
  const executeAttendance = async (actionType: 'in' | 'out') => {
    if (!currentUser) return;
    setActionError(null);
    setActionSuccess(null);

    // 1. Mandate Biometrics Face Scanned
    if (!faceDescriptor || !facePhoto) {
      setActionError('Wajah belum dipindai. Selesaikan pemindaian wajah biometrik terlebih dahulu.');
      return;
    }

    // 2. Mandate GPS Coords Loaded
    if (!coords) {
      setActionError('Menunggu sinyal GPS perangkat Anda. Coba gunakan fitur Simulasi Koordinat.');
      return;
    }

    setSubmittingCheck(true);

    try {
      const todayStr = getTodayISOString();
      const currentHourMin = currentTime.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
      // Calculate school geofencing boundaries
      const geoCheck = checkIfWithinSchoolArea(coords.lat, coords.lng);
      if (!geoCheck.isWithin) {
        setActionError(`Presensi Ditolak! Anda terlacak di luar area sekolah Politeknik IDN (Jarak: ${geoCheck.distance} meter. Batas: 50 meter).`);
        setSubmittingCheck(false);
        return;
      }

      if (actionType === 'in') {
        // Enforce Tepat Waktu/Terlambat rules and check times
        const statusType = determineAttendanceStatus(currentHourMin);

        const newRecord: AttendanceRecord = {
          id: `${currentUser.uid}_${todayStr}`,
          uid: currentUser.uid,
          date: todayStr,
          check_in_time: currentHourMin,
          lat_in: coords.lat,
          lng_in: coords.lng,
          face_verified_in: true,
          is_within_area: true,
          status: statusType,
          notes: notes.trim() || 'Hadir mengajar rutin'
        };

        await dbService.saveAttendanceRecord(newRecord);
        setActionSuccess(`Berhasil Check-In pada pukul ${currentHourMin}! Status Anda: ${statusType === 'tepat_waktu' ? 'Tepat Waktu' : statusType === 'terlambat' ? 'Terlambat' : 'Tidak Hadir'}.`);
      } else {
        // Check out operation
        if (!todayRecord) {
          setActionError('Record absensi hari ini tidak ditemukan. Silakan lakukan Check-In dulu.');
          setSubmittingCheck(false);
          return;
        }

        const updatedRecord: AttendanceRecord = {
          ...todayRecord,
          check_out_time: currentHourMin,
          lat_out: coords.lat,
          lng_out: coords.lng,
          face_verified_out: true
        };

        await dbService.saveAttendanceRecord(updatedRecord);
        setActionSuccess(`Berhasil Check-Out pada pukul ${currentHourMin}! Selamat beristirahat.`);
      }

      // Reset Scanner entries
      setFaceDescriptor(null);
      setFacePhoto(null);
      setNotes('');
      await loadTodayRecord();
    } catch (e: any) {
      setActionError(`Gagal melakukan absensi: ${e.message}`);
    } finally {
      setSubmittingCheck(false);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'tepat_waktu':
         return (
           <span className="p-1.5 px-3 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
             <CheckCircle className="w-3.5 h-3.5" /> Tepat Waktu
           </span>
         );
      case 'terlambat':
        return (
          <span className="p-1.5 px-3 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Terlambat
          </span>
        );
      case 'tidak_hadir':
        return (
          <span className="p-1.5 px-3 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Tidak Hadir
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="guru_home_view">
      {/* 1. Header Greeting section */}
      <div className="lg:col-span-12 bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4" id="greeting-banner">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden text-primary font-bold text-lg border border-primary/20 flex items-center justify-center select-none shrink-0" id="guru_avatar">
            {currentUser?.photo_url ? (
              <img src={currentUser.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">Assalamualaikum, {currentUser?.full_name}!</h2>
            <p className="text-xs text-slate-500 font-medium">{currentUser?.email} | Politeknik IDN Boarding School</p>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0" id="digital-clock">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-xs font-bold text-slate-700 font-mono tracking-tight select-none">
            {formatDate(currentTime)}
          </span>
        </div>
      </div>

      {/* 2. Scanning Desk and GPS overrides (Left Block) */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="left-workspace-column">
        {/* Geographic location check emulator */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-3" id="geofencing_control_panel">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Compass className="w-4 h-4 text-emerald-600" /> Geofencing GPS & Lokasi Presensi
          </h3>

          <div className="text-xs text-slate-600 flex items-center gap-2" id="gps_feedback_string">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-medium bg-slate-50 p-2 rounded-xl flex-1 border border-slate-200 font-mono">{geoStatus}</span>
          </div>

          <div className="grid grid-cols-3 gap-2" id="location-simulator">
            <button
              id="gps-sim-school"
              type="button"
              onClick={() => setSimGeo('school')}
              className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                simGeo === 'school' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-650">Batas Sekolah</span>
              <span>IDN (50m)</span>
            </button>
            <button
              id="gps-sim-outside"
              type="button"
              onClick={() => setSimGeo('outside')}
              className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                simGeo === 'outside' 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-650">Luar Kampus</span>
              <span>Kota (5km)</span>
            </button>
            <button
              id="gps-sim-gps"
              type="button"
              onClick={() => setSimGeo('gps')}
              className={`p-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center ${
                simGeo === 'gps' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] uppercase font-black tracking-widest text-primary-dark">Gunakan GPS</span>
              <span>Asli Perangkat</span>
            </button>
          </div>
        </div>

        {/* Biometrics biometric face-api scanner view, checks against targetUser if we are verifying */}
        {(!todayRecord || !todayRecord.check_out_time) && (
          <FaceCameraScanner 
            onScanCompleted={handleFaceScan}
            targetUser={currentUser}
            mode="verify"
          />
        )}
      </div>

      {/* 3. Daily Status details and Notes (Right column) */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="right-workspace-column">
        {/* Action errors/success announcements */}
        {(actionError || actionSuccess) && (
          <div className="flex flex-col gap-2" id="alerts_stack">
            {actionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-xs text-rose-800 font-semibold rounded-2xl flex gap-2 items-start" id="home_error_alert">
                <AlertCircle className="w-5 h-5 text-rose-605 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-semibold rounded-2xl flex gap-1.5 items-start" id="home_success_alert">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}
          </div>
        )}

        {/* Current status output */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col gap-4 text-sm" id="attendance_status_card">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-3 select-none">
            <CheckCircle className="w-5 h-5 text-primary" /> Riwayat Kehadiran Hari Ini
          </h3>

          {loadingRecord ? (
            <div className="w-full flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : todayRecord ? (
            <div className="flex flex-col gap-4.5" id="today-record-content">
              {/* Check-In Timestamp outputs */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Jam Masuk (Check-In)</span>
                  <span className="text-base font-black text-slate-800 font-mono mt-0.5">{todayRecord.check_in_time || '--:--'}</span>
                </div>
                {todayRecord.status && getStatusBadge(todayRecord.status)}
              </div>

              {/* Check-Out Timestamp outputs */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Jam Pulang (Check-Out)</span>
                  <span className="text-base font-black text-slate-800 font-mono mt-0.5">{todayRecord.check_out_time || 'Belum Pulang'}</span>
                </div>
                {todayRecord.check_out_time ? (
                  <span className="p-1 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-full select-none">
                    Tuntas ✓
                  </span>
                ) : (
                  <span className="p-1 px-2.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full select-none animate-pulse">
                    Menunggu Pulang...
                  </span>
                )}
              </div>

              <div className="p-3 bg-blue-50/40 border border-blue-100/60 rounded-2xl text-xs text-blue-900 leading-relaxed font-sans flex gap-2">
                <FileText className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Memo/Notes Kehadiran:</span>
                  <p className="text-slate-600 italic mt-0.5">"{todayRecord.notes || 'Hadir mengajar rutin'}"</p>
                </div>
              </div>

              {/* Verified badge flags */}
              <div className="grid grid-cols-2 gap-2" id="verified_pills">
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 text-center rounded-xl text-xs text-emerald-800 font-semibold">
                  Face Verified: {todayRecord.face_verified_in ? 'YA ✓' : 'TIDAK'}
                </div>
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 text-center rounded-xl text-xs text-emerald-800 font-semibold">
                  Area Sekolah: {todayRecord.is_within_area ? 'YA ✓' : 'TIDAK'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 font-medium flex flex-col items-center gap-1.5" id="no-attendance-announcer">
              <Info className="w-8 h-8 text-slate-300" />
              <span>Anda belum mencatat kehadiran hari ini ({getTodayISOString()}).</span>
            </div>
          )}

          {/* Action buttons triggers */}
          {(!todayRecord || !todayRecord.check_out_time) && (
            <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-4" id="home_action_inputs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Catatan Presensi (Notes)</label>
                <textarea
                  id="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misalnya: 'Mengajar matematika kelas XI', 'Piket pagi', atau 'Macet jalan'"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition resize-none h-18 text-slate-800 leading-relaxed placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3" id="home-action-buttons">
                <button
                  id="checkout-trigger-btn"
                  onClick={() => executeAttendance('in')}
                  disabled={!!todayRecord || submittingCheck || !faceDescriptor}
                  className="p-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl shadow-sm text-xs cursor-pointer text-center flex items-center justify-center gap-1 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  SCAN & CHECK-IN
                </button>
                <button
                  id="checkin-trigger-btn"
                  onClick={() => executeAttendance('out')}
                  disabled={!todayRecord || !!todayRecord.check_out_time || submittingCheck || !faceDescriptor}
                  className="p-3 bg-accent hover:bg-accent/95 text-white font-bold rounded-2xl shadow-sm text-xs cursor-pointer text-center flex items-center justify-center gap-1 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  SCAN & CHECK-OUT
                </button>
              </div>

              {!faceDescriptor && (
                <p className="text-[11px] text-center text-rose-500 font-semibold select-none">
                  * Ambil foto & pindai wajah Anda di scanner untuk mengaktifkan tombol absen.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
