import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db, isDemoMode, OperationType, handleFirestoreError } from '../firebase';
import { AppUser, AttendanceRecord, MonthlyRekap } from '../types';

// Let's establish bootstrap mock data keys for LocalStorage
const STORAGE_USERS = 'absenguru_users';
const STORAGE_ATTENDANCE = 'absenguru_attendance';
const STORAGE_REKAP = 'absenguru_rekap';

// Helpers to load or write to mock state
function getLocalStorageData<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalStorageData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Bootstrap local storage with default school users if empty
export function bootstrapDemoData() {
  const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
  if (users.length === 0) {
    // Generate standard mock users
    const initialUsers: AppUser[] = [
      {
        uid: 'demo_admin',
        full_name: 'Admin Politeknik IDN',
        email: 'Maskokolive@gmail.com', // Admin from query metadata
        role: 'admin',
        phone: '+6281234567890',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        uid: 'guru_ahmad',
        full_name: 'Pak Ahmad Syaifudin, M.Pd',
        email: 'ahmad@idn.sch.id',
        role: 'guru',
        phone: '+628111122221',
        is_active: true,
        photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
        face_descriptor: Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1)), // Mock descriptor vector
        created_at: new Date().toISOString()
      },
      {
        uid: 'guru_siti',
        full_name: 'Bu Siti Aminah, S.Kom',
        email: 'siti@idn.sch.id',
        role: 'guru',
        phone: '+628111122222',
        is_active: true,
        photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        face_descriptor: Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.15)), // Mock descriptor vector
        created_at: new Date().toISOString()
      },
      {
        uid: 'guru_bambang',
        full_name: 'Pak Bambang Hermawan',
        email: 'bambang@idn.sch.id',
        role: 'guru',
        phone: '+628111122223',
        is_active: false, // Inactive testing guru
        photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
        created_at: new Date().toISOString()
      }
    ];
    setLocalStorageData(STORAGE_USERS, initialUsers);
  }

  const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
  if (attendance.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    const initialAttendance: AttendanceRecord[] = [
      // Yesterday Logs
      {
        id: 'att_1',
        uid: 'guru_ahmad',
        date: yesterday,
        check_in_time: '07:15',
        check_out_time: '15:30',
        lat_in: -6.494120,
        lng_in: 107.007052,
        lat_out: -6.494120,
        lng_out: 107.007052,
        face_verified_in: true,
        face_verified_out: true,
        is_within_area: true,
        status: 'tepat_waktu',
        notes: 'Hadir mengajar matematika kls X & XI'
      },
      {
        id: 'att_2',
        uid: 'guru_siti',
        date: yesterday,
        check_in_time: '07:45',
        check_out_time: '15:45',
        lat_in: -6.494110,
        lng_in: 107.007040,
        lat_out: -6.494115,
        lng_out: 107.007045,
        face_verified_in: true,
        face_verified_out: true,
        is_within_area: true,
        status: 'terlambat',
        notes: 'Terlambat karena macet di jalan raya'
      },
      // Two Days Ago Logs
      {
        id: 'att_3',
        uid: 'guru_ahmad',
        date: twoDaysAgo,
        check_in_time: '07:22',
        check_out_time: '15:30',
        lat_in: -6.494125,
        lng_in: 107.007055,
        lat_out: -6.494120,
        lng_out: 107.007052,
        face_verified_in: true,
        face_verified_out: true,
        is_within_area: true,
        status: 'tepat_waktu',
        notes: 'Tepat waktu hadir harian'
      },
      {
        id: 'att_4',
        uid: 'guru_siti',
        date: twoDaysAgo,
        check_in_time: '07:12',
        check_out_time: '15:32',
        lat_in: -6.494101,
        lng_in: 107.007050,
        lat_out: -6.494102,
        lng_out: 107.007051,
        face_verified_in: true,
        face_verified_out: true,
        is_within_area: true,
        status: 'tepat_waktu',
        notes: 'Hadir mengajar pemrograman'
      }
    ];
    setLocalStorageData(STORAGE_ATTENDANCE, initialAttendance);
  }

  const rekap = getLocalStorageData<MonthlyRekap[]>(STORAGE_REKAP, []);
  if (rekap.length === 0) {
    const currentMonth = new Date().getMonth() + 1;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const year = new Date().getFullYear();

    const initialRekap: MonthlyRekap[] = [
      {
        uid: 'guru_ahmad',
        month: monthStr,
        year: year,
        total_hadir: 15,
        total_terlambat: 1,
        total_tidak_hadir: 0,
        total_hari_kerja: 20
      },
      {
        uid: 'guru_siti',
        month: monthStr,
        year: year,
        total_hadir: 12,
        total_terlambat: 4,
        total_tidak_hadir: 0,
        total_hari_kerja: 20
      }
    ];
    setLocalStorageData(STORAGE_REKAP, initialRekap);
  }
}

