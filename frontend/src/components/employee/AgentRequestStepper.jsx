import React from 'react';

export default function AgentRequestStepper({ activeStep = 1, isRtl }) {
  const labels = isRtl
    ? ['الرخصة', 'الوثائق', 'الاستمارة', 'الإرسال']
    : ['Licence', 'Documents', 'Formulaire', 'Envoi'];

  return (
    <div className="agent-request-stepper" aria-label={isRtl ? 'مراحل الطلب' : 'Étapes de la demande'}>
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const state = stepNumber === activeStep ? 'active' : stepNumber < activeStep ? 'done' : 'future';
        return (
          <div key={label} className={`agent-request-step ${state}`}>
            <span className="agent-step-circle">{stepNumber}</span>
            <span className="agent-step-label">{stepNumber}. {label}</span>
          </div>
        );
      })}
    </div>
  );
}
