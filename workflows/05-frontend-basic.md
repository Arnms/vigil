# Step 5: 기본 UI 구현

**목표**: 프론트엔드 기본 구조 및 엔드포인트 관리 UI
**기간**: Day 8-9
**상태**: 🔄 진행중 (Phase 1-5 완료, Phase 6 진행 중)

---

## 📋 워크플로우

### 1. Vite + React + TypeScript 프로젝트 셋업

**목표**: 프론트엔드 개발 환경 구성
**상태**: ✅ 완료

- [x] Vite 프로젝트 생성
  ```bash
  npm create vite@latest frontend -- --template react-ts
  ```

- [x] 필수 의존성 설치
  - React Router (라우팅) ✅
  - Zustand (상태 관리) ✅
  - axios (HTTP 클라이언트) ✅
  - TailwindCSS v3 (스타일링) ✅

- [x] 디렉토리 구조 생성
  ```
  frontend/src/
  ├── components/
  ├── hooks/
  ├── services/
  ├── stores/
  ├── types/
  ├── pages/
  ├── App.tsx
  └── main.tsx
  ```

- [x] TailwindCSS 설정 (v3)
  ```bash
  npm install -D tailwindcss@3 postcss@8 autoprefixer@10
  ```

- [x] TypeScript 설정 검증
  - tsconfig.json 확인 ✅
  - 적절한 엄격성 설정 ✅

- [x] 빌드 오류 해결
  - @rollup/rollup-win32-x64-msvc 누락 해결 ✅
  - Tailwind CSS v3 호환성 확보 ✅

---

### 2. 레이아웃 및 라우팅 구현

**목표**: 애플리케이션의 기본 레이아웃 및 페이지 네비게이션
**상태**: ✅ 완료

- [x] React Router 설정
  - `src/App.tsx` 라우터 설정 ✅
  - 주요 경로 정의: ✅
    - `/` - 대시보드 ✅
    - `/endpoints` - 엔드포인트 목록 ✅
    - `/endpoints/new` - 엔드포인트 생성 ✅
    - `/endpoints/:id` - 엔드포인트 상세 ✅
    - `/incidents` - 인시던트 목록 ✅
    - `/statistics` - 통계 ✅

- [x] 기본 레이아웃 컴포넌트
  - `src/components/Layout/Header.tsx` - 헤더 (로고, 타이틀) ✅
  - `src/components/Layout/Sidebar.tsx` - 사이드바 (네비게이션) ✅
  - `src/components/Layout/MainLayout.tsx` - 메인 레이아웃 ✅

- [x] 네비게이션
  - 메뉴 항목들 ✅
  - 활성 메뉴 표시 ✅
  - Tailwind CSS로 반응형 네비게이션 ✅

- [x] 페이지 컴포넌트 생성
  - Dashboard.tsx ✅
  - EndpointList.tsx ✅
  - EndpointForm.tsx (폼 검증 포함) ✅
  - EndpointDetail.tsx ✅
  - Incidents.tsx ✅
  - Statistics.tsx ✅
  - NotFound.tsx ✅

- [x] 타입 정의
  - types/endpoint.ts ✅
  - types/incident.ts ✅
  - types/statistics.ts ✅

---

### 3. API 서비스 레이어 구현

**목표**: 백엔드 API와의 통신을 관리
**상태**: ✅ 완료

- [x] axios 설정 ✅
  - `src/services/api.ts` - 기본 설정 ✅
  - Base URL 설정 ✅
  - 인터셉터 설정 (에러 처리, 요청/응답 로깅) ✅

