# Style Guide

HTML 슬라이드 생성 시 사용하는 CSS 클래스 및 컴포넌트 참조.

## 슬라이드 타입별 클래스

```css
.slide              /* 기본 슬라이드 */
.slide.cover        /* 표지: 중앙 정렬, 그라데이션 배경 */
.slide.section      /* 섹션 구분: Part 1, Part 2, 인터미션 */
.slide.section.part1      /* Part 1 헤더 (파란 그라데이션) */
.slide.section.part2      /* Part 2 헤더 (초록 그라데이션) */
.slide.section.intermission /* 인터미션 (노랑 그라데이션) */
```

## 레이아웃 클래스

```css
.two-col           /* 2열 그리드 (gap: 30px) */
.col               /* 열 컨테이너 */
.slide-header      /* 슬라이드 상단 헤더 영역 */
.lesson-num        /* "Lesson 01" 작은 라벨 */
```

## 콘텐츠 컴포넌트

### 학습 목표
```html
<div class="objectives">
  <div class="objective">
    <span>✓</span>
    <span class="objective-text">목표 내용</span>
  </div>
</div>
```

### 코드 블록
```html
<div class="code-block">
  <div class="code-header">
    <div class="dots">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    파일명.js
  </div>
  <div class="code-content">
    <pre><code class="language-javascript">코드</code></pre>
  </div>
</div>
```

### 팁 박스
```html
<div class="tip-box tip|good|bad|warning">
  <div class="tip-title">제목</div>
  <div class="tip-content">내용</div>
</div>
```

### 테이블
```html
<table>
  <tr><th>헤더1</th><th>헤더2</th></tr>
  <tr><td>데이터1</td><td>데이터2</td></tr>
</table>
```

### 태그
```html
<div class="tags">
  <span class="tag">태그1</span>
  <span class="tag">태그2</span>
</div>
```

### 메타 정보 그리드
```html
<div class="meta-grid">
  <div class="meta-item">
    <div class="meta-label">라벨</div>
    <div class="meta-value">값</div>
  </div>
</div>
```

### 목차
```html
<div class="toc-grid">
  <div class="toc-section">
    <h3>PART 1: 제목</h3>
    <div class="toc-item">
      <span class="toc-num">1</span> 항목명
    </div>
  </div>
  <div class="toc-section part2">
    <h3>PART 2: 제목</h3>
    ...
  </div>
</div>
```

### 퀴즈 그리드
```html
<div class="quiz-grid">
  <div class="quiz-item">
    <h4>퀴즈 1</h4>
    <p>문제 설명</p>
    <!-- 코드 블록 또는 선택지 -->
  </div>
</div>
```

### 정답 박스
```html
<div class="answers-box">
  <h3>📝 정답</h3>
  <div class="answers-grid">
    <div class="answer-item">
      <div class="label">퀴즈 1</div>
      <div class="value">정답</div>
    </div>
  </div>
</div>
```

### 요약 그리드
```html
<div class="summary-grid">
  <div class="summary-item">
    <h4>주제</h4>
    <p>설명</p>
  </div>
</div>
```

### 큐/기능 그리드
```html
<div class="queue-grid">
  <div class="queue-item enqueue|dequeue|peek|isEmpty">
    <div class="queue-name">함수명</div>
    <div class="queue-desc">설명</div>
  </div>
</div>
```

## 네비게이션 구조

```html
<!-- 진행 바 -->
<div class="progress-bar" id="progressBar"></div>

<!-- 네비게이션 컨트롤 -->
<div class="nav-controls">
  <button class="nav-btn" id="prevBtn" onclick="prev()">←</button>
  <div class="slide-counter">
    <span class="current" id="cur">1</span> / <span id="total">N</span>
  </div>
  <button class="nav-btn" id="nextBtn" onclick="next()">→</button>
</div>

<!-- 키보드 힌트 -->
<div class="keyboard-hint">
  <kbd>←</kbd> <kbd>→</kbd> 또는 <kbd>Space</kbd>
</div>
```

## 필수 외부 라이브러리

```html
<!-- Pretendard 폰트 -->
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">

<!-- 코드 하이라이팅 -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
```

## JavaScript 필수 코드

```javascript
hljs.highlightAll();
let cur = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;
document.getElementById('total').textContent = total;

function show(i) {
  slides.forEach(s => s.classList.remove('active'));
  slides[i].classList.add('active');
  document.getElementById('cur').textContent = i + 1;
  document.getElementById('progressBar').style.width = ((i + 1) / total * 100) + '%';
  document.getElementById('prevBtn').disabled = i === 0;
  document.getElementById('nextBtn').disabled = i === total - 1;
}
function next() { if (cur < total - 1) show(++cur); }
function prev() { if (cur > 0) show(--cur); }

// 키보드 이벤트
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
});

// 터치 스와이프
let tx = 0;
document.addEventListener('touchstart', e => tx = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
  const diff = tx - e.changedTouches[0].screenX;
  if (diff > 50) next();
  else if (diff < -50) prev();
});

show(0);
```
