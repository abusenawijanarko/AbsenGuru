export type UserRole = 'admin' | 'guru';

export interface AppUser {
  uid: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
  face_descriptor?: number[]; // Array of 128 numbers
  photo_url?: string;
  created_at: string;
}

export type AttendanceStatus = 'tepat_waktu' | 'terlambat' | 'tidak_hadir';

export interface AttendanceRecord {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  check_in_time?: string; // HH:MM:SS
  check_out_time?: string; // HH:MM:SS
  lat_in?: number;
  lng_in?: number;
  lat_out?: number;
  lng_out?: number;
  face_verified_in?: boolean;
  face_verified_out?: boolean;
  is_within_area?: boolean;
  status: AttendanceStatus;
  notes?: string;
  modified_by_admin?: boolean;
  modified_at?: string;
  // Join properties (for display)
  teacherName?: string;
  teacherEmail?: string;
  teacherPhone?: string;
}

export interface MonthlyRekap {
  uid: string;
  month: string; // MM format, e.g. "06"
  year: number;
  total_hadir: number;
  total_terlambat: number;
  total_tidak_hadir: number;
  total_hari_kerja: number;
  // Join properties (for display)
  teacherName?: string;
}
