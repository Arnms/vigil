# Step 6 상세 설계 문서: 대시보드 & 차트

**작성일**: 2025-11-16
**상태**: 설계 완료
**기간**: Day 10-11

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: 대시보드 페이지 기본 구조](#1단계-대시보드-페이지-기본-구조)
4. [2단계: 상태 카드 컴포넌트](#2단계-상태-카드-컴포넌트)
5. [3단계: 응답 시간 차트](#3단계-응답-시간-차트)
6. [4단계: 가동률 차트](#4단계-가동률-차트)
7. [5단계: 인시던트 타임라인](#5단계-인시던트-타임라인)
8. [6단계: 필터 및 기간 선택](#6단계-필터-및-기간-선택)
9. [7단계: 데이터 새로고침](#7단계-데이터-새로고침)
10. [8단계: 반응형 디자인](#8단계-반응형-디자인)
11. [데이터 플로우](#데이터-플로우)
12. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ 실시간 모니터링 대시보드 페이지 구현
- ✅ 4개 핵심 지표를 표시하는 상태 카드 구현
- ✅ Recharts를 사용한 차트 시각화
- ✅ 응답 시간 추이 분석 차트
- ✅ 엔드포인트별 가동률 비교 차트
- ✅ 최근 인시던트 타임라인 표시
- ✅ 기간 선택 필터 기능
- ✅ 자동 데이터 새로고침
- ✅ 모바일 친화적 반응형 디자인

### 기대 효과
- 한 화면에서 전체 시스템 상태 파악
- 실시간 지표 업데이트로 즉시 장애 감지
- 차트를 통한 직관적 성능 분석
- 다양한 시간대의 데이터 비교 분석
- 모든 디바이스에서 사용 가능한 인터페이스

---

## 전체 아키텍처

### 시스템 흐름도

```
┌────────────────────────────────────────────────────────────────┐
│                    React Dashboard Page                        │
│  (src/pages/Dashboard.tsx)                                     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1️⃣ 요약 통계 (4개 카드)                                 │  │
│  │    ├─ 정상 서버 (UP 상태)                               │  │
│  │    ├─ 장애 서버 (DOWN 상태)                             │  │
│  │    ├─ 평균 가동률                                       │  │
│  │    └─ 활성 인시던트                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2️⃣ 차트 영역 (2열)                                      │  │
│  │    ├─ 응답 시간 차트 (LineChart)                        │  │
│  │    │  ├─ X축: 시간                                      │  │
│  │    │  ├─ Y축: 응답 시간 (ms)                            │  │
│  │    │  ├─ 평균, 최소, 최대 라인                          │  │
│  │    │  └─ 범례, 툴팁 지원                                │  │
│  │    └─ 가동률 차트 (BarChart)                            │  │
│  │       ├─ 각 엔드포인트별 가동률                         │  │
│  │       ├─ 색상으로 상태 구분                             │  │
│  │       └─ 퍼센티지 표시                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 3️⃣ 최근 인시던트 타임라인                                │  │
│  │    ├─ 세로 라인                                         │  │
│  │    ├─ 원형 아이콘 (상태별 색상)                         │  │
│  │    ├─ 타임스탐프                                        │  │
│  │    ├─ 지속 시간                                         │  │
│  │    └─ 최근 10개 항목                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                    Zustand 상태 관리                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ EndpointStore    │ IncidentStore    │ StatisticsStore  │   │
│  ├──────────────────┼──────────────────┼──────────────────┤   │
│  │ endpoints[]      │ incidents[]      │ overview         │   │
│  │ fetchEndpoints   │ fetchIncidents   │ fetchOverview    │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                      API Services                              │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ endpointService  │ incidentService  │ statisticsService│   │
│  ├──────────────────┼──────────────────┼──────────────────┤   │
│  │ getAll()         │ getAll()         │ getOverview()    │   │
│  │                  │ getRecent()      │ getUptime()      │   │
│  │                  │                  │ getResponseTime()│   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│              백엔드 API (포트 3000)                              │
│  - GET /api/statistics/overview                              │
│  - GET /api/endpoints                                        │
│  - GET /api/incidents                                        │
│  - GET /api/statistics/timeseries                            │
└────────────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
frontend/src/
├── pages/
│   └── Dashboard.tsx              # 대시보드 메인 페이지
├── components/
│   ├── Dashboard/
│   │   ├── StatusCard.tsx         # 상태 카드 (4개)
│   │   ├── ResponseTimeChart.tsx  # 응답 시간 차트
│   │   ├── UptimeChart.tsx        # 가동률 차트
│   │   └── IncidentTimeline.tsx   # 인시던트 타임라인
│   └── Common/
│       └── DateRangePicker.tsx    # 기간 선택 컴포넌트
├── stores/
│   ├── endpoint.store.ts          # 엔드포인트 상태 관리
│   ├── incident.store.ts          # 인시던트 상태 관리
│   └── statistics.store.ts        # 통계 상태 관리
└── types/
    └── statistics.ts              # 통계 관련 타입
```

---

## 1단계: 대시보드 페이지 기본 구조

### 목표
전체 시스템 상태를 한눈에 볼 수 있는 대시보드 레이아웃 구성

### 레이아웃 설계

```
┌─────────────────────────────────────────────────────┐
│ 헤더                                                │
│ • 제목: "대시보드"                                  │
│ • 부제: "API 모니터링 대시보드에 오신 것을 환영합니다" │
│ • 마지막 업데이트: 시간                             │
│ • 기간 선택 (우측)                                  │
├─────────────────────────────────────────────────────┤
│ 요약 통계 (4개 카드, 그리드)                         │
│ ┌──────────┬──────────┬──────────┬──────────┐      │
│ │  정상    │  장애    │  가동률  │ 활성     │      │
│ │  서버    │  서버    │  (%)     │ 인시던트 │      │
│ │   🟢     │  🔴     │   📊    │   🚨    │      │
│ └──────────┴──────────┴──────────┴──────────┘      │
├─────────────────────────────────────────────────────┤
│ 차트 영역 (2열)                                     │
│ ┌───────────────────────┬───────────────────────┐  │
│ │ 응답 시간 차트        │ 가동률 차트           │  │
│ │ (LineChart)          │ (BarChart)            │  │
│ │                      │                       │  │
│ │                      │                       │  │
│ └───────────────────────┴───────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ 최근 활동 (인시던트 타임라인)                        │
│ ●─────── 2025-11-16 10:00                        │
│ │        API Server DOWN (5분)                   │
│ │                                                │
│ ●─────── 2025-11-15 14:30                        │
│ │        Payment Gateway DEGRADED (2분)          │
│ │                                                │
│ ●─────── 2025-11-15 08:00                        │
│          User Service DOWN (15분)                │
└─────────────────────────────────────────────────────┘
```

### 반응형 그리드 설정

- **데스크톱 (lg)**: 4열 또는 2x2 카드
- **태블릿 (md)**: 2열 카드
- **모바일 (sm)**: 1열 카드

---

## 2단계: 상태 카드 컴포넌트

### StatusCard 컴포넌트 설계

```typescript
interface StatusCardProps {
  title: string
  value: number | string
  unit?: string
  icon?: string
  color?: 'green' | 'red' | 'blue' | 'yellow'
  trend?: 'up' | 'down' | 'stable'
  isLoading?: boolean
}
```

### 4개 주요 지표 카드

| 카드 | 값 | 아이콘 | 색상 | 추세 계산 |
|------|-----|--------|------|---------|
| 정상 서버 | UP 상태 개수 | 🟢 | Green | UP > DOWN ? up : down |
| 장애 서버 | DOWN 상태 개수 | 🔴 | Red | DOWN == 0 ? up : down |
| 평균 가동률 | overallUptime * 100 | 📊 | Blue | >= 0.99 ? up : down |
| 활성 인시던트 | 해결되지 않은 인시던트 개수 | 🚨 | Red/Green | == 0 ? up : down |

### 카드 스타일

```css
/* 배경: 흰색 */
/* 테두리: 연한 회색 (1px) */
/* 그림자: subtle shadow */
/* 텍스트: 기본 검은색, 값은 굵고 큼 */
/* 트렌드 아이콘: 색상으로 시각화 */
```

---

## 3단계: 응답 시간 차트

### ResponseTimeChart 컴포넌트 설계

```typescript
interface ResponseTimeChartProps {
  data: Array<{
    timestamp: string
    '평균 응답시간': number
    '최소': number
    '최대': number
  }>
  isLoading?: boolean
}
```

### 차트 설정

- **차트 유형**: LineChart
- **X축**: 타임스탐프 (시간)
- **Y축**: 응답 시간 (ms)
- **라인 종류**:
  - 평균 응답시간 (파란색)
  - 최소 응답시간 (초록색)
  - 최대 응답시간 (빨간색)

### 차트 기능

- 범례 (Legend): 3개 라인 표시
- 툴팁: 호버 시 상세 값 표시
- 격자선: 가로 및 세로 라인
- 반응형: 너비 100%, 높이 300px

### 데이터 포맷

```javascript
[
  {
    timestamp: '09:00',
    '평균 응답시간': 145,
    '최소': 89,
    '최대': 234
  },
  // ...
]
```

---

## 4단계: 가동률 차트

### UptimeChart 컴포넌트 설계

```typescript
interface UptimeData {
  name: string
  uptime: number // 0-1 사이의 값
}

interface UptimeChartProps {
  data: UptimeData[]
  isLoading?: boolean
}
```

### 차트 설정

- **차트 유형**: BarChart
- **X축**: 엔드포인트 이름
- **Y축**: 가동률 (%)
- **정렬**: 가동률 높은 순서대로
- **색상 코딩**:
  - 초록색 (🟢): >= 99%
  - 라임색 (🟩): >= 95%
  - 주황색 (🟧): >= 90%
  - 빨간색 (🔴): < 90%

### 차트 기능

- 막대 라벨: 퍼센티지 표시
- 툴팁: 정확한 가동률 표시
- X축 레이블: 45도 회전 (모바일 고려)

---

## 5단계: 인시던트 타임라인

### IncidentTimeline 컴포넌트 설계

```typescript
interface IncidentData {
  id: string
  endpoint: {
    id: string
    name: string
  }
  startedAt: string
  resolvedAt?: string
  failureCount: number
  errorMessage?: string
}

interface IncidentTimelineProps {
  incidents: IncidentData[]
  isLoading?: boolean
}
```

### 타임라인 구조

```
●─────── 2025-11-16 10:00:00
│        API Server (GET /api/health)
│        상태: DOWN → UP으로 복구됨 ✓
│        지속 시간: 5분 23초
│        실패 횟수: 3회
│        에러: Connection refused
│
●─────── 2025-11-15 14:30:00
│        Payment Gateway
│        상태: DEGRADED
│        지속 시간: 2분 5초
│        실패 횟수: 1회
│        에러: Timeout exceeded

●─────── 2025-11-15 08:00:00
         User Service
         상태: DOWN → UP으로 복구됨 ✓
         지속 시간: 15분 30초
```

### 타임라인 스타일

- 세로 라인: 왼쪽 경계선
- 원형 아이콘:
  - 🔴 빨간색: DOWN 상태
  - 🟢 초록색: 복구됨
- 오른쪽: 상세 정보

### 기능

- 최근 10개 항목만 표시
- 클릭 가능 (추후: 상세 페이지 이동)
- 지속 시간 자동 계산

---

## 6단계: 필터 및 기간 선택

### DateRangePicker 컴포넌트 설계

```typescript
type DateRange = '24h' | '7d' | '30d' | 'custom'

interface DateRangePickerProps {
  selectedRange: DateRange
  onRangeChange: (range: DateRange) => void
}
```

### 기간 선택 옵션

```
┌────────────────────────────────┐
│ [24시간] [7일] [30일] [사용자] │
└────────────────────────────────┘
```

**각 옵션**:
- 24시간: 지난 24시간 데이터
- 7일: 지난 7일 데이터
- 30일: 지난 30일 데이터
- 사용자 정의: 시작일 + 종료일 선택

### 기능

- 클릭 시 차트 데이터 업데이트
- URL 쿼리 파라미터로 상태 저장 (추후)
- 버튼 상태 표시 (선택된 것 강조)

---

## 7단계: 데이터 새로고침 및 실시간 업데이트

### 자동 새로고침 설정

```typescript
// Dashboard.tsx의 useEffect
useEffect(() => {
  // 5초마다 요약 통계 갱신
  const interval1 = setInterval(() => {
    fetchOverview()
    fetchStatusDistribution()
    setLastUpdate(new Date())
  }, 5000)

  return () => clearInterval(interval1)
}, [fetchOverview, fetchStatusDistribution])

useEffect(() => {
  // 30초마다 차트 데이터 갱신
  const interval2 = setInterval(() => {
    fetchUptimeTimeseries('day')
    fetchResponseTimeTimeseries('day')
  }, 30000)

  return () => clearInterval(interval2)
}, [fetchUptimeTimeseries, fetchResponseTimeTimeseries])
```

### 새로고침 간격

| 항목 | 간격 | 이유 |
|------|------|------|
| 요약 통계 (4개 카드) | 5초 | 실시간 상태 변화 감지 |
| 차트 데이터 | 30초 | 과도한 API 호출 방지 |
| 인시던트 타임라인 | 1분 | 최근 인시던트 표시 |

### 로딩 상태 표시

- 스켈레톤 로더 또는 스피너
- 마지막 업데이트 시간 표시
- 데이터 로드 중 기존 데이터 유지

---

## 8단계: 모바일 반응형 디자인

### 반응형 그리드 설정

```typescript
// Tailwind CSS 클래스 사용
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 카드들 */}
</div>
```

**Breakpoint별 레이아웃**:
- **sm** (640px): 1열
- **md** (768px): 2열
- **lg** (1024px): 4열 또는 2x2

### 모바일 최적화

| 항목 | 최적화 |
|------|--------|
| 카드 크기 | 화면 너비에 맞춤 |
| 차트 높이 | 모바일: 250px, 데스크톱: 300px |
| 차트 마진 | 작은 화면에서 감소 |
| 텍스트 크기 | 모바일에서 축소 |
| 터치 영역 | 최소 44px × 44px |

### 테스트 환경

- Chrome DevTools 모바일 에뮬레이션
- 실제 모바일 기기 테스트
- 가로/세로 모드 전환 테스트

---

## 데이터 플로우

### 초기 로드 흐름

```
Dashboard 마운트
  ↓
useEffect (1회 실행)
  ├─ fetchEndpoints()
  ├─ fetchRecentIncidents()
  ├─ fetchIncidents()
  ├─ fetchOverview()
  ├─ fetchStatusDistribution()
  ├─ fetchUptimeTimeseries('day')
  └─ fetchResponseTimeTimeseries('day')
  ↓
Zustand 스토어 상태 업데이트
  ↓
컴포넌트 리렌더링
  ↓
대시보드 화면 표시
```

### 기간 변경 흐름

```
사용자 기간 선택 (예: 7일)
  ↓
dateRange 상태 변경
  ↓
useEffect (dateRange 의존성)
  ├─ period 계산 (24h → day, 7d → week, 30d → month)
  ├─ fetchUptimeTimeseries(period)
  └─ fetchResponseTimeTimeseries(period)
  ↓
차트 데이터 업데이트
  ↓
새 기간의 데이터로 차트 표시
```

---

## 구현 체크리스트

### Phase 1: 대시보드 페이지 기본 구조
- [x] Dashboard 페이지 생성
- [x] 대시보드 레이아웃 설계
- [x] 반응형 그리드 설정

### Phase 2: 상태 카드 컴포넌트
- [x] StatusCard 컴포넌트 구현
- [x] 4개 주요 지표 카드 렌더링
- [x] 카드 스타일링 (색상, 트렌드)
- [x] Zustand 스토어와 통합

### Phase 3: 응답 시간 차트
- [x] Recharts 의존성 설치
- [x] ResponseTimeChart 컴포넌트 구현
- [x] LineChart 설정 (평균, 최소, 최대 라인)
- [x] 차트 기능 (범례, 툴팁, 격자선)
- [x] 데이터 소스 통합

### Phase 4: 가동률 차트
- [x] UptimeChart 컴포넌트 구현
- [x] BarChart 설정
- [x] 색상 코딩 (가동률별)
- [x] 데이터 정렬 및 포맷팅
- [x] 반응형 X축 설정

### Phase 5: 인시던트 타임라인
- [x] IncidentTimeline 컴포넌트 구현
- [x] 타임라인 구조 (세로 라인, 아이콘)
- [x] 지속 시간 계산
- [x] 최근 10개 항목 표시

### Phase 6: 필터 및 기간 선택
- [x] DateRangePicker 컴포넌트 구현
- [x] 기간 선택 옵션 (24h, 7d, 30d, custom)
- [x] 기간 변경 시 차트 업데이트

### Phase 7: 데이터 새로고침
- [x] 자동 새로고침 설정 (5초, 30초)
- [x] useEffect 데이터 로드
- [x] 로딩 상태 표시
- [x] 마지막 업데이트 시간 표시

### Phase 8: 반응형 디자인
- [x] Tailwind CSS 반응형 클래스 사용
- [x] 모바일 최적화
- [x] 차트 높이/마진 조정
- [x] 텍스트 크기 반응형 설정
- [x] 터치 친화적 버튼

---

## 기술 스택

| 분류 | 기술 | 용도 |
|------|------|------|
| 차트 라이브러리 | Recharts | LineChart, BarChart |
| 상태 관리 | Zustand | 전역 상태 (endpoints, incidents, statistics) |
| 스타일링 | Tailwind CSS | 반응형 디자인, 유틸리티 기반 스타일 |
| 시간 처리 | JavaScript Date API | 타임스탐프, 시간 포맷 |
| HTTP 통신 | Axios | API 요청 |

---

## 색상 스키마

| 상태 | 색상 | HEX | 사용처 |
|------|------|-----|-------|
| UP | 초록색 | #22c55e | 상태 표시, 가동률 우수 |
| DOWN | 빨간색 | #ef4444 | 상태 표시, 가동률 저하 |
| DEGRADED | 노란색 | #eab308 | 상태 표시 |
| UNKNOWN | 회색 | #9ca3af | 상태 표시 |
| 차트_평균 | 파란색 | #3b82f6 | 응답 시간 평균 |
| 차트_최소 | 초록색 | #10b981 | 응답 시간 최소 |
| 차트_최대 | 빨간색 | #ef4444 | 응답 시간 최대 |

---

## 주요 구현 포인트

### 1. Zustand 다중 스토어 통합
- EndpointStore: 엔드포인트 목록
- IncidentStore: 인시던트 데이터
- StatisticsStore: 통계 및 차트 데이터

### 2. 효율적 데이터 관리
- 5초/30초 간격의 차등 새로고침
- useEffect 의존성 최소화
- 불필요한 리렌더링 방지

### 3. 반응형 설계
- Tailwind CSS의 Responsive Design
- 모바일 우선 접근
- Touch-friendly UI

### 4. 차트 최적화
- ResponsiveContainer로 자동 크기 조정
- 데이터 변환 최소화
- 불필요한 리렌더링 방지

---

## 주의사항

1. **데이터 갱신 타이밍**: 과도한 API 호출 방지
2. **메모리 누수**: 모든 interval 정리
3. **타입 안정성**: 모든 API 응답에 타입 정의
4. **에러 처리**: API 실패 시 기존 데이터 유지

---

**문서 작성**: 2025-11-16
**상태**: 설계 완료
