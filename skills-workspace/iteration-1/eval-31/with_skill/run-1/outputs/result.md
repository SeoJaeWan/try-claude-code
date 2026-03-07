## Core Web Vitals 검토 결과 — 2026-03-07

검토 대상 변경 파일:
- `.claude/settings.local.json` (JSON 설정 파일)
- `skills/accessibility-review/SKILL.md` (마크다운 문서)
- `skills/web-quality-audit/SKILL.md` (마크다운 문서)

### 검토 범위 판정

`git diff --name-only HEAD` 결과, 변경된 파일은 `.json` 및 `.md` 파일뿐입니다.
웹 소스 파일(`*.html`, `*.htm`, `*.tsx`, `*.jsx`, `*.ts`, `*.js`, `*.vue`, `*.svelte`, `*.css`, `*.scss`)이 변경 목록에 포함되지 않았습니다.

따라서 CWV-01 ~ CWV-11 모든 항목은 해당 검토 대상이 존재하지 않아 **N/A(해당 없음)** 으로 판정합니다.

---

### 참조 가이드 로드

`references/guide.md` 를 사전에 읽고 아래 판정 기준을 확인했습니다:
- LCP (Largest Contentful Paint): 목표 2.5초 이하
- INP (Interaction to Next Paint): 목표 200ms 이하
- CLS (Cumulative Layout Shift): 목표 0.1 이하

---

### 정적 분석 결과

| 코드 | 지표 | 항목 | 결과 | 발견된 문제 |
|------|------|------|------|------------|
| CWV-01 | LCP | LCP 요소 초기 HTML 존재 | — | 변경된 웹 소스 파일 없음. hero/LCP 이미지 관련 코드 변경 없음. |
| CWV-02 | LCP | fetchpriority="high" | — | 변경된 웹 소스 파일 없음. 이미지 태그 변경 없음. |
| CWV-03 | LCP | 폰트 렌더 차단 없음 | — | 변경된 웹 소스 파일 없음. @font-face 관련 코드 변경 없음. |
| CWV-04 | INP | 이벤트 핸들러 즉각 피드백 | — | 변경된 웹 소스 파일 없음. 이벤트 핸들러 코드 변경 없음. |
| CWV-05 | INP | 무거운 연산 지연 처리 | — | 변경된 웹 소스 파일 없음. 동기 연산 관련 코드 변경 없음. |
| CWV-06 | INP | React memo 활용 | — | 변경된 웹 소스 파일 없음. React 컴포넌트 변경 없음. |
| CWV-07 | CLS | img width/height | — | 변경된 웹 소스 파일 없음. img 태그 변경 없음. |
| CWV-08 | CLS | 뷰포트 위 동적 삽입 금지 | — | 변경된 웹 소스 파일 없음. DOM 삽입 관련 코드 변경 없음. |
| CWV-09 | CLS | 애니메이션 transform/opacity | — | 변경된 웹 소스 파일 없음. CSS 애니메이션/트랜지션 변경 없음. |
| CWV-10 | CLS | 폰트 교체 시프트 방지 | — | 변경된 웹 소스 파일 없음. font-display 관련 코드 변경 없음. |
| CWV-11 | CLS | 동적 콘텐츠 공간 예약 | — | 변경된 웹 소스 파일 없음. iframe/video/광고 슬롯 변경 없음. |

---

### 검증 결과

1. CWV-01 ~ CWV-11 전체 11개 항목 모두 평가 완료 -- 누락 없음.
2. 모든 항목이 — (N/A) 판정: 변경된 파일 중 웹 소스 파일이 없어 Core Web Vitals 영향 분석 대상이 존재하지 않음.
3. 해당 없음 사유: 변경 사항이 `.claude/settings.local.json` (IDE 설정), `skills/accessibility-review/SKILL.md` (스킬 문서), `skills/web-quality-audit/SKILL.md` (스킬 문서)로 한정되어 있어 웹 렌더링, 인터랙션, 레이아웃에 영향을 주는 코드가 없습니다.

### 수정 가이드

해당 없음 -- 모든 항목이 N/A로 판정되어 수정이 필요한 사항이 없습니다.
