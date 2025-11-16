import { useState } from 'react'

export type DateRange = '24h' | '7d' | '30d' | 'custom'

interface DateRangePickerProps {
  selectedRange: DateRange
  onRangeChange: (range: DateRange) => void
}

export default function DateRangePicker({ selectedRange, onRangeChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const ranges = [
    { value: '24h' as DateRange, label: '24시간' },
    { value: '7d' as DateRange, label: '7일' },
    { value: '30d' as DateRange, label: '30일' },
    { value: 'custom' as DateRange, label: '직접 설정' },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => {
            onRangeChange(range.value)
            if (range.value !== 'custom') {
              setShowCustom(false)
            } else {
              setShowCustom(true)
            }
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedRange === range.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {range.label}
        </button>
      ))}

      {showCustom && selectedRange === 'custom' && (
        <div className="flex gap-2 ml-2 w-full">
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="시작일"
          />
          <span className="self-center text-gray-600">~</span>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="종료일"
          />
        </div>
      )}
    </div>
  )
}
