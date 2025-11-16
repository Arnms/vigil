import type { TextareaHTMLAttributes } from 'react'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  charLimit?: number
}

export default function FormTextarea({
  label,
  error,
  hint,
  required,
  id,
  charLimit,
  value,
  ...props
}: FormTextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const charCount = typeof value === 'string' ? value.length : 0

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {charLimit && (
            <span className="text-gray-500 font-normal ml-2">
              ({charCount}/{charLimit})
            </span>
          )}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value}
        maxLength={charLimit}
        {...props}
        className={`
          w-full px-4 py-2 border rounded-lg font-medium
          transition-colors focus:outline-none focus:ring-2
          resize-vertical min-h-24
          ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500'
              : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
          }
          disabled:bg-gray-100 disabled:text-gray-500
        `}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
    </div>
  )
}
