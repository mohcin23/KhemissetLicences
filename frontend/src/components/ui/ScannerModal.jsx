import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, FlipHorizontal } from 'lucide-react';

export default function ScannerModal({ open, onClose, onCapture, lang = 'fr' }) {
  const isRtl = lang === 'ar';
  const text = (fr, ar) => (isRtl ? ar : fr);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(text(
        'Caméra non disponible. Vérifiez les permissions.',
        'الكاميرا غير متاحة. تحقق من الأذونات.'
      ));
    }
  }, [facingMode, text]);

  useEffect(() => {
    if (open) {
      setCaptured(null);
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    startCamera();
  };

  const handleFlip = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleConfirm = () => {
    if (!captured) return;
    fetch(captured)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      });
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCaptured(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Camera className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {text('Scanner un document', 'مسح وثيقة')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {text('Positionnez le document dans le cadre', 'ضع الإطار في الإطار')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition cursor-pointer border-0 bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition cursor-pointer border-0"
              >
                {text('Réessayer', 'إعادة المحاولة')}
              </button>
            </div>
          ) : captured ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={captured} alt="Scan" className="w-full h-auto max-h-[400px] object-contain" />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer bg-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  {text('Reprendre', 'إعادة')}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27ab83] text-white text-sm font-semibold hover:bg-[#1f9a73] transition cursor-pointer border-0 shadow-lg shadow-[#27ab83]/20"
                >
                  <Check className="w-4 h-4" />
                  {text('Utiliser ce scan', 'استخدام المسح')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border-2 border-white/50 rounded-lg pointer-events-none" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
                  {text('Alignez le document', 'محاذاة الوثيقة')}
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleFlip}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer bg-white"
                  title={text('Retourner la caméra', 'قلب الكاميرا')}
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCapture}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#27ab83] text-white text-sm font-bold hover:bg-[#1f9a73] transition cursor-pointer border-0 shadow-lg shadow-[#27ab83]/30"
                >
                  <Camera className="w-5 h-5" />
                  {text('Capturer', 'التقاط')}
                </button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
