# KWCAG2.2 접근성 검토 시뮬레이션 결과

## 개요

- **스킬 경로:** `skills/accessibility-review/SKILL.md`
- **기준:** KWCAG2.2 (한국지능정보사회진흥원, 2024.10) 33개 항목 + 시맨틱 HTML 7개 항목
- **시뮬레이션 대상:** 전형적인 웹 프로젝트의 변경된 HTML/TSX 파일 (예: `src/pages/Login.tsx`, `src/components/Header.tsx`)

---

## 워크플로우 시뮬레이션

### Step 1. 검토 범위 결정

```bash
git diff --name-only HEAD
```

변경된 웹 파일(*.html, *.htm, *.tsx, *.jsx, *.ts, *.js, *.vue, *.svelte, *.css, *.scss)을 필터링하여 검토 대상으로 설정한다. 변경된 웹 파일이 없으면 사용자에게 검토 대상을 질문한다.

### Step 2. 기준 로드

`references/kwcag22.md` 파일을 읽어 33개 항목의 자동탐지 수준(O/Triangle/X)을 파악한다.

### Step 3. 코드 리뷰 (파일별)

대상 파일을 Read 도구로 읽고, 33개 항목을 동시에 평가한다. 파일 재읽기를 최소화한다.

### Step 4. Playwright 자동 검증

Playwright 환경(config 파일, CLI, 브라우저, 개발 서버)을 순차 점검하고, 가능한 경우 항목 8(명도 대비), 10(키보드 접근성), 33(웹앱 접근성)을 자동 검증한다.

### Step 5. 결과 분류

O(합격), X(불합격), Triangle(권고), -(해당없음), 판정불가 5단계로 분류한다.

### Step 6. 리포트 생성

HTML + CSV 2가지 형식으로 리포트를 생성한다.

### Step 7. 결과 검증

33개 항목 + 시맨틱 HTML 7개 항목 모두 평가되었는지, X 항목에 파일명:라인 포함 여부, 판정불가 항목에 사유 명시 여부 등을 확인한다.

---

## KWCAG2.2 33개 항목 평가 접근법

### 원칙 1. 인식의 용이성 (Perceivable) - 9개 항목

| # | 항목명 | 자동탐지 | 평가 접근법 |
|---|--------|----------|------------|
| 1 | 적절한 대체 텍스트 제공 | Triangle | `<img>` 의 alt 속성 존재 여부를 코드에서 탐지(O 수준). alt 값의 품질(의미 적절성)은 Claude 맥락 판단(Triangle 수준). 장식 이미지의 alt="" 처리, input type="image" alt 누락, 배경 이미지로 의미 전달 등을 검사. |
| 2 | 자막 제공 | X | `<video>` 요소에 `<track>` 존재 여부를 탐지 가능하나, 실제 자막 품질/동기화는 런타임 확인 필요. 수동 검증 체크리스트로 제시. |
| 3 | 표의 구성 | Triangle | `<table>` 요소에 `<caption>`, `<th>` 존재 여부 탐지. 데이터 표 vs 레이아웃 표 구분은 Claude 맥락 판단. 복잡한 표의 headers/id 연결 확인. |
| 4 | 콘텐츠의 선형 구조 | Triangle | CSS position/float로 인한 DOM 순서와 시각 순서 불일치 패턴 탐지. submit 버튼 위치, 리스트 중첩 논리성 평가. |
| 5 | 명확한 지시 사항 제공 | Triangle | 텍스트 내 "빨간", "왼쪽" 등 색상/위치 단독 지시 패턴 탐지. 맥락에 따라 대체 수단 제공 여부 판단. |
| 6 | 색에 무관한 콘텐츠 인식 | X | 색상만으로 정보 구분하는 패턴은 시각적 디자인 확인 필요. `color: red` 단독 사용 패턴 부분 탐지 가능. 수동 검증 체크리스트로 제시. |
| 7 | 자동 재생 금지 | O | `<audio autoplay>`, `<video autoplay>` 속성, JS `.play()` 자동 호출 패턴을 코드에서 직접 탐지. |
| 8 | 텍스트 콘텐츠의 명도 대비 | Triangle | CSS color/background-color 명시 시 대비율 계산 가능. Playwright 환경 가용 시 런타임 computed style로 정확한 대비율 측정 (4.5:1 / 3:1 기준). |
| 9 | 콘텐츠 간의 구분 | X | 시각적 디자인 판단 필요. 수동 검증 체크리스트로 제시. |

