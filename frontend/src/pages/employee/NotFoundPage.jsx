import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function NotFoundPage({ isRtl = false }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="mb-6">
        <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="56" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
          <text x="64" y="72" textAnchor="middle" className="text-5xl font-extrabold" fill="#94a3b8">404</text>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        {isRtl ? 'الصفحة غير موجودة' : 'Page introuvable'}
      </h1>
      <p className="text-sm text-neutral-500 max-w-md mb-8 leading-relaxed">
        {isRtl
          ? 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها. يرجى التحقق من الرابط.'
          : 'La page que vous recherchez n\'existe pas ou a été déplacée. Veuillez vérifier l\'URL.'}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(-1)}>
          {isRtl ? 'رجوع' : 'Retour'}
        </Button>
        <Button variant="primary" icon={Home} onClick={() => navigate('/')}>
          {isRtl ? 'الرئيسية' : 'Accueil'}
        </Button>
      </div>
    </div>
  );
}
