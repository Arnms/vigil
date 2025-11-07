# Step 5 상세 설계 문서: 기본 UI 구현

**작성일**: 2025-10-22
**상태**: 설계 초안
**기간**: Day 8-9

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: 프로젝트 셋업](#1단계-프로젝트-셋업)
4. [2단계: 레이아웃 및 라우팅](#2단계-레이아웃-및-라우팅)
5. [3단계: API 서비스 계층](#3단계-api-서비스-계층)
6. [4단계: 엔드포인트 목록 페이지](#4단계-엔드포인트-목록-페이지)
7. [5단계: 엔드포인트 생성 페이지](#5단계-엔드포인트-생성-페이지)
8. [6단계: 엔드포인트 상세 페이지](#6단계-엔드포인트-상세-페이지)
9. [7단계: UI 컴포넌트 라이브러리](#7단계-ui-컴포넌트-라이브러리)
10. [8단계: 상태 관리](#8단계-상태-관리)
11. [데이터 플로우](#데이터-플로우)
12. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ Vite + React + TypeScript 프로젝트 초기화
- ✅ 기본 레이아웃 및 네비게이션 구현
- ✅ React Router를 이용한 라우팅 설정
- ✅ API 통신을 위한 서비스 계층 개발
- ✅ 엔드포인트 CRUD UI 구현 (목록, 생성, 상세)
- ✅ 폼 검증 및 에러 처리
- ✅ 반응형 레이아웃

### 기대 효과
- 백엔드 API와 연동되는 기본 UI 제공
- 사용자가 엔드포인트를 관리할 수 있는 인터페이스
- 모바일 친화적 반응형 디자인
- 빠른 개발 속도 (Vite의 빠른 HMR)
- 타입 안정성 (TypeScript)

---

## 전체 아키텍처

### 시스템 흐름도

```
┌────────────────────────────────────────────────────────────────┐
│                     React 프론트엔드                           │
│  (Vite 개발 서버, 포트 5173)                                   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                    React Router                                 │
│  (클라이언트 라우팅)                                            │
│  - / → Dashboard/홈                                            │
│  - /endpoints → 엔드포인트 목록                                 │
│  - /endpoints/new → 새 엔드포인트 생성                          │
│  - /endpoints/:id → 엔드포인트 상세                            │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                  API Service Layer                             │
│  (Axios 기반, 백엔드와 통신)                                   │
│                                                                │
│  - EndpointService                                             │
│    ├─ getEndpoints()                                          │
│    ├─ getEndpoint(id)                                         │
│    ├─ createEndpoint(data)                                    │
│    ├─ updateEndpoint(id, data)                                │
│    └─ deleteEndpoint(id)                                      │
│                                                                │
│  - StatisticsService (Step 4 API 활용)                        │
│    ├─ getOverview()                                           │
│    ├─ getUptime(endpointId, period)                           │
│    └─ getResponseTime(endpointId, period)                     │
│                                                                │
│  - ApiClient (Axios 설정)                                     │
│    ├─ 기본 설정 (baseURL, timeout)                             │
│    ├─ 인터셉터 (요청/응답 처리)                               │
│    └─ 에러 처리                                                │
└────────────────────────────────────────────────────────────────┘
                            ↓
        ┌─────────────────────────────────┐
        │    백엔드 API (포트 3000)         │
        │                                 │
        │  - POST /api/endpoints          │
        │  - GET /api/endpoints           │
        │  - GET /api/endpoints/:id       │
        │  - PUT /api/endpoints/:id       │
        │  - DELETE /api/endpoints/:id    │
        │                                 │
        │  - GET /api/statistics/...      │
        └─────────────────────────────────┘
```

### 디렉토리 구조

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts                 # Axios 클라이언트 설정
│   │   ├── endpoints.ts              # 엔드포인트 API 서비스
│   │   ├── statistics.ts             # 통계 API 서비스
│   │   └── types.ts                  # API 타입 정의
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx            # 상단 헤더
│   │   │   ├── Sidebar.tsx           # 사이드바/네비게이션
│   │   │   ├── Footer.tsx            # 하단 푸터
│   │   │   └── MainLayout.tsx        # 전체 레이아웃
│   │   ├── common/
│   │   │   ├── Button.tsx            # 기본 버튼
│   │   │   ├── Input.tsx             # 입력 필드
│   │   │   ├── Card.tsx              # 카드 컴포넌트
│   │   │   ├── Table.tsx             # 테이블
│   │   │   ├── Modal.tsx             # 모달 다이얼로그
│   │   │   ├── Badge.tsx             # 상태 배지
│   │   │   └── Alert.tsx             # 알림
│   │   ├── endpoints/
│   │   │   ├── EndpointList.tsx      # 엔드포인트 목록
│   │   │   ├── EndpointForm.tsx      # 엔드포인트 폼
│   │   │   ├── EndpointDetail.tsx    # 엔드포인트 상세
│   │   │   └── EndpointCard.tsx      # 엔드포인트 카드
│   │   └── dashboard/
│   │       ├── DashboardHome.tsx     # 대시보드 홈
│   │       └── StatsSummary.tsx      # 통계 요약
│   ├── hooks/
│   │   ├── useEndpoints.ts           # 엔드포인트 데이터 훅
│   │   ├── useStatistics.ts          # 통계 데이터 훅
│   │   ├── useForm.ts                # 폼 처리 훅
│   │   └── useAsync.ts               # 비동기 처리 훅
│   ├── pages/
│   │   ├── Home.tsx                  # 홈 페이지
│   │   ├── EndpointsPage.tsx         # 엔드포인트 페이지
│   │   ├── CreateEndpointPage.tsx    # 엔드포인트 생성 페이지
│   │   ├── EndpointDetailPage.tsx    # 엔드포인트 상세 페이지
│   │   └── NotFound.tsx              # 404 페이지
│   ├── styles/
│   │   ├── index.css                 # 글로벌 스타일
│   │   ├── variables.css             # CSS 변수
│   │   └── responsive.css            # 반응형 스타일
│   ├── types/
│   │   ├── api.ts                    # API 타입
│   │   ├── endpoint.ts               # 엔드포인트 타입
│   │   └── common.ts                 # 공통 타입
│   ├── utils/
│   │   ├── api-client.ts             # API 클라이언트 헬퍼
│   │   ├── validators.ts             # 유효성 검사
│   │   ├── formatters.ts             # 데이터 포맷팅
│   │   └── constants.ts              # 상수 정의
│   ├── App.tsx                       # 메인 컴포넌트
│   ├── main.tsx                      # 진입점
│   └── vite-env.d.ts                 # Vite 타입 정의
├── public/
│   └── favicon.ico
├── index.html                        # HTML 템플릿
├── vite.config.ts                    # Vite 설정
├── tsconfig.json                     # TypeScript 설정
├── tailwind.config.js                # Tailwind CSS 설정 (선택)
├── package.json
└── .env.example
```

---

## 1단계: 프로젝트 셋업

### 1.1 Vite 프로젝트 생성

```bash
# 프로젝트 생성
npm create vite@latest frontend -- --template react-ts

# 디렉토리 이동
cd frontend

# 의존성 설치
npm install
```

### 1.2 필수 패키지 설치

```bash
# 라우팅
npm install react-router-dom

# HTTP 클라이언트
npm install axios

# 폼 처리 (선택)
npm install react-hook-form

# UI 컴포넌트 (선택)
npm install --save-dev tailwindcss postcss autoprefixer

# 유효성 검사
npm install zod

# 상태 관리 (선택)
npm install zustand
```

### 1.3 환경 설정

```typescript
// .env.example
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=10000
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 2단계: 레이아웃 및 라우팅

### 2.1 React Router 설정

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import EndpointsPage from './pages/EndpointsPage'
import CreateEndpointPage from './pages/CreateEndpointPage'
import EndpointDetailPage from './pages/EndpointDetailPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/endpoints" element={<EndpointsPage />} />
          <Route path="/endpoints/new" element={<CreateEndpointPage />} />
          <Route path="/endpoints/:id" element={<EndpointDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### 2.2 메인 레이아웃

```typescript
// src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import '../styles/layout.css'

export default function MainLayout() {
  return (
    <div className="main-layout">
      <Header />
      <div className="layout-body">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
```

### 2.3 헤더 컴포넌트

```typescript
// src/components/layout/Header.tsx
import { Link } from 'react-router-dom'
import './Header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">📊</span>
          <span className="logo-text">Vigil</span>
        </Link>
        <nav className="header-nav">
          <a href="#" className="nav-link">도움말</a>
          <a href="#" className="nav-link">문서</a>
          <a href="#" className="nav-link">설정</a>
        </nav>
      </div>
    </header>
  )
}
```

### 2.4 사이드바 컴포넌트

```typescript
// src/components/layout/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`nav-item ${isActive('/') && !isActive('/endpoints') ? 'active' : ''}`}
        >
          🏠 대시보드
        </Link>
        <Link
          to="/endpoints"
          className={`nav-item ${isActive('/endpoints') ? 'active' : ''}`}
        >
          📡 엔드포인트
        </Link>
        <Link
          to="/settings"
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
        >
          ⚙️ 설정
        </Link>
      </nav>
    </aside>
  )
}
```

---

## 3단계: API 서비스 계층

### 3.1 API 클라이언트

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000')

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        // 인증 토큰이 필요하면 여기에 추가
        return config
      },
      (error) => Promise.reject(error)
    )

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // 공통 에러 처리
        if (error.response?.status === 401) {
          // 인증 만료 처리
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: any) {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: any) {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: any) {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: any) {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: any) {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export default new ApiClient()
```

### 3.2 타입 정의

```typescript
// src/types/api.ts
export interface Endpoint {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  expectedStatusCode: number
  checkInterval: number // 초 단위
  timeoutThreshold: number // ms
  isActive: boolean
  currentStatus: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  createdAt: string
  updatedAt: string
}

export interface CreateEndpointRequest {
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  expectedStatusCode?: number
  checkInterval?: number
  timeoutThreshold?: number
  isActive?: boolean
}

export interface UpdateEndpointRequest extends Partial<CreateEndpointRequest> {}

export interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface OverviewStats {
  totalEndpoints: number
  statusBreakdown: {
    UP: number
    DOWN: number
    DEGRADED: number
    UNKNOWN: number
  }
  overallUptime: number
  activeIncidents: number
  totalIncidentsLast24h: number
  averageResponseTime: number
}
```

### 3.3 Endpoint 서비스

```typescript
// src/api/endpoints.ts
import client from './client'
import {
  Endpoint,
  CreateEndpointRequest,
  UpdateEndpointRequest,
  PaginatedResponse,
} from '../types/api'

export const endpointService = {
  // 모든 엔드포인트 조회
  async getAll(page?: number, limit?: number): Promise<PaginatedResponse<Endpoint>> {
    const params: any = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    return client.get('/api/endpoints', { params })
  },

  // 특정 엔드포인트 조회
  async getById(id: string): Promise<Endpoint> {
    return client.get(`/api/endpoints/${id}`)
  },

  // 엔드포인트 생성
  async create(data: CreateEndpointRequest): Promise<Endpoint> {
    return client.post('/api/endpoints', data)
  },

  // 엔드포인트 수정
  async update(id: string, data: UpdateEndpointRequest): Promise<Endpoint> {
    return client.put(`/api/endpoints/${id}`, data)
  },

  // 엔드포인트 삭제
  async delete(id: string): Promise<void> {
    return client.delete(`/api/endpoints/${id}`)
  },

  // 엔드포인트 수동 체크 트리거
  async triggerHealthCheck(id: string): Promise<any> {
    return client.post(`/api/endpoints/${id}/check`)
  },
}
```

### 3.4 Statistics 서비스

```typescript
// src/api/statistics.ts
import client from './client'
import { OverviewStats } from '../types/api'

export const statisticsService = {
  // 전체 통계 개요
  async getOverview(): Promise<OverviewStats> {
    return client.get('/api/statistics/overview')
  },

  // 엔드포인트 가동률
  async getUptime(endpointId: string, period: string = '24h'): Promise<any> {
    return client.get(`/api/statistics/endpoints/${endpointId}/uptime`, {
      params: { period },
    })
  },

  // 엔드포인트 응답 시간
  async getResponseTime(endpointId: string, period: string = '24h'): Promise<any> {
    return client.get(`/api/statistics/endpoints/${endpointId}/response-time`, {
      params: { period },
    })
  },

  // 전체 엔드포인트 비교
  async getComparison(): Promise<any> {
    return client.get('/api/statistics/comparison')
  },

  // 인시던트 목록
  async getIncidents(status?: string, page?: number): Promise<any> {
    return client.get('/api/incidents', {
      params: { status, page },
    })
  },
}
```

---

## 4단계: 엔드포인트 목록 페이지

### 4.1 EndpointList 컴포넌트

```typescript
// src/components/endpoints/EndpointList.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { endpointService } from '../../api/endpoints'
import { Endpoint } from '../../types/api'
import Button from '../common/Button'
import Badge from '../common/Badge'
import Table from '../common/Table'
import './EndpointList.css'

export default function EndpointList() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEndpoints()
  }, [])

  const loadEndpoints = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await endpointService.getAll()
      setEndpoints(response.data)
    } catch (err) {
      setError('엔드포인트를 불러올 수 없습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await endpointService.delete(id)
        setEndpoints(endpoints.filter((e) => e.id !== id))
      } catch (err) {
        setError('삭제에 실패했습니다.')
      }
    }
  }

  if (loading) {
    return <div className="loading">로드 중...</div>
  }

  return (
    <div className="endpoint-list">
      <div className="list-header">
        <h1>엔드포인트</h1>
        <Link to="/endpoints/new">
          <Button variant="primary">새 엔드포인트</Button>
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {endpoints.length === 0 ? (
        <div className="empty-state">
          <p>등록된 엔드포인트가 없습니다.</p>
          <Link to="/endpoints/new">
            <Button>첫 엔드포인트 추가</Button>
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="endpoints-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>URL</th>
                <th>메서드</th>
                <th>상태</th>
                <th>체크 간격</th>
                <th>활성</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.id}>
                  <td className="name-cell">
                    <Link to={`/endpoints/${endpoint.id}`}>
                      {endpoint.name}
                    </Link>
                  </td>
                  <td className="url-cell">{endpoint.url}</td>
                  <td>{endpoint.method}</td>
                  <td>
                    <Badge status={endpoint.currentStatus}>
                      {endpoint.currentStatus}
                    </Badge>
                  </td>
                  <td>{endpoint.checkInterval}초</td>
                  <td>
                    {endpoint.isActive ? (
                      <span className="badge-active">활성</span>
                    ) : (
                      <span className="badge-inactive">비활성</span>
                    )}
                  </td>
                  <td className="actions">
                    <Link to={`/endpoints/${endpoint.id}`}>
                      <Button size="sm">상세</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(endpoint.id)}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

### 4.2 EndpointsPage

```typescript
// src/pages/EndpointsPage.tsx
import EndpointList from '../components/endpoints/EndpointList'

export default function EndpointsPage() {
  return <EndpointList />
}
```

---

## 5단계: 엔드포인트 생성 페이지

### 5.1 EndpointForm 컴포넌트

```typescript
// src/components/endpoints/EndpointForm.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpointService } from '../../api/endpoints'
import { CreateEndpointRequest } from '../../types/api'
import Button from '../common/Button'
import Input from '../common/Input'
import './EndpointForm.css'

interface EndpointFormProps {
  initialData?: CreateEndpointRequest
  onSubmit?: () => void
}

export default function EndpointForm({ initialData, onSubmit }: EndpointFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateEndpointRequest>(
    initialData || {
      name: '',
      url: '',
      method: 'GET',
      expectedStatusCode: 200,
      checkInterval: 60,
      timeoutThreshold: 5000,
      isActive: true,
    }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      // 유효성 검사
      if (!formData.name || !formData.url) {
        setError('이름과 URL은 필수입니다.')
        return
      }

      await endpointService.create(formData)
      onSubmit?.()
      navigate('/endpoints')
    } catch (err) {
      setError('엔드포인트 생성에 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="endpoint-form" onSubmit={handleSubmit}>
      <h2>엔드포인트 {initialData ? '수정' : '생성'}</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">이름 *</label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="예: Google API"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="url">URL *</label>
        <Input
          id="url"
          name="url"
          type="url"
          value={formData.url}
          onChange={handleChange}
          placeholder="https://api.example.com/health"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="method">메서드</label>
          <select
            id="method"
            name="method"
            value={formData.method}
            onChange={handleChange}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="expectedStatusCode">예상 상태 코드</label>
          <Input
            id="expectedStatusCode"
            name="expectedStatusCode"
            type="number"
            value={formData.expectedStatusCode}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="checkInterval">체크 간격 (초)</label>
          <Input
            id="checkInterval"
            name="checkInterval"
            type="number"
            value={formData.checkInterval}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeoutThreshold">타임아웃 (ms)</label>
          <Input
            id="timeoutThreshold"
            name="timeoutThreshold"
            type="number"
            value={formData.timeoutThreshold}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group checkbox">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={handleChange}
        />
        <label htmlFor="isActive">활성화</label>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/endpoints')}
        >
          취소
        </Button>
      </div>
    </form>
  )
}
```

### 5.2 CreateEndpointPage

```typescript
// src/pages/CreateEndpointPage.tsx
import EndpointForm from '../components/endpoints/EndpointForm'

export default function CreateEndpointPage() {
  return <EndpointForm />
}
```

---

## 6단계: 엔드포인트 상세 페이지

### 6.1 EndpointDetail 컴포넌트

```typescript
// src/components/endpoints/EndpointDetail.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { endpointService } from '../../api/endpoints'
import { statisticsService } from '../../api/statistics'
import { Endpoint } from '../../types/api'
import EndpointForm from './EndpointForm'
import Badge from '../common/Badge'
import './EndpointDetail.css'

export default function EndpointDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (id) {
      loadEndpoint()
      loadStatistics()
    }
  }, [id])

  const loadEndpoint = async () => {
    try {
      const data = await endpointService.getById(id!)
      setEndpoint(data)
    } catch (err) {
      setError('엔드포인트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const uptime = await statisticsService.getUptime(id!, '24h')
      setStats(uptime)
    } catch (err) {
      console.error('통계 로드 실패', err)
    }
  }

  if (loading) return <div className="loading">로드 중...</div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!endpoint) return <div className="alert alert-error">엔드포인트를 찾을 수 없습니다.</div>

  if (isEditing) {
    return (
      <EndpointForm
        initialData={endpoint}
        onSubmit={() => {
          setIsEditing(false)
          loadEndpoint()
        }}
      />
    )
  }

  return (
    <div className="endpoint-detail">
      <div className="detail-header">
        <div>
          <h1>{endpoint.name}</h1>
          <Badge status={endpoint.currentStatus}>{endpoint.currentStatus}</Badge>
        </div>
        <div className="actions">
          <button className="btn-edit" onClick={() => setIsEditing(true)}>
            수정
          </button>
          <button className="btn-back" onClick={() => navigate('/endpoints')}>
            돌아가기
          </button>
        </div>
      </div>

      <div className="detail-content">
        <section className="detail-section">
          <h2>기본 정보</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>URL</label>
              <code>{endpoint.url}</code>
            </div>
            <div className="info-item">
              <label>메서드</label>
              <span>{endpoint.method}</span>
            </div>
            <div className="info-item">
              <label>체크 간격</label>
              <span>{endpoint.checkInterval}초</span>
            </div>
            <div className="info-item">
              <label>타임아웃</label>
              <span>{endpoint.timeoutThreshold}ms</span>
            </div>
            <div className="info-item">
              <label>예상 상태 코드</label>
              <span>{endpoint.expectedStatusCode}</span>
            </div>
            <div className="info-item">
              <label>활성</label>
              <span>{endpoint.isActive ? '✓ 활성' : '✗ 비활성'}</span>
            </div>
          </div>
        </section>

        {stats && (
          <section className="detail-section">
            <h2>24시간 통계</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <label>가동률</label>
                <div className="stat-value">{stats.uptime}%</div>
              </div>
              <div className="stat-card">
                <label>총 체크</label>
                <div className="stat-value">{stats.totalChecks}</div>
              </div>
              <div className="stat-card">
                <label>성공</label>
                <div className="stat-value success">{stats.successfulChecks}</div>
              </div>
              <div className="stat-card">
                <label>실패</label>
                <div className="stat-value error">{stats.failedChecks}</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
```

### 6.2 EndpointDetailPage

```typescript
// src/pages/EndpointDetailPage.tsx
import EndpointDetail from '../components/endpoints/EndpointDetail'

export default function EndpointDetailPage() {
  return <EndpointDetail />
}
```

---

## 7단계: UI 컴포넌트 라이브러리

### 7.1 기본 컴포넌트들

```typescript
// src/components/common/Button.tsx
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? '로드 중...' : children}
    </button>
  )
}
```

```typescript
// src/components/common/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export default function Input({ error, label, ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label>{label}</label>}
      <input className="input" {...props} />
      {error && <span className="input-error">{error}</span>}
    </div>
  )
}
```

```typescript
// src/components/common/Badge.tsx
interface BadgeProps {
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
  children: React.ReactNode
}

export default function Badge({ status, children }: BadgeProps) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{children}</span>
}
```

```typescript
// src/components/common/Alert.tsx
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
  onClose?: () => void
}

export default function Alert({ type, children, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${type}`}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="alert-close">
          ×
        </button>
      )}
    </div>
  )
}
```

---

## 8단계: 상태 관리

### 8.1 Zustand를 이용한 상태 관리 (선택)

```typescript
// src/stores/endpointStore.ts
import create from 'zustand'
import { Endpoint } from '../types/api'

interface EndpointStore {
  endpoints: Endpoint[]
  setEndpoints: (endpoints: Endpoint[]) => void
  addEndpoint: (endpoint: Endpoint) => void
  updateEndpoint: (id: string, endpoint: Endpoint) => void
  removeEndpoint: (id: string) => void
  clearEndpoints: () => void
}

export const useEndpointStore = create<EndpointStore>((set) => ({
  endpoints: [],
  setEndpoints: (endpoints) => set({ endpoints }),
  addEndpoint: (endpoint) =>
    set((state) => ({ endpoints: [...state.endpoints, endpoint] })),
  updateEndpoint: (id, endpoint) =>
    set((state) => ({
      endpoints: state.endpoints.map((e) => (e.id === id ? endpoint : e)),
    })),
  removeEndpoint: (id) =>
    set((state) => ({
      endpoints: state.endpoints.filter((e) => e.id !== id),
    })),
  clearEndpoints: () => set({ endpoints: [] }),
}))
```

---

## 데이터 플로우

### 엔드포인트 목록 조회 플로우

```
사용자 방문 (/endpoints)
  ↓
EndpointsPage 렌더링
  ↓
EndpointList 컴포넌트 마운트
  ↓
useEffect 실행 → loadEndpoints()
  ↓
endpointService.getAll() 호출
  ↓
API Client → GET /api/endpoints
  ↓
백엔드 처리
  ↓
응답 반환
  ↓
setEndpoints(data) → 상태 업데이트
  ↓
컴포넌트 리렌더링
  ↓
테이블 표시
```

### 엔드포인트 생성 플로우

```
사용자 click: "새 엔드포인트"
  ↓
네비게이션: /endpoints/new
  ↓
CreateEndpointPage 렌더링
  ↓
EndpointForm 컴포넌트
  ↓
사용자 입력 → formData 상태 업데이트
  ↓
사용자 submit
  ↓
유효성 검사
  ↓
endpointService.create(formData)
  ↓
API Client → POST /api/endpoints
  ↓
백엔드 처리 (저장, 유효성 검사)
  ↓
응답 반환 (생성된 엔드포인트)
  ↓
네비게이션: /endpoints
  ↓
EndpointList 다시 로드
```

---

## 구현 체크리스트

### Phase 1: 프로젝트 셋업
- [ ] Vite 프로젝트 생성
- [ ] 기본 패키지 설치 (React Router, Axios, 등)
- [ ] TypeScript 설정 확인
- [ ] 환경 변수 설정 (.env.example)
- [ ] Vite 개발 서버 실행 테스트

### Phase 2: 레이아웃 및 라우팅
- [ ] React Router 설정
- [ ] 라우트 정의
- [ ] MainLayout 컴포넌트 작성
- [ ] Header 컴포넌트 작성
- [ ] Sidebar 컴포넌트 작성
- [ ] Footer 컴포넌트 작성
- [ ] CSS 스타일링 (레이아웃)

### Phase 3: API 서비스 계층
- [ ] ApiClient 설정 (Axios)
- [ ] 요청/응답 인터셉터 작성
- [ ] API 타입 정의
- [ ] Endpoint 서비스 구현
- [ ] Statistics 서비스 구현
- [ ] 에러 처리 로직

### Phase 4: 엔드포인트 목록 페이지
- [ ] EndpointList 컴포넌트 작성
- [ ] EndpointsPage 페이지 작성
- [ ] API 통신 테스트
- [ ] 로딩/에러 상태 처리
- [ ] 테이블 스타일링
- [ ] 삭제 기능 구현

### Phase 5: 엔드포인트 생성 페이지
- [ ] EndpointForm 컴포넌트 작성
- [ ] CreateEndpointPage 페이지 작성
- [ ] 폼 검증 로직
- [ ] API 통신 테스트
- [ ] 에러 메시지 표시
- [ ] 폼 스타일링

### Phase 6: 엔드포인트 상세 페이지
- [ ] EndpointDetail 컴포넌트 작성
- [ ] EndpointDetailPage 페이지 작성
- [ ] 통계 데이터 표시
- [ ] 수정 기능 구현
- [ ] API 통신 테스트
- [ ] 스타일링

### Phase 7: UI 컴포넌트 라이브러리
- [ ] Button 컴포넌트
- [ ] Input 컴포넌트
- [ ] Badge 컴포넌트
- [ ] Alert 컴포넌트
- [ ] Modal 컴포넌트
- [ ] Table 컴포넌트
- [ ] CSS 모듈/Tailwind 설정

### Phase 8: 상태 관리 (선택)
- [ ] Zustand 스토어 설정
- [ ] Endpoint 스토어 구현
- [ ] 컴포넌트에 스토어 통합
- [ ] 상태 업데이트 로직

### Phase 9: 통합 테스트
- [ ] 모든 페이지 수동 테스트
- [ ] API 통신 테스트
- [ ] 폼 검증 테스트
- [ ] 에러 처리 테스트
- [ ] 반응형 디자인 테스트

### Phase 10: 성능 최적화
- [ ] 번들 크기 분석
- [ ] 느린 컴포넌트 최적화 (React.memo)
- [ ] 이미지 최적화
- [ ] 캐싱 전략

### Phase 11: 문서화
- [ ] README.md 작성
- [ ] 컴포넌트 사용법 문서
- [ ] API 클라이언트 사용법

### Phase 12: 최종 검증
- [ ] 백엔드와 모든 기능 연동 확인
- [ ] 크로스 브라우저 테스트
- [ ] 성능 측정
- [ ] 접근성 검사

---

## 기술 스택 요약

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | ^18.0 |
| 언어 | TypeScript | ^5.0 |
| 빌드 도구 | Vite | ^5.0 |
| 라우팅 | React Router | ^6.0 |
| HTTP 클라이언트 | Axios | ^1.0 |
| 상태 관리 | Zustand | ^4.0 |
| 폼 처리 | React Hook Form | ^7.0 |
| UI 프레임워크 | Tailwind CSS | ^3.0 (선택) |
| 유효성 검사 | Zod | ^3.0 |

---

## 개발 서버 실행

```bash
cd frontend

# 개발 모드로 실행 (포트 5173)
npm run dev

# 빌드
npm run build

# 프로덕션 모드로 실행
npm run preview
```

---

## 주의사항

1. **CORS**: 백엔드에서 CORS 설정이 필요합니다.
2. **타입 안정성**: 모든 API 응답에 대한 타입을 정의해야 합니다.
3. **에러 처리**: 모든 API 호출에 try-catch를 사용합니다.
4. **로딩 상태**: 비동기 작업 중 로딩 UI를 표시합니다.
5. **네비게이션**: 모든 페이지 간 네비게이션이 작동해야 합니다.

---

**문서 작성**: 2025-10-22
**상태**: 설계 초안 완성
