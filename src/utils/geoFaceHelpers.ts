import { AttendanceStatus } from '../types';

// School Center Coordinates (Politeknik IDN Boarding School)
export const SCHOOL_LAT = -6.494120249610702;
export const SCHOOL_LNG = 107.00705239338275;
export const ALLOWED_RADIUS_METERS = 50;

/**
 * Calculates distance of 2 points using Haversine formula
 * returns distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's average radius in meters
  const rad = Math.PI / 180;
  
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Checks if coordinate lies within allowed distance threshold
 */
export function checkIfWithinSchoolArea(lat: number, lng: number): { isWithin: boolean; distance: number } {
  const distance = calculateDistance(lat, lng, SCHOOL_LAT, SCHOOL_LNG);
  return {
    isWithin: distance <= ALLOWED_RADIUS_METERS,
    distance: Math.round(distance * 10) / 10
  };
}

/**
 * Returns Attendance Status based on check-in hour/minute string (e.g., "07:25")
 */
export function determineAttendanceStatus(timeStr: string): AttendanceStatus {
  const [hour, min] = timeStr.split(':').map(Number);
  const checkTimeInMinutes = hour * 60 + min;

  const limitTepatWaktu = 7 * 60 + 30; // 07:30
  const limitTerlambat = 9 * 60 + 0;   // 09:00

  if (checkTimeInMinutes <= limitTepatWaktu) {
    return 'tepat_waktu';
  } else if (checkTimeInMinutes <= limitTerlambat) {
    return 'terlambat';
  } else {
    return 'tidak_hadir';
  }
}

/**
 * Computes face Euclidean distance for verification
 */
export function compareFaceDescriptors(desc1: number[], desc2: number[]): { match: boolean; distance: number } {
  if (desc1.length !== desc2.length) {
    return { match: false, distance: 1.0 };
  }
  
  let sumSq = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sumSq += diff * diff;
  }
  
  const distance = Math.sqrt(sumSq);
  // Match threshold is 0.6 based on face-api standard
  return {
    match: distance < 0.6,
    distance: Math.round(distance * 100) / 100
  };
}

/**
 * Helper to check if face-api.js script is completely loaded into window context
 */
export function isFaceApiLoaded(): boolean {
  return typeof window !== 'undefined' && 'faceapi' in window;
}

/**
 * Load face-api.js script dynamically
 */
export async function loadFaceApiScript(onProgress?: (msg: string) => void): Promise<void> {
  if (isFaceApiLoaded()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    onProgress?.('Mengunduh engine face-api.js...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
    script.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Koneksi lambat, membatalkan unduhan...'));
    }, 15000); // 15s timeout

    script.onload = () => {
      clearTimeout(timeout);
      if (isFaceApiLoaded()) resolve();
      else reject(new Error('Script loaded but faceapi global not found'));
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Gagal memuat script face-api.js dari CDN'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Dynamically loads standard weights from the official weights CDN
 */
export async function loadFaceApiModels(
  onProgress?: (msg: string) => void
): Promise<void> {
  if (!isFaceApiLoaded()) {
    await loadFaceApiScript(onProgress);
  }
  
  const faceapi = (window as any).faceapi;
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  try {
    onProgress?.('Memuat model deteksi wajah SsdMobilenetv1...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    
    onProgress?.('Memuat model kontur wajah FaceLandmark68...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    
    onProgress?.('Memuat model deskriptor FaceRecognition...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    
    onProgress?.('Semua model face-api siap digunakan!');
  } catch (err) {
    console.error('Model loading error:', err);
    throw new Error('Gagal mengunduh model deteksi wajah dari CDN. Silakan muat ulang halaman.');
  }
}
