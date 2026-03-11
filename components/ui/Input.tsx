import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-secondary font-sans">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-3 py-2.5 rounded-md border bg-[#FAF8F4] text-text-primary font-sans text-sm placeholder:text-text-muted
          focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors
          ${error ? 'border-danger' : 'border-border'}
          ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-secondary font-sans">{label}</label>}
      <select
        ref={ref}
        className={`w-full px-3 py-2.5 rounded-md border bg-[#FAF8F4] text-text-primary font-sans text-sm
          focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors
          ${error ? 'border-danger' : 'border-border'}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-text-secondary font-sans">{label}</label>}
      <textarea
        ref={ref}
        className={`w-full px-3 py-2.5 rounded-md border bg-[#FAF8F4] text-text-primary font-sans text-sm placeholder:text-text-muted
          focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none
          ${error ? 'border-danger' : 'border-border'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