// Call bootstrap automatically
if (isDemoMode) {
  bootstrapDemoData();
}

// Unified Database CRUD Functions
export const dbService = {
  // 1. Core Users Functions
  async getUser(uid: string): Promise<AppUser | null> {
    if (isDemoMode) {
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      return users.find(u => u.uid === uid) || null;
    } else {
      const path = `users/${uid}`;
      try {
        const uDoc = await getDoc(doc(db, 'users', uid));
        if (uDoc.exists()) {
          return uDoc.data() as AppUser;
        }
        return null;
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
  },

  async getUserByEmail(email: string): Promise<AppUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (isDemoMode) {
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      const found = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!found && cleanEmail === 'maskokolive@gmail.com') {
        // Automatically create and return an admin if logging in with prompt email
        const newAdmin: AppUser = {
          uid: 'demo_admin',
          full_name: 'Admin Politeknik IDN',
          email: 'Maskokolive@gmail.com',
          role: 'admin',
          phone: '+6281234567890',
          is_active: true,
          created_at: new Date().toISOString()
        };
        const activeUsers = [...users, newAdmin];
        setLocalStorageData(STORAGE_USERS, activeUsers);
        return newAdmin;
      }
      return found || null;
    } else {
      const path = 'users';
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const res = await getDocs(q);
        if (!res.empty) {
          return res.docs[0].data() as AppUser;
        }
        return null;
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  async getAllUsers(): Promise<AppUser[]> {
    if (isDemoMode) {
      return getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
    } else {
      const path = 'users';
      try {
        const res = await getDocs(collection(db, 'users'));
        return res.docs.map(d => d.data() as AppUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  async createUser(user: AppUser): Promise<void> {
    if (isDemoMode) {
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      if (!users.some(u => u.uid === user.uid)) {
        users.push(user);
        setLocalStorageData(STORAGE_USERS, users);
      }
    } else {
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), user);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }
  },

  async updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
    if (isDemoMode) {
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      const idx = users.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...data };
        setLocalStorageData(STORAGE_USERS, users);
      }
    } else {
      const path = `users/${uid}`;
      try {
        await updateDoc(doc(db, 'users', uid), data as any);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    }
  },

  // 2. Attendance Functions
  async getDailyAttendance(date: string): Promise<AttendanceRecord[]> {
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      return attendance
        .filter(a => a.date === date)
        .map(a => {
          const user = users.find(u => u.uid === a.uid);
          return {
            ...a,
            teacherName: user?.full_name || 'Mantan Guru',
            teacherEmail: user?.email,
            teacherPhone: user?.phone
          };
        });
    } else {
      const path = 'attendance';
      try {
        const q = query(collection(db, 'attendance'), where('date', '==', date));
        const res = await getDocs(q);
        const records = res.docs.map(d => d.data() as AttendanceRecord);
        const users = await this.getAllUsers();
        
        return records.map(a => {
          const u = users.find(usr => usr.uid === a.uid);
          return {
            ...a,
            teacherName: u?.full_name || 'Mantan Guru',
            teacherEmail: u?.email,
            teacherPhone: u?.phone
          };
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  async getTeacherAttendance(uid: string): Promise<AttendanceRecord[]> {
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      return attendance
        .filter(a => a.uid === uid)
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      const path = 'attendance';
      try {
        const q = query(
          collection(db, 'attendance'), 
          where('uid', '==', uid)
        );
        const res = await getDocs(q);
        return res.docs
          .map(d => d.data() as AttendanceRecord)
          .sort((a, b) => b.date.localeCompare(a.date));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  async getAttendanceRecord(uid: string, date: string): Promise<AttendanceRecord | null> {
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      return attendance.find(a => a.uid === uid && a.date === date) || null;
    } else {
      const id = `${uid}_${date}`;
      const path = `attendance/${id}`;
      try {
        const docSnap = await getDoc(doc(db, 'attendance', id));
        if (docSnap.exists()) {
          return docSnap.data() as AttendanceRecord;
        }
        return null;
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
  },

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const id = record.id || `${record.uid}_${record.date}`;
    const cleanRecord = { ...record, id };
    
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      const idx = attendance.findIndex(a => a.id === id);
      if (idx !== -1) {
        attendance[idx] = cleanRecord;
      } else {
        attendance.push(cleanRecord);
      }
      setLocalStorageData(STORAGE_ATTENDANCE, attendance);
      
      // Update Monthly Stats
      await this.reevaluateMonthlyStats(record.uid, record.date);
    } else {
      const path = `attendance/${id}`;
      try {
        await setDoc(doc(db, 'attendance', id), cleanRecord);
        await this.reevaluateMonthlyStats(record.uid, record.date);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }
  },

  async updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>): Promise<void> {
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      const idx = attendance.findIndex(a => a.id === id);
      if (idx !== -1) {
        const updated = { ...attendance[idx], ...data };
        attendance[idx] = updated;
        setLocalStorageData(STORAGE_ATTENDANCE, attendance);
        await this.reevaluateMonthlyStats(updated.uid, updated.date);
      }
    } else {
      const path = `attendance/${id}`;
      try {
        await updateDoc(doc(db, 'attendance', id), data as any);
        const record = await getDoc(doc(db, 'attendance', id));
        if (record.exists()) {
          const r = record.data() as AttendanceRecord;
          await this.reevaluateMonthlyStats(r.uid, r.date);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    }
  },

  // 3. Monthly Rekap Functions
  async getMonthlyRekap(month: string, year: number): Promise<MonthlyRekap[]> {
    if (isDemoMode) {
      const rekap = getLocalStorageData<MonthlyRekap[]>(STORAGE_REKAP, []);
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      return rekap
        .filter(r => r.month === month && r.year === year)
        .map(r => {
          const user = users.find(u => u.uid === r.uid);
          return {
            ...r,
            teacherName: user?.full_name || 'Mantan Guru'
          };
        });
    } else {
      const path = 'rekap_bulanan';
      try {
        const q = query(
          collection(db, 'rekap_bulanan'),
          where('month', '==', month),
          where('year', '==', year)
        );
        const res = await getDocs(q);
        const rekaps = res.docs.map(d => d.data() as MonthlyRekap);
        const users = await this.getAllUsers();
        
        return rekaps.map(r => {
          const user = users.find(u => u.uid === r.uid);
          return {
            ...r,
            teacherName: user?.full_name || 'Mantan Guru'
          };
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  async getYearlyRekap(year: number): Promise<MonthlyRekap[]> {
    if (isDemoMode) {
      const rekap = getLocalStorageData<MonthlyRekap[]>(STORAGE_REKAP, []);
      const users = getLocalStorageData<AppUser[]>(STORAGE_USERS, []);
      return rekap
        .filter(r => r.year === year)
        .map(r => {
          const user = users.find(u => u.uid === r.uid);
          return {
            ...r,
            teacherName: user?.full_name || 'Mantan Guru'
          };
        });
    } else {
      const path = 'rekap_bulanan';
      try {
        const q = query(
          collection(db, 'rekap_bulanan'),
          where('year', '==', year)
        );
        const res = await getDocs(q);
        const rekaps = res.docs.map(d => d.data() as MonthlyRekap);
        const users = await this.getAllUsers();
        
        return rekaps.map(r => {
          const user = users.find(u => u.uid === r.uid);
          return {
            ...r,
            teacherName: user?.full_name || 'Mantan Guru'
          };
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
  },

  // Deep auto-reevalutation of monthly rekap after a check-in or edit
  async reevaluateMonthlyStats(uid: string, dateStr: string): Promise<void> {
    const [yearPart, monthPart] = dateStr.split('-');
    const year = parseInt(yearPart, 10);
    const month = monthPart;

    // Load all logs for teacher in this month/year
    let allLogs: AttendanceRecord[] = [];
    if (isDemoMode) {
      const attendance = getLocalStorageData<AttendanceRecord[]>(STORAGE_ATTENDANCE, []);
      allLogs = attendance.filter(a => a.uid === uid && a.date.startsWith(`${yearPart}-${monthPart}`));
    } else {
      const q = query(collection(db, 'attendance'), where('uid', '==', uid));
      const res = await getDocs(q);
      allLogs = res.docs
        .map(d => d.data() as AttendanceRecord)
        .filter(a => a.date.startsWith(`${yearPart}-${monthPart}`));
    }

    let total_hadir = 0;
    let total_terlambat = 0;
    let total_tidak_hadir = 0;

    allLogs.forEach(log => {
      if (log.status === 'tepat_waktu') total_hadir++;
      else if (log.status === 'terlambat') total_terlambat++;
      else if (log.status === 'tidak_hadir') total_tidak_hadir++;
    });

    const rekapId = `${uid}_${year}_${month}`;
    const stats: MonthlyRekap = {
      uid,
      month,
      year,
      total_hadir,
      total_terlambat,
      total_tidak_hadir,
      total_hari_kerja: 20 // Default typical monthly working days
    };

    if (isDemoMode) {
      const rekaps = getLocalStorageData<MonthlyRekap[]>(STORAGE_REKAP, []);
      const idx = rekaps.findIndex(r => r.uid === uid && r.month === month && r.year === year);
      if (idx !== -1) {
        rekaps[idx] = stats;
      } else {
        rekaps.push(stats);
      }
      setLocalStorageData(STORAGE_REKAP, rekaps);
    } else {
      const path = `rekap_bulanan/${rekapId}`;
      try {
        await setDoc(doc(db, 'rekap_bulanan', rekapId), stats);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }
  }
};
