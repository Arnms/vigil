# Vigil 프로젝트 워크플로우 개요

## 📊 전체 진행 상황

| 단계 | 이름 | 상태 | 기간 | 진행률 |
|------|------|------|------|--------|
| Step 1 | 프로젝트 셋업 | ✅ 완료 | Day 1-2 | 100% |
| Step 2 | 엔드포인트 & 헬스 체크 | ✅ 완료 | Day 3-4 | 100% |
| Step 3 | 알림 시스템 | 🔄 진행중 | Day 5-6 | - |
| Step 4 | 통계 API & 최적화 | ⏳ 대기 | Day 7 | - |
| Step 5 | 기본 UI 구현 | ⏳ 대기 | Day 8-9 | - |
| Step 6 | 대시보드 & 차트 | ⏳ 대기 | Day 10-11 | - |
| Step 7 | WebSocket 실시간 기능 | ⏳ 대기 | Day 12 | - |
| Step 8 | 테스트 & 배포 | ⏳ 대기 | Day 13-14 | - |

## 🎯 현재 작업

**단계**: Step 3 - 알림 시스템
**시작일**: 2025-10-20
**예상 완료**: 2025-10-21
**담당 문서**: [03-notification-system.md](./03-notification-system.md)

## 📋 상세 워크플로우

### ✅ Step 1: 프로젝트 셋업 (완료)
**목표**: NestJS 프로젝트 생성 및 기본 인프라 구축

주요 완료 사항:
- NestJS 프로젝트 초기화
- 기본 디렉토리 구조 생성
- TypeORM Entity 정의 (4개)
- Docker Compose 기본 설정

→ [01-project-setup.md](./01-project-setup.md)

---

### ✅ Step 2: 엔드포인트 & 헬스 체크 (완료)

**목표**: 엔드포인트 CRUD API 및 Bull Queue 기반 헬스 체크 시스템 구현

완료된 작업:

- ✅ Endpoint CRUD API 구현 (6개 엔드포인트)
- ✅ Bull Queue 설정 및 Processor 구현
- ✅ 헬스 체크 로직 작성 (HTTP + 에러 처리)
- ✅ 체크 결과 저장 및 상태 업데이트
- ✅ 테스트 완료 (19/19 테스트 통과)
- ✅ 빌드 성공 (0 에러)

→ [02-endpoint-healthcheck.md](./02-endpoint-healthcheck.md)

---

### ⏳ Step 3: 알림 시스템
**목표**: 다양한 채널을 통한 알림 전송 시스템 구현

예상 작업:
- Notification 모듈 구현
- 이메일 전송 (Nodemailer)
- Slack 웹훅 통합
- 중복 알림 방지 로직 (Redis)

→ [03-notification-system.md](./03-notification-system.md)

---

### ⏳ Step 4: 통계 API & 최적화
**목표**: 통계 데이터 조회 API 및 쿼리 최적화

예상 작업:
- Statistics 모듈 구현
- 가동률, 응답 시간 통계 API
- 인시던트 히스토리 API
- 쿼리 최적화 및 인덱스 추가

→ [04-statistics-api.md](./04-statistics-api.md)

---

### ⏳ Step 5: 기본 UI 구현
**목표**: 프론트엔드 기본 구조 및 엔드포인트 관리 UI

예상 작업:
- Vite + React + TS 프로젝트 셋업
- 레이아웃 및 라우팅
- 엔드포인트 목록 및 등록 폼
- API 서비스 연결

→ [05-frontend-basic.md](./05-frontend-basic.md)

---

### ⏳ Step 6: 대시보드 & 차트
**목표**: 실시간 모니터링 대시보드 UI 구현

예상 작업:
- 상태 카드 컴포넌트
- 응답 시간 차트 (Recharts)
- 가동률 표시
- 인시던트 타임라인

→ [06-dashboard-charts.md](./06-dashboard-charts.md)

---

### ⏳ Step 7: WebSocket 실시간 기능
**목표**: WebSocket을 통한 실시간 상태 업데이트

예상 작업:
- Socket.io 클라이언트 연결
- 실시간 상태 업데이트
- 알림 토스트
- 전역 상태 관리 (Zustand)

→ [07-websocket-realtime.md](./07-websocket-realtime.md)

---

### ⏳ Step 8: 테스트 & 배포
**목표**: 통합 테스트 및 배포 준비

예상 작업:
- 엔드 투 엔드 테스트
- 버그 수정 및 에러 핸들링
- 성능 최적화
- Docker 이미지 빌드
- README 작성

→ [08-testing-deployment.md](./08-testing-deployment.md)

---

## 📈 주요 마일스톤

| 마일스톤 | 목표 | 예상 완료 |
|---------|------|----------|
| M1: 백엔드 핵심 기능 | Step 1-4 완료 | Day 7 |
| M2: 프론트엔드 기본 | Step 5-6 완료 | Day 11 |
| M3: 실시간 기능 | Step 7 완료 | Day 12 |
| M4: 배포 준비 완료 | Step 8 완료 | Day 14 |

## 🔗 참고 자료

- [프로젝트 계획서](../docs/PROJECT_MANAGEMENT.md)
- [기능 명세서](../docs/FEATURE_SPECIFICATIONS.md)
- [API 명세서](../docs/API_SPECIFICATIONS.md)
- [데이터베이스 스키마](../docs/DATABASE_SCHEMA.md)

## 💡 주의사항

- 각 단계는 순차적으로 진행됩니다
- 이전 단계가 완료되지 않으면 다음 단계를 시작할 수 없습니다
- 문제 발생 시 즉시 해당 워크플로우 파일을 업데이트합니다
- 커밋은 각 단계의 "완료 체크리스트"가 모두 완료되었을 때 수행합니다
