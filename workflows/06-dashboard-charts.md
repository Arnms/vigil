# Step 6: 대시보드 & 차트

**목표**: 실시간 모니터링 대시보드 UI 구현
**기간**: Day 10-11
**상태**: ✅ 완료

---

## 📋 워크플로우

### 1. 대시보드 페이지 기본 구조

**목표**: 전체 시스템 상태를 한눈에 볼 수 있는 대시보드 구성
**상태**: ✅ 완료

- [x] Dashboard 페이지 생성 ✅
  - `src/pages/Dashboard.tsx` ✅

- [x] 대시보드 레이아웃 설계 ✅
  ```
  ┌─────────────────────────────────────────────┐
  │ 요약 통계 (4개 카드)                        │
  ├─────────────────────────────────────────────┤
  │ 차트 영역 (2개)                             │
  ├─────────────────────────────────────────────┤
  │ 최근 활동 (테이블)                          │
  └─────────────────────────────────────────────┘
  ```

- [x] 반응형 그리드 설정 ✅
  - 데스크톱: 4열 또는 2x2 레이아웃 ✅
  - 태블릿: 2열 ✅
  - 모바일: 1열 ✅

---

### 2. 상태 카드 컴포넌트

**목표**: 주요 지표를 표시하는 카드 컴포넌트 구현
**상태**: ✅ 완료

- [x] StatusCard 컴포넌트 ✅
  - `src/components/Dashboard/StatusCard.tsx` ✅
  - 타이틀, 값, 단위, 트렌드 아이콘 표시 ✅

- [x] 4개 주요 지표 카드 ✅
  - 🟢 정상 서버 (UP 상태)
  - 🔴 장애 서버 (DOWN 상태)
  - 📊 평균 가동률
  - 🚨 활성 인시던트

- [x] 카드 스타일 ✅
  - 배경색: 흰색 ✅
  - 테두리: 연한 회색 ✅
  - 카드 그림자 효과 ✅
  - 텍스트 크기 및 가중치 강조 ✅

- [x] 데이터 업데이트 ✅
  - Zustand store에서 데이터 가져오기 ✅
  - 주기적 갱신 (5초마다) ✅

---

### 3. 응답 시간 차트 (Recharts)

**목표**: 시계열 응답 시간 데이터 시각화
**상태**: ✅ 완료

- [x] Recharts 의존성 설치 ✅
  ```bash
  npm install recharts
  ```

- [x] ResponseTimeChart 컴포넌트
  - `src/components/Dashboard/ResponseTimeChart.tsx`
  - LineChart 또는 AreaChart 사용

- [x] 차트 데이터
  - X축: 시간
  - Y축: 응답 시간 (ms)
  - 여러 엔드포인트 다중 라인
  - 색상 구분

- [x] 차트 기능
  - 범례 (Legend)
  - 툴팁 (Tooltip)
  - 격자선 (Grid)
  - X축 레이블 회전 (모바일 고려)

- [x] 데이터 소스
  - 24시간 데이터 기본
  - 기간 선택 옵션 (24h, 7d, 30d)

---

### 4. 가동률 차트

**목표**: 엔드포인트별 가동률 시각화
**상태**: ✅ 완료

- [x] UptimeChart 컴포넌트 ✅
  - `src/components/Dashboard/UptimeChart.tsx`
  - BarChart 또는 RadarChart 사용

- [x] 차트 유형 선택
  - 옵션 1: 막대 그래프 (BarChart)
    - 각 엔드포인트별 가동률
    - 정렬: 가동률 높은 순서대로

  - 옵션 2: 레이더 차트 (RadarChart)
    - 여러 지표 한눈에 보기
    - 안정성, 가동률, 성능 등

- [x] 차트 기능
  - 라벨 표시
  - 퍼센티지 포맷
  - 컬러 구분 (높음: 녹색, 중간: 노랑, 낮음: 빨강)

---

### 5. 인시던트 타임라인

**목표**: 최근 인시던트를 타임라인 형태로 표시
**상태**: ✅ 완료

- [x] IncidentTimeline 컴포넌트 ✅
  - `src/components/Dashboard/IncidentTimeline.tsx`

- [x] 타임라인 구조
  ```
  ●─────── 2025-10-16 10:00:00
  │        API Server DOWN (5분)
  │
  ●─────── 2025-10-15 14:30:00
  │        Payment Gateway DEGRADED (2분)
  │
  ●─────── 2025-10-15 08:00:00
           User Service DOWN (15분)
  ```

