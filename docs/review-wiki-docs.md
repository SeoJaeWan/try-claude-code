# Review Wiki Docs

Review Wiki Docs는 `~/.codex/reviewWiki`를 그대로 읽어 문서 사이트처럼 보여주는 로컬 서버다. 별도 docs 원본을 만들지 않고, 기존 `wiki/core/**`, `wiki/patterns/**`, `wiki/tags/**`, `raw/**`, `history/**`를 화면에 렌더링한다.

## 실행

```powershell
npm run review-wiki:docs -- --port 9788
```

다른 wiki root를 열어야 하면 아래처럼 지정한다.

```powershell
npm run review-wiki:docs -- --wiki-root C:\Users\USER\.codex\reviewWiki --port 9788
```

열리는 주소는 `http://localhost:9788`이다.

## 문서 흐름

- 홈은 핵심 정책, 최근 히스토리, 최근 피드백을 보여준다.
- `/core/*`, `/patterns/*`, `/raw/*`, `/tags/*`는 기존 markdown 파일에서 자동으로 생성된다.
- `/history`, `/history/ingest`, `/history/feedback`은 `history/**/*.json`을 읽는다.
- `/feedback`은 `feedback/**/*.json`의 상태별 기록을 읽는다.
- 좌측 검색은 title, summary, tags, source path, 본문 텍스트를 대상으로 한다.

## 피드백 흐름

문서 본문에서 텍스트를 드래그하면 피드백 입력창이 뜬다. 저장하면 `feedback/inbox/*.json`에 아래 계약에 맞는 파일이 생긴다.

- `source_path`: 원본 wiki markdown 경로
- `doc_url`: 문서 화면 URL
- `selection.quote`: 선택한 원문
- `selection.prefix`, `selection.suffix`: 재매칭용 주변 문맥
- `feedback.type`, `feedback.comment`: 사람이 남긴 피드백

이후 `review-wiki-apply-feedback` 스킬이 inbox JSON을 읽어 원본 wiki 문서를 수정하고, 처리 결과를 outcome 폴더와 `history/YYYY/MM/*.json`에 남긴다.

## 원칙

- docs 화면은 source of truth가 아니다.
- wiki 문서가 추가, 삭제, 수정되면 서버가 다음 요청에서 다시 읽어 자동 반영한다.
- tag page와 raw evidence 연결은 원본 wiki 링크 구조를 따른다.