- [x] API 서비스 모듈 생성 ✅
  - `src/services/endpoint.service.ts` ✅
    - createEndpoint() ✅
    - getEndpoints() ✅
    - getEndpoint(id) ✅
    - updateEndpoint() ✅
    - deleteEndpoint() ✅
    - checkEndpoint() (수동 체크) ✅
    - getCheckResults() ✅

  - `src/services/statistics.service.ts` ✅
    - getUptime() ✅
    - getAllUptime() ✅
    - getResponseTime() ✅
    - getAllResponseTime() ✅
    - getResponseTimeTimeseries() ✅
    - getUptimeTimeseries() ✅
    - getOverview() ✅
    - getStatusDistribution() ✅

  - `src/services/incident.service.ts` ✅
    - getIncidents() ✅
    - getIncident(id) ✅
    - getIncidentsByEndpoint() ✅
    - getRecentIncidents() ✅
    - getActiveIncidents() ✅
    - resolveIncident() ✅
    - getCheckResults() ✅
    - getEndpointCheckResults() ✅
    - getCheckResultsByDateRange() ✅
    - getFailedChecks() ✅
    - getIncidentStats() ✅

- [x] 타입 정의
  - `src/types/endpoint.ts` ✅
  - `src/types/incident.ts` ✅
  - `src/types/statistics.ts` ✅

---

### 4. 상태 관리 (Zustand)

**목표**: 전역 상태 관리 설정
**상태**: ✅ 완료

- [x] Zustand Store 생성 ✅
  - `src/stores/endpoint.store.ts` - 엔드포인트 상태 ✅
  - `src/stores/ui.store.ts` - UI 상태 (로딩, 에러, 알림) ✅
  - `src/stores/incident.store.ts` - 인시던트 상태 ✅
  - `src/stores/statistics.store.ts` - 통계 상태 ✅

- [x] 상태 정의 ✅
  - endpoints, selectedEndpoint ✅
  - isLoading, error, alerts ✅
  - incidents, activeIncidents, recentIncidents ✅
  - overview, uptimeStats, responseTimeStats ✅

- [x] 액션 정의 ✅
  - fetchEndpoints(), createEndpoint(), updateEndpoint(), deleteEndpoint() ✅
  - setSelectedEndpoint(), addAlert(), removeAlert() ✅
  - fetchIncidents(), resolveIncident() ✅
  - fetchUptime(), fetchResponseTime(), fetchStatusDistribution() ✅

---

### 5. 엔드포인트 목록 페이지

**목표**: 등록된 엔드포인트 목록 표시
**상태**: ✅ 완료

- [x] EndpointList 컴포넌트 ✅
  - `src/pages/Endpoints/EndpointList.tsx` ✅
  - Zustand 스토어 통합 ✅
  - 테이블 목록으로 표시 ✅
  - 엔드포인트명, URL, 상태, 생성일 표시 ✅

- [x] 기능 ✅
  - 목록 조회 (fetchEndpoints) ✅
  - 페이지네이션 UI ✅
  - 상태별 필터링 (UP/DOWN/DEGRADED/전체) ✅
  - 새 엔드포인트 추가 버튼 ✅
  - 수정 버튼 (엔드포인트 상세로 이동) ✅
  - 삭제 버튼 (확인 팝업 포함) ✅
  - 수동 체크 버튼 ✅

- [x] 상태 표시 ✅
  - StatusBadge 컴포넌트 생성 ✅
  - UP: 🟢 초록색 ✅
  - DOWN: 🔴 빨간색 ✅
  - DEGRADED: 🟡 노란색 ✅
  - UNKNOWN: ⚫ 회색 ✅

- [x] 추가 컴포넌트 ✅
  - `src/components/EndpointTable.tsx` ✅
  - `src/components/StatusBadge.tsx` ✅

---

### 6. 엔드포인트 등록 폼

**목표**: 새로운 엔드포인트 등록 폼 구현
**상태**: 🔄 진행 중

- [ ] EndpointForm 컴포넌트
  - `src/pages/Endpoints/EndpointForm.tsx`
  - 또는 모달 형태로 `src/components/Endpoints/EndpointModal.tsx`

