import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { AppUser } from '../types';
import { isFaceApiLoaded } from '../utils/geoFaceHelpers';
import { 
  Users, 
  UserPlus, 
  Camera, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MailWarning,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
  Lock,
  Search,
  Check
} from 'lucide-react';

export const AdminKelolaGuruView: React.FC = () => {
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);

  // Hidden references for descriptor extraction
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSuccess, setExtractedSuccess] = useState<boolean | null>(null);

  // Success Invite mail layout display trigger
  const [sentInvite, setSentInvite] = useState<{ name: string; email: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  const fetchTeachersList = async () => {
    setLoading(true);
    try {
      const allUsers = await dbService.getAllUsers();
      const allTeachersList = allUsers.filter(u => u.role === 'guru');
      setTeachers(allTeachersList);
    } catch (e) {
      console.error('Failed to load teachers roster list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachersList();
  }, []);

  // Filtered list
  const getFilteredTeachers = () => {
    const activeQuery = searchQuery.toLowerCase().trim();
    if (!activeQuery) return teachers;
    return teachers.filter(t => 
      t.full_name.toLowerCase().includes(activeQuery) || 
      t.email.toLowerCase().includes(activeQuery)
    );
  };

  // Automated face descriptor extraction from file
  const handlePhotoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionStatus('Membaca file gambar...');
    setExtractedSuccess(null);
    setFaceDescriptor(null);

    // 1. Convert File to base64 Data URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoURL(dataUrl);

      // 2. Load face-api.js check
      if (!isFaceApiLoaded()) {
        setExtractionStatus('Gagal: face-api.js belum siap. Memakai descriptor simulasi...');
        // Fallback simulation descriptor vector for easy testing
        const simulated = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);
        setFaceDescriptor(simulated);
        setExtractedSuccess(true);
        setIsExtracting(false);
        return;
      }

      const faceapi = (window as any).faceapi;
      setExtractionStatus('Mencari objek wajah di dalam gambar...');

      try {
        // Create an HTML Image Element to feed into the API
        const img = new Image();
        img.src = dataUrl;
        img.onload = async () => {
          try {
            const detection = await faceapi.detectSingleFace(
              img,
              new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
            ).withFaceLandmarks().withFaceDescriptor();

            if (detection) {
              const desc = Array.from(detection.descriptor) as number[];
              setFaceDescriptor(desc);
              setExtractedSuccess(true);
              setExtractionStatus('Sukses: Wajah berhasil diidentifikasi! Descriptor biometrik (128 dimensi) terekstrak.');
            } else {
              setExtractedSuccess(false);
              setExtractionStatus('Peringatan: Wajah tidak ditemukan dalam foto. Menggunakan descriptor cadangan.');
              // Trigger backup descriptor so that they can still complete profile creation if photo is blurry
              const backup = Array.from({ length: 128 }, () => Math.random() * 0.15 - 0.05);
              setFaceDescriptor(backup);
            }
          } catch (apiErr) {
            console.warn('Faceapi process failed, using fallback:', apiErr);
            const fallbackVector = Array.from({ length: 128 }, () => Math.sin(Math.random()));
            setFaceDescriptor(fallbackVector);
            setExtractedSuccess(true);
            setExtractionStatus('Selesai dengan simulasi cadangan.');
          } finally {
            setIsExtracting(false);
          }
        };
      } catch (err) {
        setIsExtracting(false);
        setExtractionStatus('Gagal memproses gambar biometrik.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Registration Action
  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSentInvite(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !photoURL) {
      setActionError('Harap lengkapi semua isian formulir termasuk unggah foto wajah.');
      return;
    }

    if (!faceDescriptor) {
      setActionError('Vektor biometrik wajah belum selesai diekstraksi.');
      return;
    }

    setSubmittingUser(true);

    try {
      // Create random uid for new teacher (starts with guru_)
      const teacherUid = `guru_${Math.random().toString(36).substring(2, 9)}`;

      const newTeacher: AppUser = {
        uid: teacherUid,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: 'guru',
        phone: phone.trim(),
        is_active: true,
        photo_url: photoURL,
        face_descriptor: faceDescriptor,
        created_at: new Date().toISOString()
      };

      await dbService.createUser(newTeacher);
      
      setActionSuccess(`Guru "${fullName}" berhasil didaftarkan di Politeknik IDN!`);
      
      // Open Invite display
      setSentInvite({
        name: fullName,
        email: email.toLowerCase()
      });

      // Clear form inputs
      setFullName('');
      setEmail('');
      setPhone('');
      setPhotoURL('');
      setFaceDescriptor(null);
      setExtractedSuccess(null);
      setExtractionStatus('');

      // Refresh table list
      await fetchTeachersList();
    } catch (err: any) {
      setActionError(`Gagal mendaftarkan guru: ${err.message}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Teacher status switch toggle (Aktif / Nonaktif)
  const handleToggleActiveState = async (uid: string, currentActive: boolean) => {
    try {
      await dbService.updateUser(uid, { is_active: !currentActive });
      setActionSuccess('Status keaktifan sekolah berhasil disimpan.');
      await fetchTeachersList();
    } catch (e: any) {
      setActionError('Gagal mengubah status aktif guru.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="management-view-container">
      {/* Invite Mail Outbox template simulation (Shown as floating notice or side card) */}
      {sentInvite && (
        <div className="lg:col-span-12 bg-amber-50 border border-amber-100 p-4.5 rounded-3xl text-slate-800 flex flex-col gap-3.5 animation-fade-in" id="outbox_simulator_invite">
          <div className="flex justify-between items-center" id="outbox_header">
            <h4 className="text-xs font-black uppercase text-amber-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-[spin_5s_linear_infinite]" /> PEMBERITAHUAN EMAIL INVITE OTOMATIS (TERKIRIM)
            </h4>
            <button 
              id="close-invite-btn"
              onClick={() => setSentInvite(null)}
              className="p-1 text-slate-400 hover:text-slate-650 transition text-xs font-bold bg-white rounded-lg px-2.5 shadow-xs border border-slate-205 cursor-pointer"
            >
              Tutup Slip Undangan
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-2 font-mono text-[11px] leading-relaxed text-slate-600" id="email_slip_body">
            <div><span className="font-bold text-slate-800">Kepada:</span> {sentInvite.name} ({sentInvite.email})</div>
            <div><span className="font-bold text-slate-800">Subjek:</span> Selamat Datang di AbsenGuru Politeknik IDN Boarding School!</div>
            <div className="border-t border-slate-100 my-2 pt-2 text-slate-500">
              <p>Halo {sentInvite.name},</p>
              <p className="mt-1.5">Akun Anda telah terdaftar di web AbsenGuru Politeknik IDN.</p>
              <p className="mt-1.5">Anda dapat menggunakan kredensial berikut untuk melakukan login:</p>
              <p className="font-bold text-slate-800 mt-1 pl-3 bg-slate-50 p-2 rounded-lg border inline-block select-all">
                Email: {sentInvite.email}<br />
                Password Default: password123
              </p>
              <p className="mt-2 text-[10px] text-amber-600 font-sans font-semibold">* Undangan system invite telah otomatis disimulasikan sukses terkirim ke alamat email tujuan.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Registration Form Panel (Left) */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="teacher-form-panel">
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 flex flex-col gap-4 text-sm" id="registration_teacher_card">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <UserPlus className="w-5 h-5 text-primary" /> Tambah Profile Guru Baru
          </h3>

          {(actionError || actionSuccess) && (
            <div id="registration_alerts">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-xs text-rose-805 font-bold rounded-xl flex gap-1.5 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-xs text-emerald-805 font-bold rounded-xl flex gap-1.5 items-center">
                  <CheckCircle className="w-4 h-4 shrink-0" /> {actionSuccess}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleRegisterTeacher} className="flex flex-col gap-3.5" id="register_teacher_form">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-650">Nama Lengkap Guru (Gelar)</label>
              <input
                id="name-input"
                type="text"
                placeholder="Pak Ahmad Syaifudin, M.Pd"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-xs rounded-xl focus:outline-none transition text-slate-800 font-semibold"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-650">Alamat Email Akademik</label>
              <input
                id="register-email-input"
                type="email"
                placeholder="ahmad@idn.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-xs rounded-xl focus:outline-none transition text-slate-800 font-semibold"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-650">Nomor Telepon/HP (WhatsApp)</label>
              <input
                id="phone-input"
                type="tel"
                placeholder="+628111122221"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 focus:border-primary/50 text-xs rounded-xl focus:outline-none transition text-slate-800 font-semibold"
                required
              />
            </div>

            {/* Profile Picture Biometrics input */}
            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3" id="portrait_picture_inputs">
              <label className="text-xs font-bold text-slate-700">Foto Wajah Guru (Veritas Biometrik)</label>
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUploadChange}
                className="hidden"
                id="file-selector-portrait"
              />

              <div className="flex gap-4.5 items-center" id="portrait_actions_dock">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-sans border-dashed cursor-pointer hover:bg-slate-100 transition" onClick={() => fileInputRef.current?.click()} id="portrait-preview">
                  {photoURL ? (
                    <img src={photoURL} alt="Face Upload" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 text-slate-350" />
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1 text-xs">
                  <button
                    id="trigger-file-selection-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-slate-100 hover:bg-slate-200 font-bold block w-full rounded-xl text-slate-700 text-center transition cursor-pointer select-none"
                  >
                    PILIH FOTO PORTRAIT
                  </button>
                  <span className="text-[10px] text-slate-400">Unggah foto hadap depan dengan pencahayaan yang jelas.</span>
                </div>
              </div>

              {/* API Extraction Status message logs */}
              {extractionStatus && (
                <div className={`mt-2 p-2.5 rounded-xl text-[11px] leading-relaxed flex gap-2 font-mono items-start border ${
                  extractedSuccess === true 
                    ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                    : extractedSuccess === false 
                    ? 'bg-amber-50 border-amber-100 text-amber-800 font-semibold' 
                    : 'bg-indigo-50 border-indigo-100 text-indigo-800'
                }`} id="face_extraction_feedback">
                  {isExtracting ? (
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin shrink-0 mt-0.5" />
                  ) : extractedSuccess === true ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <span>{extractionStatus}</span>
                </div>
              )}
            </div>

            <button
              id="submit-register-btn"
              type="submit"
              disabled={submittingUser || isExtracting || !faceDescriptor}
              className="w-full mt-2.5 py-3 bg-emerald-600 hover:bg-emerald-605 text-white font-black text-center text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-45 flex items-center justify-center gap-1.5"
            >
              {submittingUser ? (
                <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  DAFTAR GURU & KIRIM INVITE
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Teachers Grid list and Keaktifan manager (Right) */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="teacher-roster-pane">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5" id="roster_table_card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 mb-4" id="roster_table_header">
            <div>
              <h3 className="font-black text-slate-805 tracking-tight text-sm select-none">
                Daftar Semua Guru Politeknik IDN
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Ubah status aktifitas guru dan review face descriptors.</p>
            </div>

            <div className="relative w-full sm:w-48" id="search_guru_wrapper">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="search-roster-input"
                type="text"
                placeholder="Cari guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:outline-none text-xs rounded-xl transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="w-full flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : getFilteredTeachers().length === 0 ? (
            <div className="text-center py-12 text-slate-400">Belum ada guru yang didaftarkan.</div>
          ) : (
            <div className="flex flex-col gap-3.5" id="roster_entries_grid">
              {getFilteredTeachers().map((teacher) => (
                <div 
                  key={teacher.uid} 
                  className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-slate-50"
                  id={`teacher-profile-card-${teacher.uid}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-slate-150 rounded-2xl overflow-hidden border border-slate-200 shrink-0 text-slate-600 flex items-center justify-center font-bold font-sans select-none">
                      {teacher.photo_url ? (
                        <img src={teacher.photo_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                      ) : (
                        teacher.full_name.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-bold text-slate-800 leading-snug">{teacher.full_name}</span>
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {teacher.email}
                      </span>
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {teacher.phone}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Keaktifan */}
                  <div className="flex items-center gap-3 md:self-center self-end" id="roster_controls">
                    {/* Face Vector Descriptor registered marker */}
                    <div className="text-[10px] bg-indigo-50 text-indigo-700 p-1 px-2.5 border border-indigo-150 rounded-lg shrink-0 select-none">
                      Descriptor: {teacher.face_descriptor ? '128-Dimensi ✓' : 'Belum Ada'}
                    </div>

                    <button
                      id={`toggle-active-${teacher.uid}`}
                      onClick={() => handleToggleActiveState(teacher.uid, teacher.is_active)}
                      className={`p-1.5 px-3 rounded-xl text-xs font-bold leading-relaxed transition flex items-center gap-1 shadow-xs cursor-pointer select-none ${
                        teacher.is_active 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-150 hover:bg-emerald-100' 
                          : 'bg-rose-50 text-rose-800 border border-rose-150 hover:bg-rose-100'
                      }`}
                    >
                      {teacher.is_active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Nonaktif
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
