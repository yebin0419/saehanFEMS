# 새한프라텍 FEMS (공장에너지관리시스템) PRD

> **Product Requirements Document**
> 작성일: 2026-10-28
> 버전: v1.0 (초안)
> 상태: Draft — 기존 단일 HTML 프로토타입(`index.html`)의 서버 기반 풀스택 전환

---

## 1. 프로젝트 개요 (Overview)

### 1.1 프로젝트명
**새한프라텍 FEMS (Factory Energy Management System)** — 공장에너지관리시스템

### 1.2 목적
센서·계측장비 데이터 연동을 통해 공장의 에너지 사용 현황을 **실시간으로 모니터링·제어**하고, 이를 기반으로 다음 비즈니스 가치를 달성한다.

- **에너지 최적화**: 설비별 가동률·전류 패턴을 분석하여 불필요한 소비 제거
- **제조원가 절감**: 비가동(Down/Stop) 시간 감소 및 생산 효율 향상
- **탄소 배출 저감**: 전력 소비 감축을 통한 CO₂ 배출량 축소
- **성과 지표 관리**: KPI(가동률, 에너지 효율, 비가동 사유 분류) 기반의 지속적 개선 체계 구축

### 1.3 배포 환경
- **플랫폼**: Vercel (Next.js App Router 기반 풀스택 서버리스 아키텍처)
- **CI/CD**: GitHub → Vercel 자동 배포 파이프라인
- **런타임**: Edge Runtime (대시보드), Node.js Runtime (알림·배치 작업)

### 1.4 기존 프로토타입 전환 배경
현재 `index.html` 단일 파일에 구현된 **"saehanFEMS · 공장 설비 비가동 분석 대시보드"** 프로토타입은 다음 특징을 가진다.

- **구조**: HTML/CSS/JS가 한 파일에 포함된 SPA, Chart.js 및 SheetJS(xlsx)를 CDN으로 로드
- **데이터 입력**: 사용자가 EMS 전류 JSON 파일 및 MOLD 생산 실적 Excel/CSV를 **수동 업로드**
- **분석 범위**: 07:00~익일 07:00 1분 단위 전류값을 Run/Down/Stop 상태로 분류 (임계값 기반)
- **출력**: KPI 카드, 상태 분포 도넛 차트, 설비별 가동률 테이블, 시간대 히트맵, 파레토 차트, 교대별 차트, 엑셀 보고서 다운로드
- **한계**: 브라우저 내부에서만 분석되므로 **(1)** 다수 사용자/부서 간 데이터 공유 불가, **(2)** 실시간 센서 연동 불가, **(3)** 임계치 초과 자동 알림 불가, **(4)** 이력 누적·추세 분석 불가

본 PRD는 위 한계를 해소하기 위해 프로토타입을 **서버 기반 풀스택 서비스**로 재구축한다.

---

## 2. 시스템 구현 4단계 매핑 (Architecture Workflow)

FEMS는 다음 4단계로 구성된다. 각 단계는 Next.js 애플리케이션의 레이어로 매핑된다.

### 2.1 1단계 — 계측 (Measurement)
센서 및 계측장비로부터 전류·전력 데이터를 수집하는 계층.

| 항목 | 내용 |
|---|---|
| 데이터 소스 | 사내 EMS 시스템, IoT 센서(사출기 등 생산 설비 1분 단위 전류계), MOLD 생산 실적 (부서별 Excel/CSV) |
| 수집 경로 | ① IoT 게이트웨이 → HTTPS POST → Next.js API Route (`/api/ingest/current`) <br> ② 기존 EMS 북마크릿 스크립트 → JSON 업로드 (`/api/ingest/upload`) <br> ③ MOLD Excel 업로드 (`/api/ingest/mold`) |
| 저장소 | Supabase(또는 Vercel Postgres) `measurements` 테이블 (equipmentId, timestamp, ampere, factory 등) |
| 데이터 모델 | 프로토타입의 `{ equipments: [{ id, name, samples: [{t, a}] }] }` 구조를 정규화된 DB 스키마로 변환 |

### 2.2 2단계 — 모니터링 (Monitoring)
실시간 가동률 및 에너지 소비 현황을 시각화하는 대시보드 계층.

