// dev-review 코멘트 타입 어휘.
//
// 리뷰어가 브라우저 UI에서 부착할 수 있는 액션 가능한 세 가지 코멘트 타입의
// 단일 진실 공급원(SSOT)이다. 다음 위치에서 공유한다:
//
//   - server.mjs            — 요청 검증, dispatch_agent 규칙, submit 시점 가드.
//   - assets/index.html     — 옵션 라벨, CSS 클래스명, 배지 텍스트
//                              (브라우저는 raw 문자열을 그대로 사용한다. 값이
//                              CSS 클래스 조각과 HTTP 페이로드 포맷을 겸하기
//                              때문이다.)
//   - SKILL.md / references — 문서에서 동일 문자열 값을 참조한다.
//
// 리터럴 값을 index.html과 스키마 문서와 동기화해서 유지할 것. 값을 변경하면
// 저장된 feedback.json 파일에 대해 breaking change가 된다.
//
// "neutral comment"가 없는 이유: 모든 코멘트는 액션 가능하거나
// (needs-change, question) 기록만 되고 무시되는 것(out-of-scope) 둘 중 하나다.
// 단순 메모는 이 워크플로에 자리가 없다 — review-data-schema.md 참고.

export const COMMENT_TYPE = Object.freeze({
  NEEDS_CHANGE: "needs-change",
  QUESTION: "question",
  OUT_OF_SCOPE: "out-of-scope",
});

export const COMMENT_TYPE_VALUES = new Set(Object.values(COMMENT_TYPE));

// "type must be …" 형식 에러 메시지에 사용할 사람이 읽기 좋은 열거형.
// 새 타입을 추가했을 때 값 목록과 자동 동기화되도록 여기에 둔다.
export const COMMENT_TYPE_LIST_TEXT = Object.values(COMMENT_TYPE).join(" | ");