- [x] 타임라인 항목
  - 타임스탐프
  - 엔드포인트명
  - 상태 (UP으로 복구됨 표시)
  - 지속 시간
  - 에러 메시지

- [x] 스타일
  - 세로 라인 (왼쪽)
  - 원형 아이콘 (상태별 색상)
  - 오른쪽에 상세 정보

- [x] 기능
  - 최근 10개 항목만 표시
  - 클릭하면 상세 페이지로 이동

---

### 6. 필터 및 기간 선택

**목표**: 사용자가 원하는 기간의 데이터 조회
**상태**: ✅ 완료

- [x] DateRangePicker 컴포넌트 ✅
  - `src/components/Common/DateRangePicker.tsx`

- [x] 기간 선택 옵션
  - 24시간
  - 7일
  - 30일
  - 커스텀 (시작일, 종료일)

- [x] 기능
  - 클릭 시 차트 데이터 업데이트
  - URL 쿼리 파라미터로 상태 저장

- [x] 엔드포인트 필터
  - 모든 엔드포인트
  - 특정 엔드포인트 선택

---

### 7. 데이터 새로고침 및 실시간 업데이트

**목표**: 대시보드 데이터를 주기적으로 업데이트
**상태**: ✅ 완료

- [x] 자동 새로고침 설정 ✅
  - 5초마다 요약 통계 갱신
  - 30초마다 차트 데이터 갱신
  - 1분마다 인시던트 타임라인 갱신

- [x] useEffect로 데이터 로드
  ```typescript
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  ```

- [x] 로딩 상태 표시
  - 스켈레톤 로딩 또는 스피너
  - 마지막 업데이트 시간 표시

---

### 8. 모바일 반응형 디자인

**목표**: 모바일 기기에서도 사용 가능한 대시보드
**상태**: ✅ 완료

- [x] 반응형 그리드 ✅
  - TailwindCSS 반응형 클래스 사용
  - Breakpoint: sm, md, lg, xl

- [x] 모바일 최적화
  - 카드 크기 조정
  - 차트 높이 조정
  - 텍스트 크기 조정
  - 터치 친화적 버튼

- [x] 테스트
  - Chrome DevTools 모바일 에뮬레이션
  - 실제 모바일 기기 테스트

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [x] 대시보드 페이지가 정상 표시되는가?
  - 모든 컴포넌트 렌더링
  - 데이터 로드 완료

- [x] 상태 카드가 정확한 데이터를 표시하는가?
  - 엔드포인트 상태 수 확인
  - 가동률 계산 정확성

- [x] 응답 시간 차트가 정상 작동하는가?
  - 라인 렌더링
  - 데이터 포인트 표시
  - 범례 및 툴팁 작동

- [x] 가동률 차트가 정상 작동하는가?
  - 막대 또는 레이더 차트 표시
  - 색상 구분 정확성

- [x] 인시던트 타임라인이 정상 표시되는가?
  - 항목 순서 (최신순)
  - 타임스탐프 정확성
  - 지속 시간 계산 정확성

- [x] 기간 필터가 정상 작동하는가?
  - 기간 선택 시 차트 업데이트
  - 데이터 재로드 확인

- [x] 자동 새로고침이 정상 작동하는가?
  - 주기적 데이터 업데이트
  - 브라우저 콘솔에 에러 없음

- [x] 반응형 디자인이 정상 작동하는가?
  - 데스크톱: 4열 카드
  - 태블릿: 2열 카드
  - 모바일: 1열 카드

---

## 📝 차트 커스터마이징 예시

```typescript
// ResponseTimeChart.tsx 예시
<LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="timestamp" />
  <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="responseTime" stroke="#8884d8" />
</LineChart>
```

---

## 🎨 색상 스키마

| 상태 | 색상 | HEX |
|------|------|-----|
| UP | 초록색 | #22c55e |
| DOWN | 빨간색 | #ef4444 |
| DEGRADED | 노란색 | #eab308 |
| UNKNOWN | 회색 | #9ca3af |

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#3-실시간-모니터링) - 대시보드 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#3-통계-api) - 통계 API

## 📚 참고 자료

- [Recharts 공식 문서](https://recharts.org/)
- [TailwindCSS 반응형 디자인](https://tailwindcss.com/docs/responsive-design)

## ➡️ 다음 단계

→ [07-websocket-realtime.md](./07-websocket-realtime.md)

**다음 단계 내용**:
- Socket.io 클라이언트 연결
- 실시간 상태 업데이트
- 알림 토스트
- 전역 상태 관리 업데이트