| 항목 | 내용 |
|---|---|
| 뷰 | 종합 가동률 KPI, 설비별 상태(Run/Down/Stop) 실시간 디스플레이, 시간대 히트맵 |
| 갱신 주기 | Supabase Realtime 구독 또는 SWR 폴링(5~30초) |
| 기존 매핑 | 프로토타입의 **"개요" 탭**, **"시간대 분석" 탭** |

### 2.3 3단계 — 분석 (Analysis)
수집된 데이터로부터 비가동 원인 및 에너지 사용 패턴을 도출하는 분석 엔진.

| 항목 | 내용 |
|---|---|
| 분석 로직 | 전류 임계값 기반 상태 분류, 설비별 파레토 분석, 교대(주·야간)별 비교, 전일/전주 대비 추세 |
| 비가동 분류 | 사유 태깅 (고장 / 금형교체 / 자재대기 / 계획정지 / 품질불량) 및 에너지 손실 추정 |
| 기존 매핑 | 프로토타입의 **"원인 분석" 탭**, **파레토 차트**, 자동 임계값(`autoThresholds()` — 75-percentile × 0.7) |
| 확장 | 서버 사이드에서 다일자(주간·월간) 추세 집계 (프로토타입에서 "다일자 분석 집계는 추가 데이터 수집 시 구현됩니다" 로 미구현 상태) |

### 2.4 4단계 — 제어 (Control & Alerting)
임계치 초과·이상 감지 시 알림을 전달하고 대응을 유도하는 제어 계층.

| 항목 | 내용 |
|---|---|
| 트리거 | Vercel Cron(1분 주기) + Supabase Trigger로 임계치 위반 감지 |
| 알림 채널 | 이메일 (Resend), 선택적으로 Slack Webhook |
| 로그 | `alert_events` 테이블에 발생 시각, 설비, 조건, 수신자, 상태 저장 |
| 제어 피드백 | (v1 범위) 알림만 전송, (v2 범위) 외부 제어 API 호출 Hook 제공 |

---

## 3. 핵심 기능 명세 (Feature Specifications)

### 3.1 ① 비가동 원인 이유 분류 (Downtime Cause Tagging)

기존 프로토타입의 `index.html`은 전류값 기반으로 **Run/Down/Stop** 3단계 상태만 분류한다. 본 기능은 Down/Stop 구간에 **사유 태그**를 부여하여 비가동 원인을 가시화한다.

- **사유 분류 체계**
  | 코드 | 사유 | 설명 |
  |---|---|---|
  | `BREAKDOWN` | 고장 | 설비 결함으로 인한 비계획 정지 |
  | `MOLD_CHANGE` | 금형교체 | 사출기 금형 교체 작업 중 정지 |
  | `MATERIAL_WAIT` | 자재대기 | 원재료 공급 지연 |
  | `PLANNED_STOP` | 계획정지 | 사전 계획된 유지보수·식사·휴식 |
  | `QUALITY` | 품질 불량 | 품질 이슈로 인한 생산 중단 |

- **태깅 방식**
  - 자동: 비가동 구간 지속 시간·발생 시간대·반복 패턴 기반 추천
  - 수동: 운영자가 대시보드에서 Down/Stop 구간을 선택 후 사유 태그 지정
  - 저장: `downtime_events` 테이블 (equipmentId, startTime, endTime, durationMin, reason, taggedBy)

- **통계 뷰**
  - 설비별/시간대별 비가동 사유 **스택 바 차트**
  - 사유별 **에너지 손실 추정** (평균 전류 × 비가동 시간 × 요금 단가)
  - 기존 "원인 분석" 탭의 파레토 차트에 **사유 색상 레이어** 추가

### 3.2 ② 추세 뷰 (Trend View Dashboard)

프로토타입의 "주간 요약" 탭에서 **"분석 기간이 2일 이상일 때 상세 추세가 표시됩니다"** 로 미구현된 영역을 완성한다.

- **주간 뷰**
  - 설비별 **일별 가동률 꺾은선 그래프** (최근 7일)
  - 설비별 **일별 에너지 사용량**(kWh) 라인 차트
  - X축: 날짜 / Y축: 가동률(%) 또는 에너지(kWh) / 범례: 설비명

- **월간 뷰**
  - 주별 평균 가동률 (최근 4~5주)
  - 월간 누적 에너지 소비량 vs. 생산 수량 **듀얼 축 차트**

