# Vigil 프로젝트 워크플로우

이 폴더는 Vigil 프로젝트의 개발 진행 상황을 추적하는 워크플로우 문서를 관리합니다.

## 폴더 구조

```
workflows/
├── README.md                        # 이 파일
├── 00-overview.md                   # 전체 워크플로우 개요
├── 01-project-setup.md              # Step 1: 프로젝트 셋업
├── 02-endpoint-healthcheck.md       # Step 2: 엔드포인트 & 헬스 체크
├── 03-notification-system.md        # Step 3: 알림 시스템
├── 04-statistics-api.md             # Step 4: 통계 API & 최적화
├── 05-frontend-basic.md             # Step 5: 기본 UI 구현
├── 06-dashboard-charts.md           # Step 6: 대시보드 & 차트
├── 07-websocket-realtime.md         # Step 7: WebSocket 실시간 기능
└── 08-testing-deployment.md         # Step 8: 테스트 & 배포
```

## 사용 방법

### 1. 전체 진행 상황 확인
[00-overview.md](./00-overview.md)에서 현재 프로젝트 진행 상황을 한눈에 확인할 수 있습니다.

### 2. 특정 단계 상세 조회
각 단계별 파일(01-08)에서 구체적인 작업 내용과 체크리스트를 확인합니다.

### 3. 작업 진행
- 완료된 작업: `[x]` 로 마크
- 진행 중인 작업: `[ ]` 또는 상단 상태 업데이트
- 새로운 작업: 필요시 추가

### 4. 커밋 시점
각 워크플로우 파일의 "완료 체크리스트"의 모든 항목이 ✅ 완료되면 커밋합니다.

## 워크플로우 상태

| 상태 | 설명 |
|------|------|
| ✅ 완료 | 모든 체크리스트가 완료됨 |
| 🔄 진행중 | 작업이 진행 중 |
| ⏳ 대기 | 이전 단계 완료 대기 중 |
| ⚠️ 블로킹 | 문제 발생으로 진행 불가 |

## 참고 문서

- [PROJECT_MANAGEMENT.md](../docs/PROJECT_MANAGEMENT.md) - 전체 프로젝트 계획
- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md) - 기능 명세서
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md) - API 명세서
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) - 데이터베이스 스키마
