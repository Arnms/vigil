import type { SelectHTMLAttributes } from 'react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export default function FormSelect({
  label,
  error,
  hint,
  required,
  id,
  options,
  placeholder,
  ...props
}: FormSelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={`
          w-full px-4 py-2 border rounded-lg font-medium
          transition-colors focus:outline-none focus:ring-2 appearance-none
          bg-white cursor-pointer
          ${
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500'
              : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
          }
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
    </div>
  )
}