### 원칙 2. 운용의 용이성 (Operable) - 15개 항목

| # | 항목명 | 자동탐지 | 평가 접근법 |
|---|--------|----------|------------|
| 10 | 키보드 사용 보장 | Triangle | `<div onClick>`, `<span onClick>` 등 비대화형 요소의 마우스 전용 이벤트 탐지. role/tabIndex/onKeyDown 병행 여부 확인. Playwright 가용 시 Tab 키 이동으로 실제 키보드 접근성 검증. |
| 11 | 초점 이동과 표시 | Triangle | CSS `outline: none/0` 사용 시 대체 포커스 스타일 존재 여부 탐지. `tabIndex={-1}` 남용, `onfocus="this.blur()"` 패턴 검사. 모달 포커스 트랩 구현 여부 확인. |
| 12 | 조작 가능 | Triangle | CSS width/height 명시된 버튼/링크/입력 요소의 최소 크기(17x17px) 확인. padding으로 터치 영역 확장 여부 평가. |
| 13 | 문자 단축키 | Triangle | `addEventListener('keydown')` 에서 수정키 없이 단일 문자 키 처리 패턴 탐지. 비활성화/재설정/초점 조건 제공 여부 평가. |
| 14 | 응답시간 조절 | Triangle | `setTimeout`, `setInterval` 사용 패턴 탐지 (세션 타임아웃, 자동 로그아웃 등). 만료 경고 및 연장 기능 제공 여부 확인. |
| 15 | 정지 기능 제공 | X | `setInterval` 자동 슬라이드, CSS animation infinite 패턴 탐지 가능. 정지 버튼 존재 여부는 맥락 판단. 수동 검증 체크리스트로 제시. |
| 16 | 깜박임과 번쩍임 사용 제한 | X | CSS animation duration으로 3-50Hz 범위 추정 가능(부정확). 수동 검증 체크리스트로 제시. |
| 17 | 반복 영역 건너뛰기 | Triangle | `href="#main"`, `href="#content"` 앵커 링크, `.skip-nav` 클래스 패턴 탐지. 스킵 내비게이션 링크가 최상단에 있는지, :focus 시 표시되는지 확인. |
| 18 | 제목 제공 | Triangle | `<title>` 태그 존재/내용, `<iframe>` title 속성, `<h1>`~`<h6>` 계층 구조 분석. 제목 내용 적절성은 Claude 맥락 판단. |
| 19 | 적절한 링크 텍스트 | Triangle | `<a>` 텍스트가 "더보기", "클릭", "여기" 단독인 경우, URL 텍스트 그대로 사용, 빈 링크 텍스트 등 패턴 탐지. 맥락상 이해 가능 여부 판단. |
| 20 | 고정된 참조 위치 정보 | X | 전자출판문서 형식 여부 판단 필요. 대부분의 일반 웹 프로젝트에서는 해당 없음(-)으로 처리. |
| 21 | 단일 포인터 입력 지원 | Triangle | `ontouchstart`/`onpointermove` 전용 이벤트, 핀치/스와이프 라이브러리 사용 여부 탐지. 클릭 대안 제공 여부 확인. |
| 22 | 포인터 입력 취소 | Triangle | `onMouseDown`/`onPointerDown` 즉시 실행 로직 패턴 탐지. onClick(mouseup 기반) 사용 여부 확인. |
| 23 | 레이블과 네임 | Triangle | 아이콘 버튼에 aria-label 없는 경우, 입력 필드 레이블 텍스트와 aria-label 불일치 패턴 탐지. |
| 24 | 동작 기반 작동 | Triangle | `DeviceMotionEvent`, `DeviceOrientationEvent` 사용 여부 탐지. 대체 UI 컨트롤 제공 여부 확인. |

### 원칙 3. 이해의 용이성 (Understandable) - 7개 항목

