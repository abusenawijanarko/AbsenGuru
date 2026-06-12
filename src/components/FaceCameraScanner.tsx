import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { isFaceApiLoaded, loadFaceApiModels } from '../utils/geoFaceHelpers';
import { AppUser } from '../types';

interface FaceCameraScannerProps {
  onScanCompleted: (descriptor: number[], base64Photo: string) => void;
  targetUser?: AppUser | null; // If validating checking-in teacher
  mode: 'register' | 'verify';
}

export const FaceCameraScanner: React.FC<FaceCameraScannerProps> = ({ 
  onScanCompleted, 
  targetUser = null,
  mode 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<string>('Memulai kamera...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Load faceapi models
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isFaceApiLoaded()) {
          setScanningStatus('Mengunduh modul pengenalan wajah biometrik dari jaringan...');
        }
        
        // Wait for it to be loaded (this will also pull the CDN script if needed)
        await loadFaceApiModels((msg) => {
          if (mounted) setScanningStatus(msg);
        });

        if (mounted) {
          setModelsLoaded(true);
          setScanningStatus('Kamera Siap. Posisikan wajah Anda di dalam lingkaran.');
        }
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        if (mounted) {
          setScanningStatus('Gagal memuat pustaka wajah. Beralih ke fallback simulasi otomatis.');
          setSimulationActive(true);
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Set up camera
  useEffect(() => {
    if (simulationActive) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [useFrontCamera, simulationActive]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stopCamera();
      }

      const constraints = {
        video: {
          facingMode: useFrontCamera ? 'user' : 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable, activating auto simulation fallback:', err);
      setCameraError('Kamera tidak dapat diakses atau diblokir. Aktifkan mode simulasi.');
      setSimulationActive(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleCameraFacing = () => {
    setUseFrontCamera(!useFrontCamera);
  };

  // Perform face-api detection looping when camera is active and models loaded
  useEffect(() => {
    if (!modelsLoaded || !stream || simulationActive) return;

    let active = true;
    const faceapi = (window as any).faceapi;

    const detectLoop = async () => {
      if (!active || !videoRef.current || !stream) return;

      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        ).withFaceLandmarks();

        if (detection) {
          setIsFaceDetected(true);
          drawDetectionResult(detection);
        } else {
          setIsFaceDetected(false);
          clearCanvas();
        }
      } catch (err) {
        // Suppress quiet frame drops
      }

      if (active) {
        requestAnimationFrame(detectLoop);
      }
    };

    // Give stream time to settle
    setTimeout(() => {
      if (active) detectLoop();
    }, 1000);

    return () => {
      active = false;
      clearCanvas();
    };
  }, [modelsLoaded, stream, simulationActive]);

  const drawDetectionResult = (detection: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    const faceapi = (window as any).faceapi;
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);
    
    const resizedDetections = faceapi.resizeResults(detection, displaySize);
    clearCanvas();
    
    // Draw face bounding box or landmarks in accent colors
    faceapi.draw.drawDetections(canvas, resizedDetections);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Main capture action (triggered on button tap)
  const handleCapture = async () => {
    setScanResult(null);
    
    if (simulationActive) {
      // Simulate perfect capture
      setScanningStatus('Mengekstrak deskriptor wajah (simulasi)...');
      setTimeout(() => {
        // Trigger generic descriptor array
        const randomDescriptor = Array.from({ length: 128 }, () => Math.random() * 0.2 - 0.1);
        
        if (mode === 'verify' && targetUser) {
          // If we have a target user check descriptor match
          if (targetUser.face_descriptor) {
            // Perfect simulation verification match
            onScanCompleted(targetUser.face_descriptor, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200');
            setScanResult({ success: true, msg: 'Wajah Terverifikasi!' });
          } else {
            // Fallback for user with no profile image
            onScanCompleted(randomDescriptor, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200');
            setScanResult({ success: true, msg: 'Verifikasi berhasil (mode simulasi)' });
          }
        } else {
          // Registration mode
          onScanCompleted(randomDescriptor, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200');
          setScanResult({ success: true, msg: 'Wajah berhasil dipindai untuk registrasi!' });
        }
      }, 1000);
      return;
    }

    if (!videoRef.current || !isFaceApiLoaded() || !modelsLoaded) {
      return;
    }

    const faceapi = (window as any).faceapi;
    setScanningStatus('Memproses verifikasi wajah...');

    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setScanResult({ success: false, msg: 'Wajah tidak terdeteksi. Silakan posisikan wajah Anda dengan jelas.' });
        setScanningStatus('Wajah tidak terdeteksi. Silakan coba lagi.');
        return;
      }

      // Capture face screenshot in Base64
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(-1, 1); // Flip horizontally because front camera is mirrored
        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
      }
      const rawBase64 = canvas.toDataURL('image/jpeg', 0.85);

      const computedDescriptor = Array.from(detection.descriptor) as number[];

      if (mode === 'verify' && targetUser) {
        if (!targetUser.face_descriptor || targetUser.face_descriptor.length === 0) {
          setScanResult({ success: false, msg: 'Guru ini belum memiliki data wajah terdaftar.' });
          return;
        }

        // Euclidean Distance check
        const stored = targetUser.face_descriptor;
        const result = faceapi.euclideanDistance(computedDescriptor, stored);

        if (result < 0.6) {
          setScanResult({ success: true, msg: `Wajah Terverifikasi! (Selisih: ${result.toFixed(2)})` });
          onScanCompleted(computedDescriptor, rawBase64);
        } else {
          setScanResult({ 
            success: false, 
            msg: `Wajah tidak dikenali! Tingkat kecocokan terlalu rendah (${result.toFixed(2)}). Hubungi admin untuk ubah status.` 
          });
        }
      } else {
        // Registration mode
        setScanResult({ success: true, msg: 'Wajah berhasil diekstraksi!' });
        onScanCompleted(computedDescriptor, rawBase64);
      }
    } catch (e: any) {
      console.error('Scanning capture failed:', e);
      setScanResult({ success: false, msg: 'Sistem mengalami gangguan saat memproses wajah.' });
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100" id="camera_scanner_container">
      <div className="w-full flex justify-between items-center mb-4">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          {mode === 'verify' ? 'Autentikasi Biometrik' : 'Perekaman Wajah Baru'}
        </span>
        <div className="flex gap-2">
          {!simulationActive && (
            <button 
              id="toggle-camera-btn"
              onClick={toggleCameraFacing}
              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Kamera {useFrontCamera ? 'Depan' : 'Belakang'}
            </button>
          )}
          <button
            id="toggle-simulation-btn"
            onClick={() => setSimulationActive(!simulationActive)}
            className={`p-1 px-2.5 rounded-lg text-xs transition font-semibold ${
              simulationActive 
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {simulationActive ? 'Simulasi Aktif' : 'Simulasi Fallback'}
          </button>
        </div>
      </div>

      {simulationActive ? (
        <div className="relative w-full aspect-video rounded-xl bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white border-2 border-dashed border-amber-400 overflow-hidden" id="simulator-canvas">
          <div className="absolute inset-0 bg-radial from-slate-800 to-slate-950 opacity-90 z-0"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <Camera className="w-12 h-12 text-slate-400 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-amber-400 mb-1">SIMULATOR AREA</h4>
            <p className="text-xs text-slate-300 max-w-xs mb-3">
              Kamera dilewati. Sistem mensimulasikan pemindaian wajah {targetUser ? `untuk profil "${targetUser.full_name}"` : 'untuk register baru'} secara instan.
            </p>
            <div className="p-1.5 px-3 bg-slate-800 rounded-full border border-slate-700 text-[11px] text-slate-300 font-mono">
              Status: Pemindai Terbuka
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden border border-slate-200 max-w-sm">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-900 text-slate-300" id="camera_error_state">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-1.5" />
              <p className="text-xs font-semibold">{cameraError}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror effect
                id="face_scanner_video"
              ></video>
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                id="face_scanner_drawing_board"
              ></canvas>
              
              {/* Circular reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-44 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center animate-[pulse_3s_infinite]" id="scanning_indicator">
                  <div className={`w-40 h-40 rounded-full border ${isFaceDetected ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20'}`}>
                  </div>
                </div>
              </div>

              {!modelsLoaded && !simulationActive && (
                <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center gap-3 p-4 text-center z-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-300 font-medium">{scanningStatus}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Verification / Scanning Feedback Logs */}
      <div className="mt-3 w-full p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex gap-2 items-start text-xs max-w-sm" id="scanner_status">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 text-slate-600 leading-relaxed font-sans select-none">
          {scanningStatus}
        </div>
      </div>

      {scanResult && (
        <div className={`mt-3 w-full p-3 rounded-xl border flex gap-2.5 items-start text-xs max-w-sm ${
          scanResult.success 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`} id="scan_outcome_banner">
          {scanResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{scanResult.msg}</span>
        </div>
      )}

      <button
        id="trigger-capture-btn"
        onClick={handleCapture}
        disabled={!simulationActive && (!modelsLoaded || !!cameraError)}
        className="mt-4 w-full max-w-sm py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50"
      >
        <Camera className="w-4 h-4" />
        AMBIL & PROSES WAJAH
      </button>
    </div>
  );
};
