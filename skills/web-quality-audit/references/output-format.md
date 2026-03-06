# Output Format Reference

Unified HTML + CSV report templates for web quality audit results (5 areas).

---

## HTML Report Template

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>웹 품질 종합 감사 리포트 — {YYYY-MM-DD}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    h1 { font-size: 1.6rem; margin-bottom: 8px; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 28px; }
    .playwright-badge { background: #4a90d9; color: #fff; font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; }

    /* 종합 요약 */
    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 32px; }
    .summary-card { border-radius: 6px; padding: 14px; text-align: center; color: #fff; }
    .summary-card .area { font-size: 0.75rem; font-weight: 600; margin-bottom: 6px; }
    .summary-card .score { font-size: 1.5rem; font-weight: 700; }
    .card-a11y { background: #6c8ebf; }
    .card-bp { background: #82c882; }
    .card-seo { background: #f0a830; }
    .card-perf { background: #e05c5c; }
    .card-cwv { background: #9b59b6; }

    /* 섹션 */
    .section { margin-bottom: 36px; }
    .section-header { padding: 12px 16px; border-radius: 6px 6px 0 0; color: #fff; font-weight: 700; font-size: 1rem; }
    .header-a11y { background: #6c8ebf; }
    .header-bp { background: #82c882; }
    .header-seo { background: #f0a830; }
    .header-perf { background: #e05c5c; }
    .header-cwv { background: #9b59b6; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #f9f9f9; font-size: 0.8rem; padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 0.85rem; vertical-align: top; }
    tr:last-child td { border-bottom: none; }

    /* 판정 배지 */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: 700; font-size: 0.8rem; }
    .badge-pass { background: #e6f4ea; color: #1e7e34; }
    .badge-fail { background: #fdecea; color: #c62828; }
    .badge-partial { background: #fff8e1; color: #f57c00; }
    .badge-na { background: #f5f5f5; color: #777; }
    .badge-unknown { background: #e8f0fe; color: #1a56db; }

    /* 수정 가이드 */
    .fix-guide { margin-top: 32px; }
    .fix-item { background: #fff8e1; border-left: 4px solid #f0a830; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 4px 4px 0; }
    .fix-item .fix-title { font-weight: 600; margin-bottom: 6px; }
    .fix-item code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.82rem; }
  </style>
</head>
<body>
<div class="container">
  <h1>웹 품질 종합 감사 리포트</h1>
  <div class="meta">
    날짜: {YYYY-MM-DD} &nbsp;|&nbsp;
    검토 파일: {파일 목록} &nbsp;|&nbsp;
    기준: KWCAG2.2 + Best Practices + SEO + Performance + Core Web Vitals &nbsp;|&nbsp;
    Playwright: {사용됨 / 미사용 — playwright.config.ts 없음}
  </div>

  <!-- 종합 요약 -->
  <div class="summary-grid">
    <div class="summary-card card-a11y">
      <div class="area">접근성</div>
      <div class="score">{통과수}/{전체수}</div>
    </div>
    <div class="summary-card card-bp">
      <div class="area">Best Practices</div>
      <div class="score">{통과수}/{전체수}</div>
    </div>
    <div class="summary-card card-seo">
      <div class="area">SEO</div>
      <div class="score">{통과수}/{전체수}</div>
    </div>
    <div class="summary-card card-perf">
      <div class="area">Performance</div>
      <div class="score">{통과수}/{전체수}</div>
    </div>
    <div class="summary-card card-cwv">
      <div class="area">Core Web Vitals</div>
      <div class="score">{통과수}/{전체수}</div>
    </div>
  </div>

  <!-- 섹션 A: 접근성 -->
  <div class="section">
    <div class="section-header header-a11y">A. 접근성 (KWCAG2.2 33항목)</div>
    <table>
      <tr><th>번호</th><th>항목명</th><th>결과</th><th>판정방식</th><th>발견된 문제</th></tr>
      <!-- accessibility-review 스킬 위임 결과 33행 삽입 -->
    </table>
  </div>

  <!-- 섹션 B: Best Practices -->
  <div class="section">
    <div class="section-header header-bp">B. Best Practices</div>
    <table>
      <tr><th>코드</th><th>영역</th><th>항목명</th><th>결과</th><th>발견된 문제</th></tr>
      <!-- BP-01 ~ BP-14 rows -->
    </table>
  </div>

  <!-- 섹션 C: SEO -->
  <div class="section">
    <div class="section-header header-seo">C. SEO</div>
    <table>
      <tr><th>코드</th><th>우선순위</th><th>항목명</th><th>결과</th><th>발견된 문제</th></tr>
      <!-- SEO-01 ~ SEO-10 rows -->
    </table>
  </div>

  <!-- 섹션 D: Performance -->
  <div class="section">
    <div class="section-header header-perf">D. Performance</div>
    <table>
      <tr><th>코드</th><th>영역</th><th>항목명</th><th>결과</th><th>발견된 문제</th></tr>
      <!-- PERF-01 ~ PERF-09 rows -->
    </table>
  </div>

  <!-- 섹션 E: Core Web Vitals -->
  <div class="section">
    <div class="section-header header-cwv">E. Core Web Vitals</div>
    <table>
      <tr><th>코드</th><th>지표</th><th>항목명</th><th>결과</th><th>발견된 문제</th></tr>
      <!-- CWV-01 ~ CWV-09 rows -->
    </table>
  </div>

  <!-- 수정 가이드 (X 항목만) -->
  <div class="fix-guide">
    <h2 style="margin-bottom:16px;">수정 가이드</h2>
    <div class="fix-item">
      <div class="fix-title">{코드}: {항목명}</div>
      <p>{구체적인 수정 가이드} <code>{코드 예시}</code></p>
    </div>
    <!-- X 항목마다 fix-item 블록 추가 -->
  </div>

</div>
</body>
</html>
```

---

## CSV Report Template

```csv
영역,코드,항목명,결과,판정방식,발견된 문제,수정 가이드
접근성,A-01,대체 텍스트,O,정적분석,,
접근성,A-08,명도 대비,X,Playwright,"#nav .link 대비 3.2:1 (기준 4.5:1)","색상을 #595959로 변경"
접근성,A-10,키보드 접근성,O,Playwright,,
접근성,A-33,동적 ARIA,O,Playwright,,
Best Practices,BP-01,HTTPS / mixed content 없음,O,정적분석,,
Best Practices,BP-03,CSP 헤더,X,정적분석,Content-Security-Policy 미설정,meta 또는 헤더에 CSP 추가
SEO,SEO-05,meta description,X,정적분석,meta description 없음,"<meta name=""description"" content=""...""> 추가"
Performance,PERF-01,render-blocking script,X,정적분석,defer 없는 script 태그,script 태그에 defer 추가
Core Web Vitals,CWV-02,fetchpriority="high",X,정적분석,LCP 이미지에 속성 없음,히어로 이미지에 fetchpriority="high" 추가
```