| # | 항목명 | 자동탐지 | 평가 접근법 |
|---|--------|----------|------------|
| 25 | 기본 언어 표시 | O | `<html>` 에 `lang` 속성 존재 여부, ISO 639-1 규격 준수 여부를 코드에서 직접 탐지. |
| 26 | 사용자 요구에 따른 실행 | Triangle | `window.open()` 자동 실행, `<select onChange="location.href=...">` 패턴, `autofocus` 속성 사용 탐지. 사용자 의도 없는 새 창/초점 변화 평가. |
| 27 | 찾기 쉬운 도움 정보 | X | 전체 페이지 흐름에서 도움 정보 링크 위치 일관성 판단 필요. 수동 검증 체크리스트로 제시. 도움 정보가 없으면 해당 없음(-). |
| 28 | 오류 정정 | Triangle | `<input>` required 속성 + 오류 메시지 처리 코드, `aria-invalid`, `aria-describedby` 사용 여부 탐지. 오류 발생 시 포커스 이동 구현 여부 확인. |
| 29 | 레이블 제공 | O | `<input>` 에 연결된 `<label>` (for-id), `aria-label`, `aria-labelledby`, `title` 존재 여부를 코드에서 직접 탐지. placeholder 단독 사용 검사. |
| 30 | 접근 가능한 인증 | Triangle | CAPTCHA 관련 코드 패턴(recaptcha, hcaptcha, turnstile) 탐지. 대체 인증 수단 제공 여부 확인. |
| 31 | 반복 입력 정보 | Triangle | 다단계 폼 동일 필드 반복 여부, `autocomplete` 속성 사용 여부 탐지. |

### 원칙 4. 견고성 (Robust) - 2개 항목

| # | 항목명 | 자동탐지 | 평가 접근법 |
|---|--------|----------|------------|
| 32 | 마크업 오류 방지 | O | 중복 id 속성, 잘못된 태그 중첩(`<p>` 내 블록 요소), JSX key prop 누락 등을 코드에서 직접 탐지. |
| 33 | 웹 애플리케이션 접근성 준수 | Triangle | 커스텀 UI 컴포넌트의 WAI-ARIA role/속성/상태 제공 여부 탐지. role 사용 시 필수 aria 속성 동반 여부 확인. Playwright 가용 시 인터랙션 후 ARIA 상태 변화 검증. |

---

## 자동탐지 수준 분포

| 자동탐지 수준 | 항목 수 | 항목 번호 |
|--------------|---------|-----------|
| O (직접 탐지) | 4개 | 7, 25, 29, 32 |
| Triangle (맥락 판단) | 21개 | 1, 3, 4, 5, 8, 10, 11, 12, 13, 14, 17, 18, 19, 21, 22, 23, 24, 26, 28, 30, 31, 33 |
| X (수동 검증) | 8개 | 2, 6, 9, 15, 16, 20, 27 |

> 참고: 항목 33은 KWCAG2.2 기준표에서 Triangle이나, Playwright 가용 시 자동 검증으로 승격 가능.

---

## 리포트 형식

### HTML 리포트 (report.html)

