# Output Format Reference

HTML + CSV report templates for accessibility review results.

---

## HTML Report Template

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>웹 접근성 검토 리포트 — {YYYY-MM-DD}</title>
<style>
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 1200px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6; }
  h1 { border-bottom: 3px solid #333; padding-bottom: 8px; }
  h2 { border-left: 5px solid #555; padding-left: 12px; margin-top: 32px; }
  h3 { color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9em; }
  th { background: #f5f5f5; padding: 10px 12px; border: 1px solid #ddd; text-align: left; white-space: nowrap; }
  td { padding: 10px 12px; border: 1px solid #ddd; vertical-align: top; }
  tr:hover td { background: #fafafa; }
  .result-O   { background: #d4edda; color: #155724; font-weight: bold; text-align: center; }
  .result-X   { background: #f8d7da; color: #721c24; font-weight: bold; text-align: center; }
  .result-tri { background: #fff3cd; color: #856404; font-weight: bold; text-align: center; }
  .result-na  { background: #e2e3e5; color: #383d41; text-align: center; }
  .result-unknown { background: #dce8f8; color: #1a4a8a; text-align: center; font-size: 0.85em; }
  .method-playwright { color: #0066cc; font-size: 0.8em; font-weight: bold; }
  .method-static     { color: #666; font-size: 0.8em; }
  .method-unknown    { color: #999; font-size: 0.8em; }
  .summary-pass { color: #155724; font-weight: bold; }
  .summary-fail { color: #721c24; font-weight: bold; }
  .fix-X   { background: #fff5f5; border-left: 4px solid #dc3545; border-radius: 0 4px 4px 0; padding: 16px; margin: 12px 0; }
  .fix-tri { background: #fffdf0; border-left: 4px solid #ffc107; border-radius: 0 4px 4px 0; padding: 16px; margin: 12px 0; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
  .meta { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 16px; margin-bottom: 24px; }
  .meta ul { list-style: none; margin: 0; padding: 0; }
  .meta li { margin: 4px 0; }
  .playwright-badge { display: inline-block; background: #0066cc; color: white; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
</style>
</head>
<body>

<h1>웹 접근성/웹표준 검토 리포트</h1>

<div class="meta">
<ul>
  <li><strong>날짜:</strong> {YYYY-MM-DD}</li>
  <li><strong>검토 파일:</strong> {변경된 파일 목록}</li>
  <li><strong>기준:</strong> KWCAG2.2 (한국지능정보사회진흥원, 2024.10) + 시맨틱 HTML (HTML Living Standard)</li>
  <li><strong>Playwright:</strong> {사용됨 <span class="playwright-badge">자동검사</span> / 미사용 — playwright.config.ts 없음}</li>
</ul>
</div>

<h2>요약</h2>
<table>
  <tr>
    <th>원칙</th><th>합격(O)</th><th>권고(△)</th><th>불합격(X)</th><th>해당없음(-)</th><th>판정불가</th><th>합격률</th>
  </tr>
  <tr><td>인식의 용이성 (9항목)</td><td class="summary-pass"></td><td></td><td class="summary-fail"></td><td></td><td></td><td></td></tr>
  <tr><td>운용의 용이성 (15항목)</td><td class="summary-pass"></td><td></td><td class="summary-fail"></td><td></td><td></td><td></td></tr>
  <tr><td>이해의 용이성 (7항목)</td><td class="summary-pass"></td><td></td><td class="summary-fail"></td><td></td><td></td><td></td></tr>
  <tr><td>견고성 (2항목)</td><td class="summary-pass"></td><td></td><td class="summary-fail"></td><td></td><td></td><td></td></tr>
  <tr style="font-weight:bold; background:#f5f5f5;">
    <td>전체 (33항목)</td><td class="summary-pass"></td><td></td><td class="summary-fail"></td><td></td><td></td><td><strong>--%</strong></td>
  </tr>
</table>

<h2>상세 결과</h2>

<h3>원칙 1. 인식의 용이성</h3>
<table>
  <tr><th>#</th><th>항목명</th><th>결과</th><th>판정방식</th><th>발견된 문제</th><th>수정 가이드</th></tr>
  <tr>
    <td>1</td><td>적절한 대체 텍스트</td>
    <td class="result-O">O</td>
    <td><span class="method-static">정적분석</span></td>
    <td></td><td></td>
  </tr>
  <!-- 항목 8 — Playwright 사용 시 -->
  <tr>
    <td>8</td><td>명도 대비</td>
    <td class="result-O">O</td>
    <td><span class="method-playwright">Playwright</span></td>
    <td></td><td></td>
  </tr>
  <!-- 항목 8 — playwright.config.ts 없을 때 -->
  <!--
  <tr>
    <td>8</td><td>명도 대비</td>
    <td class="result-unknown">판정불가</td>
    <td><span class="method-unknown">판정불가</span></td>
    <td>playwright.config.ts 없음</td><td>Playwright 설치 후 재검토</td>
  </tr>
  -->
</table>

<h3>원칙 2. 운용의 용이성</h3>
<table>
  <tr><th>#</th><th>항목명</th><th>결과</th><th>판정방식</th><th>발견된 문제</th><th>수정 가이드</th></tr>
  <!-- 항목 10: 키보드 접근성 (Playwright) -->
  <tr>
    <td>10</td><td>키보드 사용</td>
    <td class="result-X">X</td>
    <td><span class="method-playwright">Playwright</span></td>
    <td>Tab 포커스 이동 시 일부 요소 미접근</td>
    <td>인터랙티브 요소에 tabindex=0 및 :focus 스타일 추가</td>
  </tr>
</table>

<h3>원칙 3. 이해의 용이성</h3>
<table>
  <tr><th>#</th><th>항목명</th><th>결과</th><th>판정방식</th><th>발견된 문제</th><th>수정 가이드</th></tr>
</table>

<h3>원칙 4. 견고성</h3>
<table>
  <tr><th>#</th><th>항목명</th><th>결과</th><th>판정방식</th><th>발견된 문제</th><th>수정 가이드</th></tr>
  <!-- 항목 33: 웹앱 접근성 (Playwright) -->
  <tr>
    <td>33</td><td>웹 애플리케이션 접근성</td>
    <td class="result-tri">△</td>
    <td><span class="method-playwright">Playwright</span></td>
    <td>클릭 후 aria-expanded 상태 미변경</td>
    <td>동적 컴포넌트에 aria-expanded 상태 관리 추가</td>
  </tr>
</table>

<h2>시맨틱 HTML 검토</h2>
<table>
  <tr><th>검토 항목</th><th>결과</th><th>판정방식</th><th>발견된 문제</th><th>권고 수정</th></tr>
  <tr><td>랜드마크 요소 (header/main/footer/nav)</td><td class="result-O">O</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>섹션 구조 (article/section/aside)</td><td class="result-O">O</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>대화형 요소 (button/a vs div/span)</td><td class="result-O">O</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>목록 구조 (ul/ol/li)</td><td class="result-O">O</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>표현용 태그 (b/i → strong/em)</td><td class="result-na">-</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>폼 그룹 (fieldset/legend)</td><td class="result-na">-</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
  <tr><td>기타 시맨틱 요소 (time/blockquote 등)</td><td class="result-na">-</td><td><span class="method-static">정적분석</span></td><td></td><td></td></tr>
</table>

<h2>수정 필요 항목</h2>

<h3>불합격 (X)</h3>
<!-- 없으면: <p>없음</p> -->
<div class="fix-X">
  <p><strong>항목 {N}. {항목명}</strong> — <code>{파일명}:{라인}</code></p>
  <p><strong>문제:</strong> {구체적인 코드 문제}</p>
  <p><strong>수정:</strong> <code>{구체적인 수정 코드}</code></p>
</div>

<h3>권고 (△)</h3>
<!-- 없으면: <p>없음</p> -->
<div class="fix-tri">
  <p><strong>항목 {N}. {항목명}</strong> (또는 <strong>시맨틱 HTML: {검토 항목}</strong>)</p>
  <p><strong>내용:</strong> {개선 권고 내용}</p>
</div>

</body>
</html>
```

---

## CSV Report Template

```
번호,항목명,원칙,결과,판정방식,발견된 문제,수정 가이드
1,적절한 대체 텍스트,인식의 용이성,O,정적분석,,
2,자막 제공,인식의 용이성,-,정적분석,,
3,표의 구성,인식의 용이성,O,정적분석,,
4,색에 무관한 인식,인식의 용이성,-,정적분석,,
5,음성 정보 제공,인식의 용이성,-,정적분석,,
6,색 구분,인식의 용이성,-,정적분석,,
7,자동 재생,인식의 용이성,O,정적분석,,
8,명도 대비,인식의 용이성,O,Playwright,,
9,콘텐츠 구분,인식의 용이성,-,정적분석,,
10,키보드 사용,운용의 용이성,X,Playwright,"Tab 포커스 이동 시 일부 요소 미접근","인터랙티브 요소에 tabindex=0 및 :focus 스타일 추가"
11,초점 이동,운용의 용이성,O,정적분석,,
12,조작 가능,운용의 용이성,-,정적분석,,
13,문자 단축키,운용의 용이성,-,정적분석,,
14,충분한 시간,운용의 용이성,-,정적분석,,
15,정지 기능,운용의 용이성,-,정적분석,,
16,깜박임,운용의 용이성,-,정적분석,,
17,반복 영역 건너뛰기,운용의 용이성,O,정적분석,,
18,제목 제공,운용의 용이성,O,정적분석,,
19,링크 텍스트,운용의 용이성,O,정적분석,,
20,참조 위치,운용의 용이성,-,정적분석,,
21,기기 독립적 사용,운용의 용이성,-,정적분석,,
22,포인터 입력 취소,운용의 용이성,O,정적분석,,
23,레이블과 네임,운용의 용이성,O,정적분석,,
24,움직임 기반 작동,운용의 용이성,-,정적분석,,
25,기본 언어 표시,이해의 용이성,O,정적분석,,
26,사용자 요구 실행,이해의 용이성,O,정적분석,,
27,도움 정보,이해의 용이성,-,정적분석,,
28,오류 정정,이해의 용이성,△,정적분석,"에러 메시지 포커스 이동 없음","폼 오류 시 에러 요소로 포커스 이동 추가"
29,레이블 제공,이해의 용이성,O,정적분석,,
30,오류 방지,이해의 용이성,-,정적분석,,
31,일관된 내비게이션,이해의 용이성,-,정적분석,,
32,마크업 오류,견고성,O,정적분석,,
33,웹 애플리케이션 접근성,견고성,△,Playwright,"클릭 후 aria-expanded 미변경","동적 컴포넌트에 aria-expanded 상태 관리 추가"
시맨틱-1,랜드마크 요소,시맨틱 HTML,O,정적분석,,
시맨틱-2,섹션 구조,시맨틱 HTML,O,정적분석,,
시맨틱-3,대화형 요소,시맨틱 HTML,O,정적분석,,
시맨틱-4,목록 구조,시맨틱 HTML,O,정적분석,,
시맨틱-5,표현용 태그,시맨틱 HTML,-,정적분석,,
시맨틱-6,폼 그룹,시맨틱 HTML,-,정적분석,,
시맨틱-7,기타 시맨틱 요소,시맨틱 HTML,-,정적분석,,
```
