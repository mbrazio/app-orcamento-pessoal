import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground/85 leading-none select-none">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`flex h-10 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-danger focus-visible:ring-danger' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger font-medium leading-none mt-0.5">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