- 결과 색상: O(초록 #28a745), X(빨강 #dc3545), Triangle(노랑 #ffc107), -(회색 #6c757d), 판정불가(파랑 #6c8ebf)
- 구조: 요약 테이블 -> 원칙별 상세 결과 -> 시맨틱 HTML 검토 -> 수정 가이드
- 언어: 한국어 / 스타일: 인라인 CSS만 사용
- 판정방식 열: 정적분석 / Playwright / 판정불가

### CSV 리포트 (report.csv)

- 헤더: `번호,항목명,원칙,결과,판정방식,발견된 문제,수정 가이드`
- 33개 KWCAG 항목 + 7개 시맨틱 HTML 항목 포함
- 총 40개 행 (헤더 제외)

---

## 시맨틱 HTML 검토 항목 (7개)

| # | 검토 항목 | 탐지 수준 | 평가 접근법 |
|---|----------|----------|------------|
| 시맨틱-1 | 랜드마크 요소 (header/main/footer/nav) | 맥락 판단 | 전체 div만 사용하고 시맨틱 랜드마크 요소 미사용 여부 확인 |
| 시맨틱-2 | 섹션 구조 (article/section/aside) | 맥락 판단 | 독립 콘텐츠 블록이 div만 사용하는지, article/section 대체 가능한지 평가 |
| 시맨틱-3 | 대화형 요소 (button/a vs div/span) | 직접 탐지 | 클릭 가능 div/span을 button/a로 대체 가능한지 패턴 탐지 |
| 시맨틱-4 | 목록 구조 (ul/ol/li) | 맥락 판단 | 반복 항목이 연속 div로 구현되었는지, ul/ol + li로 개선 가능한지 평가 |
| 시맨틱-5 | 표현용 태그 (b/i vs strong/em) | 직접 탐지 | `<b>`, `<i>` 단독 사용 여부 탐지. 의미 있는 경우 strong/em 또는 CSS 대체 권고 |
| 시맨틱-6 | 폼 그룹 (fieldset/legend) | 맥락 판단 | div로 감싼 폼 그룹에 fieldset + legend 적용 가능 여부 판단 |
| 시맨틱-7 | 기타 시맨틱 요소 (time/blockquote 등) | 맥락 판단 | 날짜/시간 표시에 `<time>`, 인용문에 `<blockquote>`/`<q>` 사용 여부 확인 |

---

## Playwright 자동 검증 절차

Playwright 환경 감지는 4단계 순차 점검:

1. **playwright.config.ts 존재 확인** - 없으면 항목 8, 10, 33을 "판정불가 -- playwright.config.ts 없음"으로 처리
2. **Playwright CLI 설치 확인** - `npx playwright --version` 실패 시 "판정불가 -- Playwright 미설치"
3. **브라우저 바이너리 확인** - 미설치 시 "판정불가 -- 브라우저 미설치"
4. **개발 서버 실행 확인** - baseURL에 curl 요청, 응답 없으면 "판정불가 -- 개발 서버 미실행"

모든 점검 통과 시:
- **항목 8 (명도 대비):** Playwright로 페이지 렌더링 후 computed style에서 color/background-color 추출, 대비율 계산
- **항목 10 (키보드 접근성):** Tab 키 10회 반복으로 포커스 이동 검증
- **항목 33 (웹앱 접근성):** 인터랙티브 요소 클릭 전후 ARIA 상태 변화 검증

정적 분석과 Playwright 결과가 다를 경우 Playwright 결과가 우선한다.

---

## 결과 분류 체계

| 결과 | 의미 |
|------|------|
| O | 합격: 위반 사항 없음 |
| X | 불합격: 위반 발견 (파일명:라인 포함) |
| Triangle | 권고: 위반은 아니나 개선 권장 |
| - | 해당없음: 관련 요소 없음 |
| 판정불가 | 런타임 검증 불가 -- 4가지 사유 중 1가지 명시 |

---

## 검증 체크리스트

1. KWCAG2.2 33개 항목 전부 평가 -- 누락 없음
2. 시맨틱 HTML 7개 항목 전부 평가
3. X 결과: KWCAG 항목 번호, 파일명+라인, 구체적 위반 설명 포함
4. Triangle 결과: 구체적 개선 권고 포함
5. 판정불가: 4가지 사유 중 1가지 명시
6. report.html + report.csv 2개 파일 저장 확인

---

## 시뮬레이션 도구 호출 흐름 (전형적인 웹 프로젝트 기준)

| 단계 | 도구 | 호출 수 | 설명 |
|------|------|---------|------|
| Step 1 | Bash (git diff) | 1 | 변경 파일 목록 조회 |
| Step 2 | Read | 1 | references/kwcag22.md 읽기 |
| Step 2 | Read | 1 | references/output-format.md 읽기 |
| Step 3 | Read | 2~5 | 대상 파일 읽기 (파일 수에 따라 변동) |
| Step 4-1 | Bash | 3 | Playwright 환경 점검 (config, CLI, 서버) |
| Step 4-2 | Bash/Grep | 1 | baseURL 추출 |
| Step 4-3~5 | Playwright | 5~15 | 명도 대비, 키보드, 웹앱 접근성 검증 |
| Step 6 | Bash | 1 | 리포트 디렉토리 생성 |
| Step 6 | Write | 2 | report.html + report.csv 저장 |
| Step 7 | Read | 2 | 생성된 리포트 검증 읽기 |
| **합계** | | **19~31** | Playwright 미사용 시 약 12~15회, 사용 시 약 19~31회 |
