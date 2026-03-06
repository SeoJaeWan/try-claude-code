# KWCAG2.2 Web Accessibility Criteria Reference

**Source:** 한국지능정보사회진흥원, 2024.10
**Items:** 33개
**Structure:** 인식의 용이성 9항목 / 운용의 용이성 15항목 / 이해의 용이성 7항목 / 견고성 2항목
**Pass Criteria:** 33개 항목 95% 이상 준수

> **Auto-Detection Legend**
> - `O` : 코드 패턴으로 직접 탐지 가능
> - `△` : Claude 맥락 판단으로 부분 탐지 가능 (정확도 ~70~90%)
> - `X` : 실제 동작/시각 확인 필요 — 검토 시 체크리스트로 제시

---

## 원칙 1. 인식의 용이성 (Perceivable)

---

### Item 1. 적절한 대체 텍스트 제공

- **Compliance Criteria:** 텍스트 아닌 콘텐츠는 대체 가능한 텍스트와 함께 제공되어야 한다.
- **Error Types:**
  - 1-1: `<img>`, `<input type="image">` 에 alt 속성이 없거나 alt 값이 없는 경우 (img 내 텍스트 포함 시)
  - 1-2: 불릿(Bullet) 등 장식 이미지에 alt 텍스트가 있는 경우 (alt="" 이어야 함)
  - 1-3: 이미지 내 텍스트 정보가 있는데 대체 텍스트를 제공하지 않은 경우
  - 1-4: img 요소에 title 속성만 사용한 경우
  - 1-5: 의미 있는 이미지에 alt=""(빈 값)를 사용한 경우
  - 1-6: QR코드에 링크(URL) 대신 의미 있는 대체 텍스트를 제공하지 않은 경우
  - 1-7: 복잡한 이미지(도표, 그래프)에 간단한 대체 텍스트만 있고 상세 설명이 없는 경우
  - 1-8: 배경 이미지로 의미 있는 콘텐츠를 표현하는 경우
- **Details:**
  - `longdesc` 속성 사용 시, 해당 longdesc URL의 img 요소에도 alt 속성 제공 필요
  - HTML5에서 img에 longdesc 사용 및 area에 longdesc 사용 시 alt 텍스트 병행 제공
  - 장식 이미지(불릿 등)는 alt="" 으로 처리
  - QR, CCTV, 보안문자(CAPTCHA) 등 기술적 한계 이미지는 동일 기능의 대체 수단 제공
  - IR(Image Replacement) 기법 사용 시 숨겨진 텍스트가 의미를 전달해야 함
- **Auto-Detection:** △
- **Detection Pattern:**
  - `<img>` 에 `alt` 속성 없음: `img:not([alt])`
  - 의미 있는 이미지에 `alt=""`: 코드에서 `alt=""` 인 img 주변 맥락 확인
  - `<input type="image">` 에 `alt` 없음
- **Fix Guide:**
  - 의미 있는 이미지: `<img src="chart.png" alt="2024년 1분기 매출 그래프">` (내용 설명)
  - 장식 이미지: `<img src="bullet.png" alt="">` (빈 alt)
  - 복잡한 이미지: alt에 요약 + 별도 텍스트 설명 또는 `aria-describedby` 제공

---

### Item 2. 자막 제공

- **Compliance Criteria:** 영상이나 음성 콘텐츠에는 동등한 내용의 자막, 원고 또는 수화가 제공되어야 한다.
- **Error Types:**
  - 2-1: 영상/음성 콘텐츠에 자막·원고·수화 중 어느 것도 없는 경우
  - 2-2: 자막이 있으나 내용과 싱크가 맞지 않거나 불완전한 경우
  - 2-3: 영상에 문자 정보가 있는데 별도 음성 콘텐츠나 설명이 없는 경우
- **Details:**
  - 영상/음성 내 모든 음성 정보는 자막, 원고, 수화 중 하나 이상 제공
  - 자막·원고·수화는 재생 중인 콘텐츠와 동기화
  - 실시간 콘텐츠는 실시간 자막 또는 수화로 대체 가능
  - 음성·문자 없이 제공되는 영상에는 화면해설 제공 권고
- **Auto-Detection:** X
- **Detection Pattern:** `<video>` 요소 존재 여부 탐지 가능, `<track>` 요소 부재 여부 탐지 가능
- **Fix Guide:**
  - `<video>` 요소에 `<track kind="captions" src="captions.vtt" srclang="ko">` 추가
  - 또는 영상 아래에 전체 스크립트(원고) 텍스트 제공

---

### Item 3. 표의 구성

- **Compliance Criteria:** 표는 이해하기 쉽게 구성해야 한다.
- **Error Types:**
  - 3-1: 데이터 표에 `<th>` 요소를 사용하지 않은 경우
  - 3-2: 복잡한 표에 `headers`, `id` 속성을 사용하지 않은 경우
  - 3-3: 표에 제목(`<caption>`)이 없는 경우
  - 3-4: 열/행 머리글을 `<th>` 대신 `<td>`로 표현하고 CSS로만 구분한 경우
  - 3-5: 레이아웃 표에 `<th>`, `<caption>`, `summary` 를 잘못 사용한 경우
  - 3-6: 복잡한 표에 `<th>`, `<caption>` 없이 summary만 사용한 경우