- **KPI 증감 표시**
  - 전일 대비 / 전주 대비 가동률 변화율
  - 상승(▲ 녹색) / 하강(▼ 빨강) 화살표 + % 수치
  - KPI 카드 레이아웃: 프로토타입의 `.kpi-grid` 스타일 재사용 후 `delta` 섹션 추가

- **데이터 집계**
  - Vercel Cron(일 1회 00:30) → 일별 집계 테이블(`daily_aggregates`) 생성
  - 대시보드에서는 집계 테이블 조회로 성능 확보 (원본 1분 단위 조회 금지)

### 3.3 ③ 알림 및 임계치 설정 (Alert & Threshold System)

프로토타입의 **"⚙ 상태 임계값" 모달** 기능을 서버 영속화 + 알림 발송 체계로 확장한다.

- **임계치 설정**
  - 설비별 Stop 임계값(A) / Run 임계값(A) 저장 (`equipment_thresholds` 테이블)
  - 기존 자동 계산 로직(`autoThresholds()`) 유지하되, 사용자 수동 조정 값 우선 적용
  - 임계값 변경 이력 로깅 (언제, 누가, 어떤 값으로)

- **알림 트리거 조건**
  - **조건 A — 완전 정지 지속**: Stop 상태가 N분 이상 (기본 30분, 설비별 설정 가능) 연속
  - **조건 B — 기준 가동률 미달**: 최근 1시간 가동률이 기준치(기본 60%) 미달
  - **조건 C — 이상 감지**: 전류값이 평소 대비 ±3σ 이탈 (옵션)

- **알림 발송**
  - 채널: **이메일**(Resend 권장) — 수신자 그룹 설정 가능
  - 발송 로직: Vercel Serverless Function (`/api/alerts/dispatch`) + Cron(1분 주기)
  - 중복 방지: 동일 조건·설비에 대해 쿨다운 설정 (기본 30분)
  - 이메일 템플릿: 설비명, 발생 시각, 조건, 현재 가동률, 대시보드 링크 포함

- **알림 로그 뷰**
  - 발송 이력 테이블 (`alert_events`): 발송 시각, 설비, 조건, 수신자, 상태(성공/실패), 응답 지연
  - 대시보드 "알림" 탭 신설

---

## 4. 기술 스택 및 배포 구조 (Tech Stack & Deployment)

### 4.1 프런트엔드 / 백엔드
| 레이어 | 기술 | 선정 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15** (App Router) | 서버 컴포넌트 + API Route로 풀스택 구현, Vercel 최적화 |
| UI 라이브러리 | **React 19** | 컴포넌트 기반 재구성 |
| 스타일 | **Tailwind CSS** | 프로토타입의 디자인 토큰(`--primary: #2563eb` 등)을 Tailwind 테마로 이관 |
| 차트 | **Chart.js** + `react-chartjs-2` | 프로토타입에서 사용 중인 라이브러리 유지하여 마이그레이션 비용 최소화 |
| 데이터 처리 | **SheetJS (xlsx)** | 기존 MOLD Excel 파싱 로직 재사용 |
| 폼/상태 | React Hook Form, SWR (서버 상태) | — |

### 4.2 데이터베이스 / BaaS
| 선택안 | 특징 |
|---|---|
| **Supabase (권장)** | PostgreSQL + Realtime 구독 + Auth 통합, 센서 데이터 실시간 스트리밍에 적합 |
| **Vercel Postgres + KV** | Vercel 생태계 통합 우수, Realtime은 폴링으로 대체 |

- **주요 테이블(초안)**
  - `equipments` — 설비 마스터 (id, name, factory, specs)
  - `measurements` — 1분 단위 전류 측정값 (equipmentId, timestamp, ampere) · 파티셔닝 권장
  - `equipment_thresholds` — 설비별 임계값
  - `downtime_events` — 비가동 구간 및 사유 태그
  - `daily_aggregates` — 일 단위 집계 (가동률, Run/Down/Stop 분, 생산량, 에너지 kWh)
  - `alert_events` — 알림 발송 이력
  - `mold_production` — MOLD 생산 실적

