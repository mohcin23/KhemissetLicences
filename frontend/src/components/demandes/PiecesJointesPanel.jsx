import React, { useRef, useState, useEffect } from 'react';
import { demandesAPI } from '../../services/api';
import { Printer, Grid3X3, List } from 'lucide-react';

const ICON_FOR_MIME = (mime) => {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  return '📎';
};

const fmt = (bytes) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('auth_token')}`
});

const fetchBlob = async (url) => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Échec du chargement');
  return res.blob();
};

const openBlobInTab = (blob) => {
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
};

function AuthThumbnail({ demandeId, pj }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const url = demandesAPI.downloadPieceJointeUrl(demandeId, pj.id);
    fetchBlob(url).then((blob) => {
      if (!cancelled) {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      }
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, [demandeId, pj.id]);
  if (error) return <span className="text-lg">🖼️</span>;
  if (!blobUrl) return <div className="h-full w-full animate-pulse rounded-lg bg-slate-200" />;
  return <img src={blobUrl} alt={pj.nom_original} className="h-full w-full rounded-lg object-cover" />;
}

const formatTypePiece = (type) => {
  if (!type) return '';
  const ABBREVIATIONS = new Set(['cin', 'cin', 'pv', 'sla', 'ocr']);
  return type
    .split('_')
    .map(word => ABBREVIATIONS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PiecesJointesPanel({
  demandeId,
  pieces = [],
  loading = false,
  uploading = false,
  onUpload,
  onDelete,
  canDelete = false,
  isRtl = false,
  onPrintAll,
}) {
  const inputRef = useRef(null);
  const [viewMode, setViewMode] = useState('grid');

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const allowed = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (allowed.length === 0) {
      alert(isRtl ? 'فقط صور أو PDF مسموح بها' : 'Seuls les images et PDF sont acceptés');
      return;
    }
    if (onUpload) await onUpload(allowed);
  };

  const handleInputChange = (e) => handleFiles(e.target.files);

  const handleDownload = (pj) => {
    const url = demandesAPI.downloadPieceJointeUrl(demandeId, pj.id);
    const token = localStorage.getItem('auth_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = pj.nom_original;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Erreur téléchargement'));
  };

  const handleView = async (pj) => {
    const url = demandesAPI.downloadPieceJointeUrl(demandeId, pj.id);
    try {
      const blob = await fetchBlob(url);
      openBlobInTab(blob);
    } catch {
      alert(isRtl ? 'خطأ في تحميل الملف' : 'Erreur de chargement du fichier');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
            {isRtl ? 'الوثائق المرفقة' : 'Pièces jointes'}
          </span>
          {pieces.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-blue-900 text-white text-xs font-bold min-w-[22px] h-[22px] px-1.5">
              {pieces.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pieces.length > 0 && onPrintAll && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#27ab83] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#1f9a73] transition-colors cursor-pointer"
              onClick={onPrintAll}
            >
              <Printer className="w-4 h-4" />
              {isRtl ? 'طباعة الكل' : 'Tout imprimer'}
            </button>
          )}
          {pieces.length > 1 && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                title={isRtl ? 'عرض شبكة' : 'Vue grille'}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                title={isRtl ? 'عرض قائمة' : 'Vue liste'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
          {onUpload && (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3.5 py-1.5 text-[13px] font-medium text-green-600 hover:bg-green-100 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? (isRtl ? 'جاري الرفع…' : 'Envoi…')
                : (isRtl ? '+ إرفاق ملف' : '+ Joindre un fichier')}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={handleInputChange}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-slate-400 py-4">{isRtl ? 'جاري التحميل…' : 'Chargement…'}</p>
      ) : pieces.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-4">
          {isRtl ? 'لا توجد وثائق مرفقة حتى الآن' : 'Aucune pièce jointe pour l\'instant'}
        </p>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {pieces.map((pj) => (
            <div key={pj.id} className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                {pj.type_mime?.startsWith('image/') ? (
                  <AuthThumbnail demandeId={demandeId} pj={pj} />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4">
                    <span className="text-4xl">{ICON_FOR_MIME(pj.type_mime)}</span>
                    <span className="text-xs text-slate-500 font-medium truncate max-w-full">{pj.nom_original}</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-slate-900 truncate" title={pj.nom_original}>
                  {pj.nom_original}
                </p>
                {pj.type_piece && (
                  <span className="inline-block mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {formatTypePiece(pj.type_piece)}
                  </span>
                )}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 border border-slate-200 text-slate-600 hover:bg-white shadow-sm transition-colors cursor-pointer"
                  onClick={() => handleView(pj)}
                  title={isRtl ? 'عرض' : 'Voir'}
                >
                  👁
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 border border-slate-200 text-slate-600 hover:bg-white shadow-sm transition-colors cursor-pointer"
                  onClick={() => handleDownload(pj)}
                  title={isRtl ? 'تحميل' : 'Télécharger'}
                >
                  ⬇
                </button>
                {canDelete && onDelete && (
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 border border-slate-200 text-red-600 hover:bg-red-50 shadow-sm transition-colors cursor-pointer"
                    onClick={() => {
                      if (window.confirm(
                        isRtl ? 'هل تريد حذف هذه الوثيقة؟' : 'Supprimer cette pièce jointe ?'
                      )) onDelete(pj.id);
                    }}
                    title={isRtl ? 'حذف' : 'Supprimer'}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {pieces.map((pj) => (
            <div key={pj.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {pj.type_mime?.startsWith('image/') ? (
                  <AuthThumbnail demandeId={demandeId} pj={pj} />
                ) : (
                  <span className="text-lg">{ICON_FOR_MIME(pj.type_mime)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 truncate" title={pj.nom_original}>
                    {pj.nom_original}
                  </span>
                  {pj.type_piece && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      {formatTypePiece(pj.type_piece)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fmt(pj.taille_octets)}
                  {' · '}
                  {pj.uploaded_by_name || pj.role_uploader}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleView(pj)}
                  title={isRtl ? 'عرض' : 'Voir'}
                >
                  👁
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleDownload(pj)}
                  title={isRtl ? 'تحميل' : 'Télécharger'}
                >
                  ⬇
                </button>
                {canDelete && onDelete && (
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-red-800 hover:bg-red-100 transition-colors cursor-pointer"
                    onClick={() => {
                      if (window.confirm(
                        isRtl ? 'هل تريد حذف هذه الوثيقة؟' : 'Supprimer cette pièce jointe ?'
                      )) onDelete(pj.id);
                    }}
                    title={isRtl ? 'حذف' : 'Supprimer'}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}