- **Details:**
  - HTML5에서 summary 속성은 비표준, `<caption>` 또는 `aria-describedby`로 대체
  - `<caption>` 없이 summary만 있는 경우 오류로 판단
  - 레이아웃 목적(비교, 나열 등) 표에는 `<caption>`·`<th>` 불필요
  - `<caption>` 을 `display:none`으로 숨기는 것은 오류
- **Auto-Detection:** △
- **Detection Pattern:**
  - `<table>` 요소에 `<caption>` 없음
  - `<table>` 에 `<th>` 없음 (레이아웃 테이블 여부 맥락 판단 필요)
- **Fix Guide:**
  - 데이터 표: `<caption>` 추가, 헤더 셀은 `<th scope="col/row">` 사용
  - 복잡한 표: `<th id="h1">`, `<td headers="h1">` 로 셀-헤더 연결

---

### Item 4. 콘텐츠의 선형 구조

- **Compliance Criteria:** 콘텐츠는 논리적인 순서로 제공되어야 한다.
- **Error Types:**
  - 4-1: CSS 위치 조정으로 시각적 순서와 DOM 순서가 불일치하는 경우
  - 4-2: 리스트 구조(ul, ol, dl)를 순서 없이 중첩한 경우
- **Details:**
  - CSS(`position`, `float` 등)로 시각 순서를 바꿔도 DOM 읽기 순서는 논리적이어야 함
  - 제출(submit) 버튼이 폼 필드보다 DOM 상 앞에 위치한 경우 오류
  - 리스트 중첩(ul > li > ul > li 등)이 논리적이지 않으면 오류
- **Auto-Detection:** △
- **Detection Pattern:** CSS `position: absolute/fixed` 사용 여부 탐지, DOM 내 `<button type="submit">` 위치 확인
- **Fix Guide:**
  - 시각적 순서와 DOM 순서를 일치시키거나, `order` CSS 대신 HTML 순서 자체를 조정

---

### Item 5. 명확한 지시 사항 제공

- **Compliance Criteria:** 지시 사항은 모양, 크기, 위치, 방향, 색, 소리 등에 관계없이 인식될 수 있어야 한다.
- **Error Types:**
  - 5-1: 색상이나 모양만으로 지시하는 경우 (예: "빨간 버튼을 누르세요")
  - 5-2: 위치만으로 지시하는 경우 (예: "오른쪽 메뉴를 클릭하세요")
- **Details:**
  - 색상, 위치, 모양, 크기, 소리 중 하나에만 의존하는 지시는 오류
  - 해당 요소의 실제 명칭이나 대체 텍스트를 사용해 지시해야 함
- **Auto-Detection:** △
- **Detection Pattern:** 텍스트 콘텐츠에서 "빨간", "파란", "왼쪽", "오른쪽", "위", "아래" 단독 사용 패턴
- **Fix Guide:**
  - "빨간 버튼을 누르세요" → "저장 버튼을 누르세요" (명칭 사용)
  - 색·위치 정보를 쓸 경우 텍스트 레이블 병행 제공

---

### Item 6. 색에 무관한 콘텐츠 인식

- **Compliance Criteria:** 화면에 표시되는 모든 정보는 색에 관계없이 인식될 수 있어야 한다.
- **Error Types:**
  - 6-1: 색상만으로 정보를 구분하는 경우 (예: 필수 항목을 빨간 색으로만 표시)
  - 6-2: 링크와 일반 텍스트를 색상만으로 구분하는 경우
- **Details:**
  - 색만으로 정보 전달 시 색맹·흑백 화면 사용자가 인식 불가
  - 색과 함께 아이콘·패턴·텍스트 등 추가 수단 병행 필요
- **Auto-Detection:** X
- **Detection Pattern:** 필수 입력 표시에 `color: red` 단독 사용 패턴 (부분 탐지 가능)
- **Fix Guide:**
  - 필수 항목: 빨간 별(*) + "필수" 텍스트 병행
  - 오류 표시: 빨간 테두리 + 오류 아이콘(⚠) + 오류 문구 제공

---

### Item 7. 자동 재생 금지

- **Compliance Criteria:** 자동으로 재생되는 배경음을 사용하지 않아야 한다.
- **Error Types:**
  - 7-1: 페이지 진입 시 3초를 초과하는 배경음이 자동 재생되는 경우
  - 7-2: 배경음을 멈추거나 제어할 수 없는 경우 (3초 미만은 예외)
- **Details:**
  - 3초 미만의 배경음은 예외로 인정
  - 배경음이 있을 경우 사용자가 쉽게 멈춤·일시정지·음량조절 가능해야 함
- **Auto-Detection:** O
- **Detection Pattern:**
  - `<audio autoplay>`, `<video autoplay>` 속성 존재
  - JS에서 `.play()` 자동 호출 패턴
- **Fix Guide:**
  - `autoplay` 속성 제거
  - 자동 재생이 필요하면 `muted` 속성 추가 + 명확한 정지 버튼 제공

---

### Item 8. 텍스트 콘텐츠의 명도 대비

- **Compliance Criteria:** 화면에 표시되는 모든 사용자 인터페이스 컴포넌트와 텍스트는 전경색과 배경색이 구분될 수 있도록 제공되어야 한다.
- **Error Types:**
  - 8-1: 일반 텍스트(18pt 미만, 굵지 않은 14pt 미만)의 명도 대비가 4.5:1 미만인 경우
  - 8-2: 큰 텍스트(18pt 이상, 굵은 14pt 이상)의 명도 대비가 3:1 미만인 경우
  - 8-3: UI 컴포넌트(아이콘, 버튼 테두리 등)의 명도 대비가 3:1 미만인 경우
- **Details:**
  - Windows 기준: 14pt = 18.66px, 18pt = 24px (MacOS는 pt/px 환산 다름)
  - 비활성화(disabled) 상태 컴포넌트는 검사 대상 제외
  - 장식 목적의 텍스트는 제외
  - CSS `color`/`background-color` 값이 코드에 명시된 경우 자동 계산 가능
  - CCA(Colour Contrast Analyser) 도구 사용 권고
- **Auto-Detection:** △
- **Detection Pattern:** CSS에 `color`와 `background-color`가 명시된 경우 대비율 계산 가능
- **Fix Guide:**
  - 텍스트 색상 또는 배경색을 조정하여 요구 대비율 충족
  - 일반 텍스트: 4.5:1 이상 (예: 흰 배경 #FFFFFF에 `#767676` 이상)

---

### Item 9. 콘텐츠 간의 구분

- **Compliance Criteria:** 이웃한 콘텐츠는 시각적으로 구분될 수 있어야 한다.
- **Error Types:**
  - 9-1: 인접 콘텐츠가 경계선·여백·색상 차이 없이 혼합되어 구분이 불가한 경우 (1가지 방법 이상 제공 필요)
- **Details:**
  - 시각적 구분 방법: 테두리, 선, 음영, 색상 차이, 여백 등 중 1가지 이상
- **Auto-Detection:** X
- **Detection Pattern:** 없음 (시각적 디자인 판단 필요)
- **Fix Guide:**
  - 콘텐츠 블록 사이에 `border`, `padding`, `background-color` 등으로 시각적 구분 추가

---

## 원칙 2. 운용의 용이성 (Operable)

---

### Item 10. 키보드 사용 보장

- **Compliance Criteria:** 모든 기능은 키보드만으로도 사용할 수 있어야 한다.
- **Error Types:**
  - 10-1: 마우스 이벤트(onclick, onmouseover 등)만 있고 키보드 이벤트가 없는 경우
- **Details:**
  - GIS(지도), VR, 그림판(painting) 등 포인터 장치가 본질적으로 필요한 기능은 예외
  - 예외 예시: GIS 지도 드래그, VR 뷰 회전, 자유 드로잉, RTS 게임 조작 등
  - `onclick` 단독 사용 시 `onkeydown`(Enter/Space) 이벤트 병행 제공 필요
- **Auto-Detection:** △
- **Detection Pattern:**
  - `onClick` 핸들러가 있는 `<div>`, `<span>`, `<li>` 등 비대화형 요소 (role 없이)
  - `onMouseEnter`/`onMouseOver` 만 있고 키보드 대응 없는 패턴
- **Fix Guide:**
  - 클릭 가능 요소는 `<button>` 또는 `<a>` 사용 (자동으로 키보드 접근 가능)
  - 커스텀 요소라면 `role="button"` + `tabIndex={0}` + `onKeyDown` 병행 추가

---

### Item 11. 초점 이동과 표시

- **Compliance Criteria:** 키보드에 의한 초점은 논리적으로 이동해야 하며, 시각적으로 구별할 수 있어야 한다.
- **Error Types:**
  - 11-1: 초점이 예측 불가능한 순서로 이동하는 경우
  - 11-2: 초점이 화면에 표시되지 않거나 숨겨진 요소로 이동하는 경우
  - 11-3: 초점이 해당 요소의 위치·크기와 다르게 표시되는 경우
  - 11-4: 모달/레이어 팝업에서 초점이 외부로 탈출하는 경우
  - 11-5: 초점이 특정 요소에 갇혀 빠져나올 수 없는 경우 (예: `onfocus=this.blur()`)
  - 11-6: CSS `outline: none`으로 초점 표시를 완전히 제거한 경우
- **Details:**
  - Tab/Shift+Tab 이동 순서가 시각적 배치 순서(좌→우, 위→아래)와 일치해야 함
  - 초점 표시는 브라우저 기본 스타일 또는 커스텀 스타일로 명확하게 제공
  - 모달 열림 시 초점이 모달 내부로 이동, 닫힘 시 원래 위치로 복귀
  - `outline: none` 사용 시 대체 포커스 스타일 필수 제공
- **Auto-Detection:** △
- **Detection Pattern:**
  - CSS `outline: none` 또는 `outline: 0` + 대체 스타일 없음
  - `tabIndex={-1}` 남용, `onfocus="this.blur()"` 패턴
- **Fix Guide:**
  - `outline: none` 제거 또는 `outline: 2px solid #005FCC` 등 커스텀 포커스 스타일 제공
  - 모달 구현 시 `focus-trap` 라이브러리 또는 직접 포커스 트랩 구현

---

### Item 12. 조작 가능

- **Compliance Criteria:** 사용자 입력 및 컨트롤은 조작 가능하도록 제공되어야 한다.
- **Error Types:**
  - 12-1: 컨트롤의 크기가 대각선으로 6.0mm 미만인 경우
  - 12-2: 링크, 사용자 입력, 기타 컨트롤의 테두리 안쪽으로 1픽셀 이상의 여백을 제공하지 않은 경우
- **Details:**
  - PC 웹: 17px × 17px 이상, 모바일 웹: 24px × 24px 이상이면 준수로 인정
  - 1mm = 3.78px 기준 (W3C CSS Values)
- **Auto-Detection:** △
- **Detection Pattern:** CSS `width`/`height`가 명시된 버튼·링크·입력 요소에서 크기 확인
- **Fix Guide:**
  - 버튼 최소 크기: `min-width: 44px; min-height: 44px` (WCAG 권고 기준)
  - 작은 아이콘 버튼은 `padding`으로 터치 영역 확장

---

### Item 13. 문자 단축키

- **Compliance Criteria:** 문자 단축키는 오동작으로 인한 오류를 방지하여야 한다.
- **Error Types:**
  - 13-1: 단일 문자 단축키(대·소문자, 구두점, 기호 글자, 숫자, 특수문자)를 사용할 때 다음 3가지 방법 중 1가지도 제공하지 않은 경우
    1. 단축키 비활성화 기능 제공
    2. 단축키 재설정 기능 제공
    3. 단축키가 초점을 받은 상태에서만 실행
- **Details:**
  - 설정 메뉴에서 단일 문자 단축키를 "사용 안함"으로 비활성화 가능하면 준수
  - Ctrl, Alt, Shift 조합키와 함께 재설정 가능하면 준수
  - 초점을 받은 상태에서만 동작하도록 구현하면 준수
- **Auto-Detection:** △
- **Detection Pattern:** `addEventListener('keydown')` 에서 수정키 없이 단일 문자 키 처리하는 패턴
- **Fix Guide:**
  - 단일 문자 단축키 비활성화 UI 제공 또는 수정키(Ctrl/Alt/Shift) 조합으로 변경

---

### Item 14. 응답시간 조절

- **Compliance Criteria:** 시간제한이 있는 콘텐츠는 응답시간을 조절할 수 있어야 한다.
- **Error Types:**
  - 14-1: 시간제한이 있는 콘텐츠를 제어할 수 있는 수단을 제공하지 않은 경우
  - 14-2: 시간제한을 해제 또는 연장하는 방법에 충분한 시간을 제공하지 않은 경우
- **Details:**
  - 시간 만료 최소 20초 전에 연장 방법 안내 제공
  - 스페이스바 등으로 10회 이상 연장하거나 기본 제한의 10배 이상 시간 제공
  - 경매·실시간 게임·청기평가 등 시간 조절이 근본적으로 불가한 경우 예외
  - 자동전환 페이지(Redirection page), 제한 시간 연장, 제한 시간 만료 경고 등이 검사 대상
- **Auto-Detection:** △
- **Detection Pattern:** `setTimeout`, `setInterval` 사용 패턴 탐지 (세션 타임아웃, 자동 로그아웃 등)
- **Fix Guide:**
  - 만료 20초 전 연장 확인 모달 표시
  - 세션 연장 API 연동 버튼 제공

---

### Item 15. 정지 기능 제공

- **Compliance Criteria:** 자동으로 변경되는 콘텐츠는 움직임을 제어할 수 있어야 한다.
- **Error Types:**
  - 15-1: 자동으로 변경되는 콘텐츠에 정지·이전·다음 기능이 없는 경우
  - 15-2: 자동으로 변경되는 콘텐츠를 마우스와 키보드 또는 터치로 제어할 수 없는 경우
- **Details:**
  - 정지·이전·다음 버튼을 반드시 제공하지 않아도 동등 기능 제공 시 준수
  - 콘텐츠 전체 내용을 한 번에 볼 수 있는 대체 수단 제공 시 준수 (예: "배너 전체 목록 보기")
  - 검사 대상: 자동 스크롤 배너, 자동 변경되는 실시간 검색순위 등
- **Auto-Detection:** △
- **Detection Pattern:**
  - `setInterval`로 슬라이드 자동 전환 구현 시 정지 버튼 존재 여부
  - CSS `animation`/`transition` 이 `infinite` 로 설정된 경우
- **Fix Guide:**
  - 자동 슬라이드: 재생/정지 버튼 추가
  - `prefers-reduced-motion` 미디어 쿼리 대응

---

### Item 16. 깜박임과 번쩍임 사용 제한

- **Compliance Criteria:** 초당 3~50회 주기로 깜박이거나 번쩍이는 콘텐츠를 제공하지 않아야 한다.
- **Error Types:**
  - 16-1: 사전 경고 없이 초당 3~50회 깜박이는 콘텐츠가 있는 경우
- **Details:**
  - 깜박임을 중단할 수 있는 수단이 있어도 사전에 경고 및 회피 방법 안내 필요
  - 동영상 콘텐츠도 검사 대상
- **Auto-Detection:** X
- **Detection Pattern:** CSS `animation` duration 값에서 3~50Hz 범위 추정 가능 (부정확)
- **Fix Guide:**
  - 깜박임 효과 제거 또는 주기를 3Hz 미만 또는 50Hz 초과로 변경
  - 불가피한 경우 사전 경고 문구 표시

---

### Item 17. 반복 영역 건너뛰기

- **Compliance Criteria:** 콘텐츠의 반복되는 영역은 건너뛸 수 있어야 한다.
- **Error Types:**
  - 17-1: 건너뛰기 링크를 제공하지 않은 경우
  - 17-2: 건너뛰기 링크 제공 방법이 적절하지 않은 경우
- **Details:**
  - 건너뛰기 링크는 일반 키보드 운용 방법으로 이용 가능해야 함
  - 디자인상 숨겨도 키보드 탐색 시 표시되어야 함 (`:focus` 상태에서 visible)
  - 건너뛰기 링크 연결이 잘못되거나 동작하지 않으면 오류
  - 건너뛰기 링크가 키보드 운용 시 화면에 안 보이게 제공된 경우 오류
  - 본문으로 가는 링크가 최상단에 제공되지 않은 경우 오류
  - 팝업·프레임에도 반복 영역이 있으면 건너뛰기 링크 필요
- **Auto-Detection:** △
- **Detection Pattern:**
  - `href="#main"`, `href="#content"` 등 앵커 링크 존재 여부
  - 스킵 내비게이션 패턴: `<a class="skip*">`, `<a href="#main-content">`
- **Fix Guide:**
  ```html
  <a href="#main-content" class="skip-nav">본문 바로가기</a>
  <!-- .skip-nav { position: absolute; top: -40px; } .skip-nav:focus { top: 0; } -->
  <main id="main-content">...</main>
  ```

---

### Item 18. 제목 제공

- **Compliance Criteria:** 페이지, 프레임, 콘텐츠 블록에는 적절한 제목을 제공해야 한다.
- **Error Types:**
  - 18-1: 페이지에 `<title>` 요소가 없는 경우
  - 18-2: 페이지 `<title>` 내용이 페이지 내용과 다른 경우
  - 18-3: `<iframe>` 요소에 `title` 속성이 없는 경우
  - 18-4: `<iframe>` 요소 title이 내용을 적절히 설명하지 않는 경우
  - 18-5: 콘텐츠 블록(섹션)에 제목 요소(`<h1>`~`<h6>`)가 없는 경우
  - 18-6: 콘텐츠 블록 제목이 내용을 적절히 설명하지 않는 경우
- **Details:**
  - 부적절한 페이지 제목 예: 내용과 다른 제목, 동일 제목 중복, 특수문자 2개 이상 반복
  - 탭으로 구성된 페이지는 탭 제목을 상위 범주로 제공해도 준수
  - 내용/기능 없는 프레임은 "빈프레임", "내용없음" 등으로 title 제공
  - 제목을 `display:none`으로 숨기는 것은 오류
- **Auto-Detection:** △
- **Detection Pattern:**
  - `<title>` 태그 없음 또는 빈 `<title>`
  - `<iframe>` 에 `title` 속성 없음
  - `<h1>`~`<h6>` 구조 분석 (계층 건너뜀, 중복 등)
- **Fix Guide:**
  - `<title>페이지명 - 서비스명</title>` 형식 사용
  - `<iframe title="광고 배너">` 형식으로 의미 있는 title 제공
  - 헤딩 계층: `h1` → `h2` → `h3` 순서 준수 (건너뜀 금지)

---

### Item 19. 적절한 링크 텍스트

- **Compliance Criteria:** 링크 텍스트는 용도나 목적을 이해할 수 있도록 제공해야 한다.
- **Error Types:**
  - 19-1: 목적이나 용도를 알기 어려운 링크 텍스트를 제공한 경우
- **Details:**
  - "확인", "취소", "이전", "다음", "다운로드", "상세보기", "더보기" 등은 주변 맥락으로 이해 가능한 경우 준수로 인정
  - 링크 텍스트가 단순 URL 경로만인 경우 오류
  - 용도·목적을 이해할 수 없는 빈 링크 텍스트 오류
- **Auto-Detection:** △
- **Detection Pattern:**
  - `<a>` 텍스트가 "더보기", "클릭", "여기", "바로가기" 단독인 경우
  - `<a href="https://...">https://...</a>` URL 텍스트 그대로 사용
  - `<a>` 내부 텍스트 없고 `aria-label`도 없는 경우
- **Fix Guide:**
  - `<a href="...">공지사항 더보기</a>` (맥락 포함)
  - 아이콘 버튼: `<a href="..."><img src="icon.svg" alt="다음 페이지로 이동"></a>`
  - `aria-label="공지사항 더보기"` 활용

---

### Item 20. 고정된 참조 위치 정보

- **Compliance Criteria:** 전자출판문서 형식의 웹페이지는 각 페이지로 이동할 수 있는 기능이 있어야 하고, 서식이나 플랫폼에 상관없이 참조 위치 정보를 일관되게 제공·유지해야 한다.
- **Error Types:**
  - 20-1: 전자출판문서 콘텐츠에 대한 페이지 구분 정보를 제공하지 않은 경우
  - 20-2: 전자출판문서 콘텐츠에 대한 페이지 이동 기능을 제공하지 않은 경우
  - 20-3: 콘텐츠 변경(글꼴 변경, 간격 조절 등) 시 일관된 페이지 구분 정보를 제공·유지하지 않는 경우
- **Details:**
  - 텍스트 스타일 변경이 불가한, 페이지가 고정된 형태의 PDF 문서 등은 해당 항목 검사 대상 아님
  - 전자책(e-Book), PDF 형식 웹 콘텐츠가 주요 대상
- **Auto-Detection:** X
- **Detection Pattern:** 전자출판문서 형식 여부 판단 필요
- **Fix Guide:**
  - 전자책 뷰어: 현재 페이지/전체 페이지 표시 + 페이지 이동 컨트롤 제공

---

### Item 21. 단일 포인터 입력 지원

- **Compliance Criteria:** 다중 포인터 또는 경로기반 동작을 통한 입력은 단일 포인터 입력으로도 조작할 수 있어야 한다.
- **Error Types:**
  - 21-1: 다중 포인터 또는 경로 기반 동작을 통한 입력을 수행할 때 동등한 단일 포인터 입력을 함께 사용할 수 없는 경우
- **Details:**
  - 경로 기반 동작: 슬라이더, 드래그, 스와이프, 그리기 등
  - 핀치(pinch), 스와이프(Swipe), 드래그 앤 드롭 등을 단일 포인터(더블클릭, 클릭·길게 누르기)로 대체 가능하면 준수
  - 지도 확대/축소: 핀치 제스처 + 확대/축소 버튼 제공 시 준수
  - OS·브라우저·보조기술이 기본 제공하는 경로 기반 동작은 예외
- **Auto-Detection:** △
- **Detection Pattern:**
  - `ontouchstart`/`onpointermove` 이벤트만 있고 클릭 대안 없는 패턴
  - 핀치·스와이프 제스처 라이브러리 사용 여부
- **Fix Guide:**
  - 드래그 슬라이더: +/- 버튼 또는 직접 입력 필드 병행 제공
  - 지도: 확대/축소 버튼 추가

---

### Item 22. 포인터 입력 취소

- **Compliance Criteria:** 단일 포인터 입력으로 실행되는 기능은 취소할 수 있어야 한다.
- **Error Types:**
  - 22-1: 단일 포인터 입력으로 실행되는 기능을 취소할 수 있는 기능을 다음 3가지 방법 중 1가지도 제공하지 않은 경우
    1. 누르는 동작(Down-Event)에 기능 실행 금지
    2. 완료 전 기능 중단 또는 완료 후 취소 기능 제공
    3. 떼는 동작(Up-Event)에 누르는 동작 결과를 되돌리는 기능 제공
- **Details:**
  - 클릭 가능한 컨트롤(버튼, 링크 등): 누른 후 대상 영역 밖으로 이동 시 기능 미실행 또는 실행 후 취소 가능 시 준수
  - 드래그 앤 드롭: 선택 항목을 끌던 중 외부에 놓았을 때 취소 가능하면 준수
  - 타이핑·피아노·건반·슈팅 게임 등은 누르는 동작이 필수인 경우 예외
- **Auto-Detection:** △
- **Detection Pattern:** `onMouseDown`/`onPointerDown` 에 즉시 실행 로직이 있는 패턴
- **Fix Guide:**
  - `onClick` (mouseup 기반) 사용 권장 (`onMouseDown` 대신)
  - 중요한 동작(삭제, 결제 등)은 확인 다이얼로그 추가

---

### Item 23. 레이블과 네임

- **Compliance Criteria:** 텍스트 또는 텍스트 이미지가 포함된 레이블이 있는 사용자 인터페이스 구성요소는 네임에 시각적으로 표시되는 해당 텍스트를 포함해야 한다.
- **Error Types:**
  - 23-1: 시각적으로 보이는 텍스트 레이블(label)에 대한 접근 가능한 네임(name)을 포함하지 않는 경우
- **Details:**
  - 네임(name): 소프트웨어가 사용자에게 웹 콘텐츠 내 구성요소를 식별하게 해주는 텍스트
  - 시각적 레이블 위치: 콤보 상자(왼쪽), 체크박스/라디오(오른쪽), 버튼(내부), 아이콘(아래)
  - 기호 텍스트(b, I, ABC)는 시각적 레이블이 아닌 기능(굵게, 기울임, 맞춤법)을 접근 가능 네임으로 기술 필요
  - 수식·공식은 화면낭독프로그램이 레이블의 수학적 기호를 처리 가능하도록 제공
- **Auto-Detection:** △
- **Detection Pattern:**
  - 버튼 내 아이콘만 있고 `aria-label` 없는 경우
  - 입력 필드 주변 레이블 텍스트와 `aria-label`/`aria-labelledby` 불일치
- **Fix Guide:**
  - 아이콘 버튼: `<button aria-label="검색">🔍</button>`
  - 시각적 레이블과 동일하거나 포함하는 `aria-label` 사용

---

### Item 24. 동작 기반 작동

- **Compliance Criteria:** 동작 기반으로 작동하는 기능은 사용자 인터페이스 구성요소로 조작할 수 있고, 동작 기반 기능을 비활성화할 수 있어야 한다.
- **Error Types:**
  - 24-1: 동작 기반 작동에 대한 비활성화 기능을 제공하지 않은 경우
  - 24-2: 버튼 등 사용자 인터페이스 구성요소로 대체 기능을 제공하지 않은 경우
- **Details:**
  - 동작 기반 예시: 흔들기, 기울이기, 흔들어서 실행 취소 등
  - 동작 감지 비활성화를 운영체제 설정으로 지원하는 경우 준수
  - 반보계·만보계 등 동작이 기능의 핵심인 경우 예외
- **Auto-Detection:** △
- **Detection Pattern:** `DeviceMotionEvent`, `DeviceOrientationEvent` 사용 여부
- **Fix Guide:**
  - 흔들기 기능: "흔들기" 버튼 또는 "동작 기반 기능 끄기" 설정 제공

---

## 원칙 3. 이해의 용이성 (Understandable)

---

### Item 25. 기본 언어 표시

- **Compliance Criteria:** 주로 사용하는 언어를 명시해야 한다.
- **Error Types:**
  - 25-1: 문서 타입에 맞는 기본 언어를 명시하지 않은 경우
  - 25-2: 문서 타입에 맞는 기본 언어를 적절하지 않게 명시한 경우
- **Details:**
  - Doctype에 맞는 속성으로 ISO 639-1 두 글자 언어 코드 사용 (BCP 47도 허용)
  - HTML 4.01/HTML5: `<html lang="ko">`
  - XHTML 1.0: `<html xml:lang="ko" lang="ko">`
  - XHTML 1.1: `<html xml:lang="ko">`
  - 예: `ko-KR`, `en-US`
- **Auto-Detection:** O
- **Detection Pattern:**
  - `<html>` 에 `lang` 속성 없음
  - `lang` 값이 ISO 639-1 규격에 맞지 않음 (예: `lang="korean"`)
- **Fix Guide:**
  - `<html lang="ko">` 추가 (한국어 서비스 기준)

---

### Item 26. 사용자 요구에 따른 실행

- **Compliance Criteria:** 사용자가 의도하지 않은 기능(새 창, 초점 변화 등)은 실행되지 않아야 한다.
- **Error Types:**
  - 26-1: 사용자가 실행하지 않은 상황에서 예측하지 않은 새 창이 열리는 경우
  - 26-2: 웹 페이지 시작 시 새 창 또는 화면을 가리는 레이어 팝업이 제공되는 경우
  - 26-3: 사용자가 의도하지 않은 초점 변화나 기능이 발생하여 맥락 불편을 주는 경우
  - 26-4: 입력 서식의 값을 변경하는 것만으로 다른 페이지로 이동하거나 현재 페이지의 의미가 바뀌는 경우
- **Details:**
  - 입력 서식 포커스 시 자동 초점 이동 기능(autofocus)은 이전 서식으로 초점을 되돌아갈 수 있거나 수정 방법 제공 시 준수
  - 오류 정정을 위한 자동 초점 변경은 이 항목 검사 대상 아님
  - `<a target="_blank">` 만으로 새 창 알림 없는 경우 오류로 간주하지 않음 (단 별도 안내 권고)
  - `<select onChange>` 로 페이지 이동 시 오류
- **Auto-Detection:** △
- **Detection Pattern:**
  - `window.open()` 자동 실행 코드 (사용자 이벤트 없이)
  - `<select onChange="location.href=...">` 패턴
  - `autofocus` 속성 사용
- **Fix Guide:**
  - 새 창 열기: 링크 텍스트에 "(새 창)" 안내 또는 아이콘 제공
  - select 자동 이동: 별도 "이동" 버튼 제공

---

### Item 27. 찾기 쉬운 도움 정보

- **Compliance Criteria:** 도움 정보가 제공되는 경우, 동일한 웹 페이지 세트 내에서는 상대적으로 동일한 위치에 일관성 있게 접근할 수 있어야 한다.
- **Error Types:**
  - 27-1: 도움 정보 링크가 일관된 위치에 제공되지 않는 경우
    - 도움 정보 유형: 사람 연락처, 사람 지원 메커니즘, 셀프서비스 지원, 자동화된 연락 메커니즘
- **Details:**
  - 도움 정보 예: 고객센터, 채팅 상담, FAQ, 챗봇
  - 동일 페이지 세트 내 도움 정보 링크 위치가 변경되면 오류
  - 도움 정보가 없는 경우 이 항목은 해당 없음(-)
- **Auto-Detection:** X
- **Detection Pattern:** 없음 (전체 페이지 흐름 판단 필요)
- **Fix Guide:**
  - 고객센터·FAQ·챗봇 링크를 헤더 또는 푸터에 일관된 위치로 고정

---

### Item 28. 오류 정정

- **Compliance Criteria:** 입력 오류를 정정할 수 있어야 한다.
- **Error Types:**
  - 28-1: 입력 오류 발생 시 오류 내용을 이해할 수 있도록 설명하지 않는 경우
  - 28-2: 입력 오류 정정 방법을 안내하지 않는 경우
  - 28-3: 중요한 정보 제출 전 확인·검토 기능 없는 경우
  - 28-4: 입력 오류 발생 위치로 초점을 이동하지 않는 경우
- **Details:**
  - 오류 발생 시 오류 내용 + 수정 방법을 텍스트로 명확히 안내
  - 법적·금융 거래(결제, 삭제 등) 등 중요 제출 전 확인 단계 제공
- **Auto-Detection:** △
- **Detection Pattern:**
  - `<input>` 의 `required` 속성 + 오류 메시지 처리 코드 여부
  - `aria-invalid`, `aria-describedby` 사용 여부
- **Fix Guide:**
  - 오류 시: `aria-invalid="true"` + `aria-describedby="error-msg"` + `<span id="error-msg">이메일 형식이 올바르지 않습니다.</span>`
  - 오류 발생 시 해당 필드로 초점 이동

---

### Item 29. 레이블 제공

- **Compliance Criteria:** 사용자 입력에는 레이블을 제공해야 한다.
- **Error Types:**
  - 29-1: `<input>`, `<textarea>`, `<select>` 요소에 1:1로 연결된 `<label>` 또는 `title` 속성이 없는 경우
  - 29-2: 레이블이 입력 요소의 용도를 명확히 설명하지 않는 경우
- **Details:**
  - `<input id="email">` ↔ `<label for="email">` 1:1 연결
  - `<input type="image|hidden|submit|button|reset">` 은 label·title 없어도 오류 아님
  - placeholder 단독 사용은 레이블로 인정하지 않음 (title 또는 WAI-ARIA 속성 필요)
  - `<select>` 의 `<option>` 에는 `<label>` 또는 `title` 불필요
- **Auto-Detection:** O
- **Detection Pattern:**
  - `<input>` 에 연결된 `<label>` 없음 (for-id 연결 확인)
  - `<input>` 에 `aria-label`, `aria-labelledby`, `title` 도 없음
  - `placeholder` 만 있고 `label` 없음
- **Fix Guide:**
  ```html
  <label for="email">이메일</label>
  <input type="email" id="email" name="email">
  <!-- 또는 -->
  <input type="email" aria-label="이메일" placeholder="example@email.com">
  ```

---

### Item 30. 접근 가능한 인증

- **Compliance Criteria:** 인증 과정은 인지 기능 테스트에만 의존해서는 안 된다.
- **Error Types:**
  - 30-1: 인증 과정에 인지 기능 테스트(CAPTCHA, 퍼즐, 수학 계산 등)만 제공하고 대체 수단이 없는 경우
- **Details:**
  - 대체 수단 예: 이메일·SMS 인증, 생체 인증, OAuth, USB 보안키
  - 인증 과정에서 API나 도구를 통해 대체 방법이 3가지 이상 제공되는 경우 준수
  - 이메일/SMS 인증, 생체 인증, 패스키 등을 대체 수단으로 인정
- **Auto-Detection:** △
- **Detection Pattern:** CAPTCHA 관련 코드 패턴 (`recaptcha`, `hcaptcha`, `turnstile` 등)
- **Fix Guide:**
  - CAPTCHA 사용 시 이메일/SMS 인증 등 대체 인증 수단 병행 제공

---

### Item 31. 반복 입력 정보

- **Compliance Criteria:** 이전에 입력한 정보가 반복적으로 필요한 경우 자동으로 채워져야 한다.
- **Error Types:**
  - 31-1: 다단계 폼 등에서 이전 입력 정보가 필요한데 자동 채움 기능이 없는 경우
- **Details:**
  - 이름, 주소, 이메일 등 이전에 입력한 정보가 동일 세션 내 다음 단계 폼에서 필요할 때 자동 채움 또는 선택 가능하게 제공
  - 보안 목적의 비밀번호 재입력, 이전 입력이 더 이상 유효하지 않은 경우 예외
  - `autocomplete` 속성 사용 권고
- **Auto-Detection:** △
- **Detection Pattern:** 다단계 폼에서 동일 필드 반복 여부, `autocomplete` 속성 사용 여부
- **Fix Guide:**
  - `<input autocomplete="email">`, `<input autocomplete="name">` 등 `autocomplete` 속성 지정
  - 다단계 폼: 이전 단계 입력값을 다음 단계에 자동 채움 또는 선택 UI 제공

---

## 원칙 4. 견고성 (Robust)

---

### Item 32. 마크업 오류 방지

- **Compliance Criteria:** 마크업 언어의 요소는 열고 닫음, 중첩 관계, 속성 선언에 오류가 없어야 한다.
- **Error Types:**
  - 32-1: 요소의 시작 태그·종료 태그 오류
  - 32-2: 요소 중첩 오류
  - 32-3: 속성값 따옴표 누락 오류
  - 32-4: 동일 ID 속성값 중복 사용
- **Details:**
  - W3C HTML 유효성 검사(validator.w3.org) 기준 적용
- **Auto-Detection:** O
- **Detection Pattern:**
  - `id` 속성값 중복: 동일 id 두 개 이상 존재
  - JSX에서 `key` prop 누락 (리스트 렌더링)
  - 잘못된 중첩 태그 (예: `<p><div>...</div></p>`)
- **Fix Guide:**
  - `id` 는 페이지 내 유일해야 함 (반복 컴포넌트에 동일 id 사용 금지)
  - HTML 유효성: `<p>` 내부에 블록 요소 사용 금지
  - 리스트 렌더링: `key` prop 추가

---

### Item 33. 웹 애플리케이션 접근성 준수

- **Compliance Criteria:** 웹 애플리케이션은 접근성이 있어야 한다.
- **Error Types:**
  - 33-1: 커스텀 UI 컴포넌트에 적절한 WAI-ARIA 역할(role), 속성(property), 상태(state) 정보를 제공하지 않는 경우
- **Details:**
  - 기본 HTML 요소 사용 시 별도 ARIA 불필요 (브라우저가 자동 처리)
  - 커스텀 컴포넌트(div로 만든 드롭다운, 토글 등)에는 적절한 role과 상태 속성 필수
  - role이 있으면 필요한 aria 속성도 함께 제공해야 함
- **Auto-Detection:** △
- **Detection Pattern:**
  - `role="button"` 이 있으나 `aria-pressed`, `aria-expanded` 등 상태 속성 없음
  - `role="tabpanel"` 이 있으나 `aria-labelledby` 없음
  - `role="dialog"` 이 있으나 `aria-modal`, `aria-labelledby` 없음
  - `aria-hidden="true"` 로 숨겨진 요소에 초점 이동하는 경우
- **Fix Guide:**
  - 커스텀 탭: `role="tab"` + `aria-selected="true/false"` + `aria-controls="panel-id"`
  - 커스텀 모달: `role="dialog"` + `aria-modal="true"` + `aria-labelledby="modal-title"`
  - 토글 버튼: `role="button"` + `aria-pressed="true/false"`
