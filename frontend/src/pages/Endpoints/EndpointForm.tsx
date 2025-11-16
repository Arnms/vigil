import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useEndpointStore } from '../../stores/endpoint.store'
import { useUIStore } from '../../stores/ui.store'
import FormInput from '../../components/Form/FormInput'
import FormSelect from '../../components/Form/FormSelect'
import FormTextarea from '../../components/Form/FormTextarea'
import type { CreateEndpointRequest, HttpMethod } from '../../types/endpoint'

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const checkIntervalOptions = [
  { value: '30', label: '30초' },
  { value: '60', label: '1분' },
  { value: '300', label: '5분' },
  { value: '600', label: '10분' },
  { value: '1800', label: '30분' },
  { value: '3600', label: '1시간' },
]

const statusCodeOptions = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '204', label: '204 No Content' },
  { value: '301', label: '301 Moved Permanently' },
  { value: '304', label: '304 Not Modified' },
  { value: '400', label: '400 Bad Request' },
  { value: '401', label: '401 Unauthorized' },
  { value: '403', label: '403 Forbidden' },
  { value: '404', label: '404 Not Found' },
  { value: '500', label: '500 Internal Server Error' },
  { value: '502', label: '502 Bad Gateway' },
  { value: '503', label: '503 Service Unavailable' },
]

export default function EndpointForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  const { createEndpoint, updateEndpoint, fetchEndpoint, selectedEndpoint } =
    useEndpointStore()
  const { addAlert } = useUIStore()

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 수정 모드일 때 엔드포인트 데이터 로드
  useEffect(() => {
    if (isEditMode && id) {
      fetchEndpoint(id)
    }
  }, [isEditMode, id, fetchEndpoint])

  // 선택된 엔드포인트 데이터를 폼에 채우기
  useEffect(() => {
    if (isEditMode && selectedEndpoint) {
      setFormData({
        name: selectedEndpoint.name,
        url: selectedEndpoint.url,
        method: selectedEndpoint.method,
        headers: selectedEndpoint.headers,
        body: selectedEndpoint.body,
        expectedStatusCode: selectedEndpoint.expectedStatusCode,
        checkInterval: selectedEndpoint.checkInterval,
        timeoutThreshold: selectedEndpoint.timeoutThreshold,
        isActive: selectedEndpoint.isActive,
      })
    }
  }, [isEditMode, selectedEndpoint])

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

    if (!formData.checkInterval || formData.checkInterval < 30) {
      newErrors.checkInterval = '최소 30초 이상이어야 합니다'
    }

    if (!formData.expectedStatusCode || formData.expectedStatusCode < 100 || formData.expectedStatusCode > 599) {
      newErrors.expectedStatusCode = '유효한 HTTP 상태 코드를 입력하세요 (100-599)'
    }

    if (!formData.timeoutThreshold || formData.timeoutThreshold < 1000) {
      newErrors.timeoutThreshold = '최소 1000ms 이상이어야 합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? parseInt(value) || 0
            : value,
    }))
    // 입력 중 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      if (isEditMode && id) {
        await updateEndpoint(id, formData)
        addAlert('success', '엔드포인트가 수정되었습니다', 3000)
      } else {
        await createEndpoint(formData)
        addAlert('success', '엔드포인트가 생성되었습니다', 3000)
      }
      navigate('/endpoints')
    } catch (err) {
      addAlert('error', `엔드포인트 ${isEditMode ? '수정' : '생성'}에 실패했습니다`, 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? '엔드포인트 수정' : '새 엔드포인트'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditMode
            ? '엔드포인트 설정을 수정하세요'
            : '모니터링할 새로운 엔드포인트를 등록하세요'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="space-y-4">
              <FormInput
                label="이름"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="예: Google API Health Check"
                required
              />

              <FormInput
                label="URL"
                name="url"
                type="url"
                value={formData.url}
                onChange={handleChange}
                error={errors.url}
                placeholder="https://api.example.com/health"
                required
              />

              <FormSelect
                label="HTTP 메서드"
                name="method"
                value={formData.method}
                onChange={handleChange}
                options={httpMethods.map((m) => ({ value: m, label: m }))}
              />
            </div>
          </div>

          {/* 체크 설정 섹션 */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">체크 설정</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="체크 간격"
                name="checkInterval"
                value={String(formData.checkInterval)}
                onChange={handleChange}
                options={checkIntervalOptions}
                error={errors.checkInterval}
                required
              />

              <FormInput
                label="타임아웃 (ms)"
                name="timeoutThreshold"
                type="number"
                value={formData.timeoutThreshold}
                onChange={handleChange}
                error={errors.timeoutThreshold}
                hint="1000ms 이상 권장"
                required
                min="1000"
              />
            </div>
          </div>

          {/* 응답 설정 섹션 */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">응답 설정</h2>
            <FormSelect
              label="예상 상태 코드"
              name="expectedStatusCode"
              value={String(formData.expectedStatusCode)}
              onChange={handleChange}
              options={statusCodeOptions}
              error={errors.expectedStatusCode}
              required
            />
          </div>

          {/* 선택사항 섹션 */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">선택사항</h2>
            <div className="space-y-4">
              <FormTextarea
                label="요청 헤더 (JSON)"
                name="headers"
                value={JSON.stringify(formData.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value)
                    handleChange({
                      ...e,
                      target: { ...e.target, name: 'headers', value: headers },
                    } as any)
                  } catch {
                    // 파싱 실패 시 무시
                  }
                }}
                placeholder='예: {"Authorization": "Bearer token"}'
                hint="선택사항 - JSON 형식으로 입력하세요"
              />

              <FormTextarea
                label="요청 바디 (JSON)"
                name="body"
                value={formData.body || ''}
                onChange={handleChange}
                placeholder='예: {"key": "value"}'
                hint="선택사항 - POST, PUT, PATCH 메서드 사용 시 입력"
              />

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  활성화
                </label>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '처리 중...' : isEditMode ? '수정' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/endpoints')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
