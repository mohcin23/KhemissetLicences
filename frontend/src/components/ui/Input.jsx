import React, { forwardRef, useCallback } from 'react';
import { filterByLang } from '../../utils/languageFilter';

const Input = forwardRef(function Input(
  { label, hint, error, className = '', id, wrapperClassName = '', icon: Icon, required, lang, onChange, ...rest },
  ref
) {
  const inputId = id || rest.name;

  const handleChange = useCallback((e) => {
    if (!onChange) return;
    if (lang) {
      const filtered = filterByLang(e.target.value, lang);
      if (filtered !== e.target.value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(e.target, filtered);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onChange({ ...e, target: { ...e.target, value: filtered } });
    } else {
      onChange(e);
    }
  }, [lang, onChange]);

  return (
    <label className={`block ${wrapperClassName}`} htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500" aria-hidden="true">*</span>}
        </span>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          onChange={handleChange}
          className={`w-full h-11 ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 border rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-150 ${
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-100'
              : 'border-neutral-200 focus:border-info-500 focus:ring-2 focus:ring-info-100 hover:border-neutral-300'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {hint && !error && (
        <span id={`${inputId}-hint`} className="mt-1 block text-xs text-neutral-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-err`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-error-600" role="alert">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}
    </label>
  );
});

export default Input;

export function Select({ label, hint, error, options = [], className = '', id, wrapperClassName = '', required, lang, ...rest }) {
  const selectId = id || rest.name;
  return (
    <label className={`block ${wrapperClassName}`} htmlFor={selectId}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500" aria-hidden="true">*</span>}
        </span>
      )}
      <select
        id={selectId}
        required={required}
        className={`w-full h-11 px-3.5 pr-10 border rounded-lg bg-white text-sm text-neutral-900 outline-none transition-all duration-150 appearance-none cursor-pointer ${
          error
            ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-100'
            : 'border-neutral-200 focus:border-info-500 focus:ring-2 focus:ring-info-100 hover:border-neutral-300'
        } ${className}`}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-medium text-error-600" role="alert">{error}</span>}
    </label>
  );
}

export function Textarea({ label, hint, error, className = '', id, wrapperClassName = '', required, rows = 4, lang, onChange, ...rest }) {
  const textareaId = id || rest.name;

  const handleTextareaChange = useCallback((e) => {
    if (!onChange) return;
    if (lang) {
      const filtered = filterByLang(e.target.value, lang);
      if (filtered !== e.target.value) {
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeTextareaValueSetter.call(e.target, filtered);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      onChange({ ...e, target: { ...e.target, value: filtered } });
    } else {
      onChange(e);
    }
  }, [lang, onChange]);

  return (
    <label className={`block ${wrapperClassName}`} htmlFor={textareaId}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500" aria-hidden="true">*</span>}
        </span>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        onChange={handleTextareaChange}
        className={`w-full px-3.5 py-2.5 border rounded-lg bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all duration-150 resize-y ${
          error
            ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-100'
            : 'border-neutral-200 focus:border-info-500 focus:ring-2 focus:ring-info-100 hover:border-neutral-300'
        } ${className}`}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {hint && !error && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-medium text-error-600" role="alert">{error}</span>}
    </label>
  );
}
