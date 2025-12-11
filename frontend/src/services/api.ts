import axios from 'axios'
import type { AxiosInstance, AxiosError, AxiosResponse } from 'axios'

// API 클라이언트 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 - 요청 전에 처리
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error: AxiosError) => {
    console.error('[API] Request Error:', error)
    return Promise.reject(error)
  }
)

// 응답 인터셉터 - 응답 후에 처리
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] Response (${response.status}):`, response.config.url)
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      // 서버가 2xx 범위 밖의 상태 코드로 응답
      console.error(
        `[API] Response Error (${error.response.status}):`,
        error.response.data
      )

      // 401 Unauthorized - 로그인 필요
      if (error.response.status === 401) {
        console.error('Unauthorized: Please login again')
        // 로그인 페이지로 리다이렉트 (필요시)
      }

      // 403 Forbidden - 권한 없음
      if (error.response.status === 403) {
        console.error('Forbidden: You do not have permission to access this resource')
      }

      // 500 Server Error
      if (error.response.status >= 500) {
        console.error('Server Error: Please try again later')
      }
    } else if (error.request) {
      // 요청이 이루어졌으나 응답을 받지 못함
      console.error('[API] No Response:', error.request)
    } else {
      // 요청 설정 중 에러 발생
      console.error('[API] Error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient
