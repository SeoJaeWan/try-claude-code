# E2E 테스트 플랜: Next.js 기본 앱

## 개요

Next.js 16 기본 스타터 애플리케이션에 대한 E2E 테스트 플랜입니다. 이 앱은 단일 랜딩 페이지로 구성되어 있으며, Next.js 로고, 안내 텍스트, 그리고 외부 링크(Templates, Learning, Deploy Now, Documentation)를 포함합니다.

**대상 URL:** `http://localhost:3000`
**기술 스택:** Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, TypeScript

---

### 1. 페이지 로딩 및 기본 렌더링

#### 1.1 메인 페이지 정상 로딩

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 페이지가 완전히 로드될 때까지 대기한다.

**기대 결과:**
- 페이지가 HTTP 200 상태로 응답한다.
- 페이지 타이틀이 "Create Next App"이다.
- `<main>` 요소가 화면에 표시된다.

**성공 기준:** 페이지가 3초 이내에 로드되고 주요 콘텐츠가 렌더링된다.
**실패 조건:** 페이지 로딩 실패, 타이틀 불일치, 또는 빈 화면 표시.

#### 1.2 Next.js 로고 이미지 표시

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. Next.js 로고 이미지(`alt="Next.js logo"`)가 표시되는지 확인한다.

**기대 결과:**
- `alt="Next.js logo"` 속성을 가진 `<img>` 요소가 존재한다.
- 이미지의 `src`가 `/next.svg` 경로를 포함한다.
- 이미지가 화면에 보이며 (visible), 너비 100px, 높이 20px로 렌더링된다.

**성공 기준:** 로고 이미지가 정상적으로 로드되고 표시된다.
**실패 조건:** 이미지 깨짐, 404 에러, 또는 이미지 미표시.

#### 1.3 안내 텍스트 표시

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 메인 헤딩 텍스트를 확인한다.
3. 설명 텍스트를 확인한다.

**기대 결과:**
- `<h1>` 요소에 "To get started, edit the page.tsx file." 텍스트가 표시된다.
- 설명 문단에 "Looking for a starting point or more instructions?" 텍스트가 표시된다.

**성공 기준:** 모든 텍스트 콘텐츠가 올바르게 렌더링된다.
**실패 조건:** 텍스트 누락 또는 잘못된 텍스트 표시.

---

### 2. 외부 링크 동작

#### 2.1 Templates 링크 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. "Templates" 링크 텍스트를 찾는다.
3. 링크의 `href` 속성을 확인한다.

**기대 결과:**
- "Templates" 텍스트가 링크(`<a>`)로 감싸져 있다.
- `href`가 `https://vercel.com/templates?framework=next.js` 로 시작한다.

**성공 기준:** 링크가 올바른 URL을 가리킨다.
**실패 조건:** 링크 누락 또는 잘못된 URL.

#### 2.2 Learning 링크 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. "Learning" 링크 텍스트를 찾는다.
3. 링크의 `href` 속성을 확인한다.

**기대 결과:**
- "Learning" 텍스트가 링크(`<a>`)로 감싸져 있다.
- `href`가 `https://nextjs.org/learn` 으로 시작한다.

**성공 기준:** 링크가 올바른 URL을 가리킨다.
**실패 조건:** 링크 누락 또는 잘못된 URL.

#### 2.3 Deploy Now 버튼 링크 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. "Deploy Now" 텍스트를 포함하는 링크를 찾는다.
3. 링크의 `href` 및 `target` 속성을 확인한다.

**기대 결과:**
- "Deploy Now" 링크가 존재한다.
- `href`가 `https://vercel.com/new` 로 시작한다.
- `target="_blank"` 속성이 설정되어 있다.
- `rel="noopener noreferrer"` 속성이 설정되어 있다.
- Vercel 로고 이미지(`alt="Vercel logomark"`)가 링크 내부에 표시된다.

**성공 기준:** Deploy Now 버튼이 올바른 속성과 함께 렌더링된다.
**실패 조건:** 링크 속성 누락 또는 잘못된 값.

#### 2.4 Documentation 버튼 링크 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. "Documentation" 텍스트를 포함하는 링크를 찾는다.
3. 링크의 `href` 및 `target` 속성을 확인한다.

**기대 결과:**
- "Documentation" 링크가 존재한다.
- `href`가 `https://nextjs.org/docs` 로 시작한다.
- `target="_blank"` 속성이 설정되어 있다.
- `rel="noopener noreferrer"` 속성이 설정되어 있다.

**성공 기준:** Documentation 버튼이 올바른 속성과 함께 렌더링된다.
**실패 조건:** 링크 속성 누락 또는 잘못된 값.

---

### 3. 레이아웃 및 스타일링

#### 3.1 다크 모드 지원 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 시스템 다크 모드 설정을 활성화한다 (`prefers-color-scheme: dark`).
3. 페이지의 배경색과 텍스트 색상이 변경되는지 확인한다.

**기대 결과:**
- 다크 모드에서 배경이 검은색(`bg-black`)으로 변경된다.
- Next.js 로고에 `invert` 필터가 적용된다.
- 텍스트 색상이 밝은 색(`text-zinc-50`, `text-zinc-400`)으로 변경된다.

**성공 기준:** 다크 모드 전환 시 UI가 적절히 반응한다.
**실패 조건:** 다크 모드에서 텍스트/배경 대비 부족 또는 스타일 미적용.

#### 3.2 반응형 레이아웃 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 뷰포트를 모바일 크기(375x667)로 설정한다.
3. 콘텐츠 정렬 상태를 확인한다.
4. 뷰포트를 데스크탑 크기(1280x720)로 변경한다.
5. 콘텐츠 정렬 상태를 다시 확인한다.

**기대 결과:**
- 모바일 뷰포트: 콘텐츠가 중앙 정렬(`items-center`, `text-center`)된다.
- 데스크탑 뷰포트(`sm` breakpoint 이상): 콘텐츠가 좌측 정렬(`sm:items-start`, `sm:text-left`)된다.
- Deploy Now / Documentation 버튼이 모바일에서 세로 배치, 데스크탑에서 가로 배치(`sm:flex-row`)된다.

**성공 기준:** 뷰포트 크기에 따라 레이아웃이 적절히 변경된다.
**실패 조건:** 반응형 스타일 미적용 또는 레이아웃 깨짐.

---

### 4. 접근성

#### 4.1 이미지 대체 텍스트 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 페이지 내 모든 `<img>` 요소의 `alt` 속성을 확인한다.

**기대 결과:**
- Next.js 로고: `alt="Next.js logo"`
- Vercel 로고: `alt="Vercel logomark"`
- 모든 이미지에 의미 있는 대체 텍스트가 존재한다.

**성공 기준:** 모든 이미지에 적절한 `alt` 속성이 설정되어 있다.
**실패 조건:** `alt` 속성 누락 또는 빈 문자열.

#### 4.2 HTML lang 속성 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. `<html>` 태그의 `lang` 속성을 확인한다.

**기대 결과:**
- `<html lang="en">` 속성이 설정되어 있다.

**성공 기준:** 적절한 언어 속성이 존재한다.
**실패 조건:** `lang` 속성 누락.

---

### 5. 에러 및 엣지 케이스

#### 5.1 존재하지 않는 경로 접근

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000/non-existent-page` 로 이동한다.
2. 페이지 응답을 확인한다.

**기대 결과:**
- Next.js 기본 404 페이지가 표시된다.
- "404" 또는 "This page could not be found" 메시지가 표시된다.

**성공 기준:** 404 에러가 적절히 처리된다.
**실패 조건:** 서버 에러(500) 또는 빈 페이지 표시.

#### 5.2 정적 에셋 로딩 실패 시 동작

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. 네트워크 요청을 모니터링하여 `/next.svg`, `/vercel.svg` 에셋이 정상 로드되는지 확인한다.

**기대 결과:**
- `/next.svg` 파일이 200 상태로 응답한다.
- `/vercel.svg` 파일이 200 상태로 응답한다.

**성공 기준:** 모든 정적 에셋이 정상적으로 로드된다.
**실패 조건:** 에셋 로딩 실패(404, 500 등).

---

### 6. 메타데이터

#### 6.1 페이지 메타데이터 확인

**Seed:** `tests/seed.spec.ts`

**단계:**
1. `http://localhost:3000` 으로 이동한다.
2. `<title>` 태그 내용을 확인한다.
3. `<meta name="description">` 태그 내용을 확인한다.

**기대 결과:**
- 페이지 타이틀: "Create Next App"
- 메타 설명: "Generated by create next app"

**성공 기준:** 메타데이터가 올바르게 설정되어 있다.
**실패 조건:** 메타데이터 누락 또는 잘못된 값.