- [ ] 폼 필드
  - 이름 (텍스트 입력)
  - URL (텍스트 입력, 유효성 검사)
  - HTTP 메소드 (드롭다운: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
  - 헤더 (JSON 에디터 또는 텍스트 영역)
  - 바디 (JSON 에디터 또는 텍스트 영역)
  - 체크 간격 (드롭다운 또는 입력)
  - 예상 응답 코드 (숫자 입력)
  - 타임아웃 임계값 (숫자 입력)

- [ ] 폼 검증
  - 필수 필드 확인
  - URL 형식 검증
  - 숫자 범위 검증

- [ ] 제출
  - API 호출
  - 성공/실패 처리
  - 토스트 알림

---

### 7. 엔드포인트 상세 페이지

**목표**: 선택한 엔드포인트의 상세 정보 표시

- [ ] EndpointDetail 컴포넌트
  - `src/pages/Endpoints/EndpointDetail.tsx`

- [ ] 표시 정보
  - 기본 정보 (이름, URL, 메소드 등)
  - 현재 상태 및 마지막 응답 시간
  - 24시간 가동률
  - 최근 체크 결과 목록
  - 최근 인시던트 목록

- [ ] 액션
  - 수정 버튼 → 폼 표시
  - 삭제 버튼 → 확인 후 삭제
  - 즉시 체크 버튼 → 수동 헬스 체크 실행

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [x] 프론트엔드 프로젝트가 정상적으로 실행되는가? ✅
  ```bash
  npm run dev
  # http://localhost:5173에서 접근 확인 ✅
  ```

- [x] 라우팅이 정상 작동하는가? ✅
  - 모든 경로에 접근 가능 ✅

- [ ] API 서비스가 백엔드와 통신하는가?
  - 네트워크 탭에서 요청 확인
  - CORS 설정 확인 (필요시 백엔드에서 설정)

- [ ] 엔드포인트 목록이 정상 표시되는가?
  - 데이터 로드
  - 상태 아이콘 표시
  - 필터링/정렬 작동

- [ ] 엔드포인트 등록 폼이 정상 작동하는가?
  - 폼 검증
  - 제출 시 API 호출
  - 성공 피드백

- [ ] 스타일이 일관성 있게 적용되는가?
  - TailwindCSS 적용
  - 반응형 디자인 확인

- [ ] 타입스크립트 타입 검증이 정상 작동하는가?
  - 컴파일 에러 없음
  - 타입 안정성 확인

---

## 📝 폼 검증 예시

```typescript
const validateEndpoint = (data: EndpointFormData) => {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) {
    errors.name = '이름은 필수입니다';
  }

  try {
    new URL(data.url);
  } catch {
    errors.url = '유효한 URL이 아닙니다';
  }

  if (data.checkInterval < 30) {
    errors.checkInterval = '최소 30초 이상이어야 합니다';
  }

  return errors;
};
```

---

## 🎨 컴포넌트 구조

```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   ├── Endpoints/
│   │   ├── EndpointModal.tsx
│   │   └── StatusBadge.tsx
│   └── Common/
│       ├── Loading.tsx
│       ├── ErrorMessage.tsx
│       └── Toast.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Endpoints/
│   │   ├── EndpointList.tsx
│   │   ├── EndpointDetail.tsx
│   │   └── EndpointForm.tsx
│   └── NotFound.tsx
├── services/
│   ├── api.ts
│   ├── endpoint.service.ts
│   ├── statistics.service.ts
│   └── incident.service.ts
├── stores/
│   ├── endpoint.store.ts
│   └── ui.store.ts
└── types/
    ├── endpoint.ts
    ├── incident.ts
    └── statistics.ts
```

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md) - 기능 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md) - API 명세

## 📚 참고 자료

- [React Router](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## ➡️ 다음 단계

→ [06-dashboard-charts.md](./06-dashboard-charts.md)

**다음 단계 내용**:
- 상태 카드 컴포넌트
- 응답 시간 차트 (Recharts)
- 가동률 표시
- 인시던트 타임라인