### 4.3 배포 및 인프라
- **배포**: Vercel (main 브랜치 → Production, PR → Preview)
- **환경 변수**: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`
- **크론**: Vercel Cron Jobs — ① 임계치 감시(1분), ② 일 집계(매일 00:30), ③ 알림 재시도(5분)
- **인증**: Supabase Auth (이메일/비밀번호 + 공장 관리자/운영자 역할 분리)

### 4.4 이메일 서비스
| 서비스 | 특징 | 추천도 |
|---|---|---|
| **Resend** | Next.js/Vercel 친화적, React Email 템플릿 지원 | ★★★ (1순위) |
| SendGrid | 대량 발송·분석 리포트 강점 | ★★ |
| Nodemailer + SMTP | 사내 메일 서버 활용 시 | ★ |

---

## 5. 마이그레이션 전략 (Migration from `index.html`)

현재 `index.html` 단일 파일 프로토타입(약 1,460 라인, HTML+CSS+JS 통합)을 Next.js 프로젝트로 단계적으로 전환한다.

### 5.1 UI 요소의 React 컴포넌트 재구성

| 기존 (`index.html`) | 전환 후 React 컴포넌트 | 위치 |
|---|---|---|
| `header.app-header` | `<AppHeader />` | `components/layout/AppHeader.tsx` |
| `#upload-view` (업로드 카드 + 드롭존 + 도움말) | `<UploadView />` (`<Dropzone />` × 2, `<HelpBox />`) | `components/upload/*` |
| `#dashboard > .toolbar` (필터 + 임계값 버튼) | `<DashboardToolbar />`, `<FilterGroup />` | `components/dashboard/Toolbar.tsx` |
| `.tabs` + `.tab-content` × 4 | `<TabsNav />` + 각 탭 라우트 (`/dashboard/overview`, `/dashboard/time`, `/dashboard/cause`, `/dashboard/week`) | `app/dashboard/*/page.tsx` |
| `#kpi-grid` | `<KpiGrid />`, `<KpiCard />` | `components/dashboard/Kpi*.tsx` |
| `#chart-status`, `#chart-hourly`, `#chart-pareto`, `#chart-shift`, `#chart-mold` | `<StatusDoughnut />`, `<HourlyStackedBar />`, `<ParetoChart />`, `<ShiftChart />`, `<MoldChart />` | `components/charts/*` |
| `table.heatmap` (설비 × 시간) | `<Heatmap />` | `components/dashboard/Heatmap.tsx` |
| `#eq-summary-table`, `#detail-table` | `<EquipmentSummaryTable />`, `<DetailTable />` | `components/tables/*` |
| `#threshold-modal` | `<ThresholdModal />` | `components/dashboard/ThresholdModal.tsx` |
| `.status-bar` (토스트) | `<Toaster />` (Sonner 등) | 전역 레이아웃 |

### 5.2 정적 데이터 → 서버 API/DB 추상화

| 기존 JS 로직 | 전환 후 API 엔드포인트 / 서버 모듈 |
|---|---|
| `loadEms(file)` — JSON 파일 로드 | `POST /api/ingest/upload` (JSON 저장 → DB 적재) |
| `loadMold(files)` — Excel/CSV 파싱 | `POST /api/ingest/mold` (서버에서 SheetJS로 파싱) |
| `autoThresholds(ems)` — 자동 임계값 계산 | `lib/analysis/thresholds.ts` (서버 유틸) |
| `classify(a, threshold)` — Run/Down/Stop 분류 | `lib/analysis/classify.ts` (서버·클라이언트 공용) |
| `analyze(ems, moldRows, thresholds)` — 전체 집계 | `lib/analysis/aggregate.ts` + `GET /api/analytics/summary?from=&to=&equipmentId=` |
| `applyFilters(result)` — 필터 재집계 | 쿼리 파라미터 기반 서버 집계로 이관 |
| `renderKpi/renderStatusChart/...` — DOM 렌더링 | React 컴포넌트 내부 상태로 전환 (`useQuery` + Chart.js) |
| `state.filters` — 메모리 상태 | URL 쿼리 파라미터 + Zustand(선택) |
| `#excel-btn` — Excel 보고서 | `GET /api/reports/excel?from=&to=` (서버 사이드 생성·반환) |

### 5.3 상수·설정값 이관

