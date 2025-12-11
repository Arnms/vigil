# API 불일치 분석 보고서

## 문제 요약

프론트엔드와 백엔드 API 라우트 불일치로 인해 Dashboard에서 404 에러 발생

## 근본 원인

### Step 4 (Backend) - 2025-10-22 완료
**구현된 API**:
- `GET /api/endpoints/:id/uptime` - **개별** 엔드포인트 가동률
- `GET /api/endpoints/:id/response-time` - **개별** 엔드포인트 응답시간
- `GET /api/statistics/overview` - 전체 요약 통계

**특징**: 개별 엔드포인트별 상세 통계에 집중

### Step 6 (Frontend) - 2025-11-16 완료
**구현된 API 호출**:
```typescript
// Dashboard.tsx에서 호출
fetchStatusDistribution()           // → /api/statistics/status-distribution
fetchUptimeTimeseries('day')        // → /api/statistics/uptime/day/timeseries
fetchResponseTimeTimeseries('day')  // → /api/statistics/response-time/day/timeseries
```

**특징**: **집계(aggregate)** 통계를 기대

## 불일치 상세

| 프론트엔드 호출 | 백엔드 라우트 | 상태 |
|----------------|--------------|------|
| `GET /api/statistics/status-distribution` | **존재하지 않음** | ❌ 404 |
| `GET /api/statistics/uptime/day/timeseries` | **존재하지 않음** | ❌ 404 |
| `GET /api/statistics/response-time/day/timeseries` | **존재하지 않음** | ❌ 404 |
| `GET /api/statistics/overview` | `GET /api/statistics/overview` | ✅ 200 |
| `GET /api/incidents/recent` | `GET /api/incidents/recent` | ✅ 200 |
| `GET /api/incidents` | `GET /api/incidents` | ✅ 200 |

## 왜 이런 일이 발생했나?

1. **워크플로우 문서 불명확**
   - Step 4 (04-statistics-api.md)에는 개별 엔드포인트 통계만 명시
   - 집계 통계 API는 문서화되지 않음

2. **Step 6 구현 시 추측**
   - 프론트엔드 개발자가 필요한 집계 API를 가정하고 구현
   - 백엔드 API가 존재할 것으로 기대

3. **완료 체크리스트 누락**
   - Step 6 완료 보고서에는 "✅ 완료"로 표시
   - 실제 백엔드 API 존재 여부는 확인하지 않음

## 영향

**현재 작동하지 않는 기능**:
- 상태 분포 카드 (UP/DOWN/DEGRADED 개수)
- 응답시간 시계열 차트 (24시간 추이)
- 가동률 시계열 차트 (24시간 추이)

**작동하는 기능**:
- 전체 통계 개요 (`/api/statistics/overview`)
- 인시던트 목록 및 상세
- 개별 엔드포인트 통계 (엔드포인트 상세 페이지에서)

## 해결 방안

### 옵션 1: 백엔드 API 추가 (권장)
**작업량**: 중간
**장점**: 완전한 기능 구현, 집계 통계 제공
**단점**: 백엔드 수정 및 재배포 필요

**구현할 엔드포인트**:
```typescript
GET /api/statistics/status-distribution
// Response: { up: 8, down: 1, degraded: 1, unknown: 0 }

GET /api/statistics/uptime/:period/timeseries?hours=24
// Response: [{ timestamp, uptime, totalChecks, failedChecks }]

GET /api/statistics/response-time/:period/timeseries?hours=24
// Response: [{ timestamp, avgResponseTime, minResponseTime, maxResponseTime }]
```

### 옵션 2: 프론트엔드 수정 (임시)
**작업량**: 적음
**장점**: 빠른 수정
**단점**: 기능 제한, 차트 데이터 부족

**변경사항**:
- `fetchStatusDistribution()` 호출 제거
- `fetchUptimeTimeseries()` 호출 제거
- `fetchResponseTimeTimeseries()` 호출 제거
- `overview` 데이터만으로 Dashboard 렌더링

### 옵션 3: 하이브리드 접근
**작업량**: 중간
**장점**: 점진적 개선 가능

**단계**:
1. 프론트엔드 수정으로 404 에러 즉시 제거
2. 백엔드 API 순차적 추가
3. 프론트엔드 기능 순차적 활성화

## 권장 조치

**즉시 (Phase 1)**:
1. 프론트엔드 수정하여 404 에러 제거
2. 기본 Dashboard 기능 정상화

**단기 (Phase 2)**:
1. 백엔드에 집계 통계 API 3개 추가
2. 프론트엔드 차트 기능 활성화

**장기**:
- API 명세서 업데이트
- 프론트엔드-백엔드 API 계약 명확화
- 통합 테스트 추가

## 참고 문서

- `workflows/04-statistics-api.md` - 백엔드 API 명세
- `workflows/06-dashboard-charts.md` - 프론트엔드 구현 계획
- `workflows/report/STEP6_COMPLETION_REPORT.md` - 실제 구현 내역
