import React from 'react';
import { Check } from 'lucide-react';

export default function Stepper({ currentStep, displayStep, lang }) {
  const txt = (fr, ar) => (lang === 'ar' ? ar : fr);
  const display = displayStep !== undefined ? displayStep : currentStep;
  const steps = [
    { n: 1, num: txt('Étape 1', 'الخطوة 1'), label: txt('Choisir la licence', 'اختر الرخصة') },
    { n: 2, num: txt('Étape 2', 'الخطوة 2'), label: txt('Déposer les documents', 'إيداع الوثائق') },
    { n: 3, num: txt('Étape 3', 'الخطوة 3'), label: txt('Confirmation', 'التأكيد') },
  ];
  return (
    <div className="citizen-stepper-wrap">
      <div className="citizen-stepper">
        {steps.map((s, i) => {
          const isActive = display === s.n;
          const isDone = display > s.n || (displayStep !== undefined && currentStep > s.n);
          return (
            <React.Fragment key={s.n}>
              {i > 0 && <div className={`citizen-step-line${isDone ? ' done' : ''}`} />}
              <div className={`citizen-step${isActive ? ' active' : ''}${isDone && !isActive ? ' done' : ''}`}>
                <div className="citizen-step-bullet">
                  {isDone && !isActive ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <span>{s.n}</span>
                  )}
                </div>
                <div className="citizen-step-meta">
                  <div className="citizen-step-num">{s.num}</div>
                  <div className="citizen-step-label">{s.label}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
