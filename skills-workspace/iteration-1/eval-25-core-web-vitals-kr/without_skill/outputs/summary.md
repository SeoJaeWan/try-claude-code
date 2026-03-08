# core-web-vitals 평가 (Korean prompt, without_skill)

## 결과
변경된 코드는 Node.js 개발 도구(CLI 코드 생성기, 에이전트 정의, eval 프레임워크)
브라우저에서 실행되지 않으며 프로덕션 번들에 포함되지 않음

- LCP: 영향 없음 - 이미지, 폰트, CSS, 서버 응답 시간 변경 없음
- INP: 영향 없음 - 이벤트 핸들러나 메인스레드 블로킹 코드 없음
- CLS: 직접 영향 없음, 다만 생성된 컴포넌트 템플릿이 CLS에 간접 기여 가능