프로토타입의 아래 전역 상수를 `lib/config/constants.ts`로 이관:
- `COLORS = { run, down, stop }` → Tailwind 테마 토큰 + 공용 상수
- `SHIFT_DAY_START = 7`, `SHIFT_NIGHT_START = 19`, `WORK_DAY_START = 7` → 환경별 설정 가능하도록 ENV 또는 설정 테이블 분리
- `workDayLabel()`, `workDayMinuteOffset()`, `classifyShift()` → `lib/time/workday.ts`

### 5.4 단계적 전환 로드맵
| 단계 | 범위 | 산출물 |
|---|---|---|
| **Phase 0** | Next.js 프로젝트 셋업, Vercel 배포 파이프라인, Supabase 프로비저닝, 디자인 토큰 Tailwind 이관 | Hello FEMS |
| **Phase 1** | 업로드 뷰 + 개요 탭 재구현 (기존 index.html과 동등 기능) | 업로드 → 분석 → KPI/도넛/표 |
| **Phase 2** | 시간대/원인/주간 탭 재구현 + DB 영속화 | 다중 사용자 세션 지원 |
| **Phase 3** | 임계치 설정 UI + 알림 발송 (Resend 연동) + Cron 감시 | 실시간 알림 MVP |
| **Phase 4** | 비가동 사유 태깅, 추세 뷰(주간·월간), 에너지 손실 추정 | 분석 고도화 |
| **Phase 5** | IoT 게이트웨이 직접 수집 연동, Realtime 대시보드 | 완전 실시간 FEMS |

---

## 6. 비기능 요구사항 (Non-Functional Requirements)

| 분류 | 요구사항 |
|---|---|
| 성능 | 대시보드 TTFB < 1s (집계 테이블 활용), 1분 단위 측정값 월 100만 행 처리 |
| 가용성 | Vercel 가용성(99.9%) 수준, DB 백업 일 1회 |
| 보안 | 공장 관리자/운영자 역할 분리(RBAC), HTTPS 강제, 센서 데이터는 서명된 API 키로만 수신 |
| 접근성 | 반응형 레이아웃 (프로토타입의 `@media (max-width: 900px)` 기준선 유지) |
| 인쇄 | 대시보드 PDF/인쇄 지원 (프로토타입의 `@media print` 스타일 재사용) |
| 국제화 | 1차 한국어, 라벨은 i18n 키로 추출 가능하게 설계 |

---

## 7. 미결 과제 / 결정 필요 사항 (Open Questions)

- [ ] **DB 선택**: Supabase vs. Vercel Postgres — 실시간 구독 필요 수준에 따라 결정
- [ ] **IoT 게이트웨이 프로토콜**: MQTT, HTTPS POST, 또는 EMS 북마크릿 유지 중 선택
- [ ] **다공장 확장성**: 공장별 멀티테넌시 수준 (단일 DB + factory_id 필드 vs. 공장별 스키마)
- [ ] **에너지 요금 단가**: 손실 추정에 사용할 전력 단가 소스 (고정값 vs. 월별 입력 vs. KEPCO API)
- [ ] **알림 수신자 관리**: 설비별 담당자 매핑 테이블 설계
- [ ] **기존 북마크릿 스크립트**: `index.html`의 북마크릿 자리(`javascript:(function(){ /* TODO */ })();`)를 실제 사내 EMS 환경 맞춤으로 완성 필요

---

## 8. 참고 자료 (References)

- 기존 프로토타입: 프로젝트 루트 `index.html` (1,462 라인) — "saehanFEMS · 공장 설비 비가동 분석 대시보드"
- 사용 라이브러리:
  - Chart.js 4.4.1 (`chart.umd.min.js`)
  - SheetJS 0.18.5 (`xlsx.full.min.js`)
- 샘플 JSON 포맷 (프로토타입 내 명시):
  ```json
  {
    "meta": { "factory": "A공장", "from": "2026-10-27T07:00", "to": "2026-10-28T07:00" },
    "equipments": [
      {
        "id": "EQ-001",
        "name": "사출기 1호",
        "samples": [
          { "t": "2026-10-27T07:00", "a": 12.4 },
          { "t": "2026-10-27T07:01", "a": 0.0 }
        ]
      }
    ]
  }
  ```

---

*본 문서는 초안이며, 이해관계자 검토를 거쳐 Phase 1 착수 전 확정합니다.*
