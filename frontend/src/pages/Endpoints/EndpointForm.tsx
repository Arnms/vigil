import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { CreateEndpointRequest, HttpMethod } from '../../types/endpoint'

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export default function EndpointForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateEndpointRequest>({
    name: '',
    url: '',
    method: 'GET',
    expectedStatusCode: 200,
    checkInterval: 60,
    timeoutThreshold: 5000,
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름은 필수입니다'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL은 필수입니다'
    } else {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = '유효한 URL이 아닙니다'
      }
    }

    if (formData.checkInterval && formData.checkInterval < 30) {
      newErrors.checkInterval = '최소 30초 이상이어야 합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? parseInt(value)
            : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // TODO: API call
      console.log('Form data:', formData)
      navigate('/endpoints')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">새 엔드포인트</h1>
        <p className="mt-2 text-gray-600">모니터링할 새로운 엔드포인트를 등록하세요</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">이름 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="예: Google API"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700">URL *</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="https://api.example.com/health"
            />
            {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url}</p>}
          </div>

          {/* 메서드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">메서드</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            >
              {httpMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* 체크 간격 & 타임아웃 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">체크 간격 (초)</label>
              <input
                type="number"
                name="checkInterval"
                value={formData.checkInterval}
                onChange={handleChange}
                min="30"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
              {errors.checkInterval && (
                <p className="mt-1 text-sm text-red-600">{errors.checkInterval}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">타임아웃 (ms)</label>
              <input
                type="number"
                name="timeoutThreshold"
                value={formData.timeoutThreshold}
                onChange={handleChange}
                min="1000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          {/* 예상 상태 코드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">예상 상태 코드</label>
            <input
              type="number"
              name="expectedStatusCode"
              value={formData.expectedStatusCode}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>

          {/* 활성화 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">활성화</label>
          </div>

          {/* 버튼 */}
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => navigate('/endpoints')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
