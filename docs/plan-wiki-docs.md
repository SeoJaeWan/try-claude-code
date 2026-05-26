# Plan Wiki Docs

Plan Wiki Docs는 프로젝트 로컬 clone인 `./.codex/plan-wiki/source`를 문서 사이트처럼 보여주는 로컬 서버다. 별도 docs 원본을 만들지 않고, plan wiki repo의 `wiki/core/**`, `wiki/patterns/**`, `wiki/tags/**`, `raw/**`, `feedback/**`, `history/**`를 화면에 렌더링한다.

## 실행

먼저 plan wiki source를 준비한다.

```bash
node .codex/tools/stage-plan-wiki.mjs
```

문서 서버를 실행한다.

```bash
npm run plan-wiki:docs -- --port 9788
```

다른 source root를 열어야 하면 아래처럼 지정한다.

```bash
npm run plan-wiki:docs -- --source-root /path/to/plan-wiki --port 9788
```

`--wiki-root`는 기존 호출 호환용 alias로만 남긴다. 새 표준 옵션은 `--source-root`다.

열리는 주소는 `http://localhost:9788`이다.

## 문서 흐름

- 홈은 핵심 정책, 최근 히스토리, 최근 피드백을 보여준다.
- `/core/*`, `/patterns/*`, `/raw/*`, `/tags/*`는 source repo의 markdown 파일에서 자동으로 생성된다.
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

이후 `plan-wiki-apply-feedback` 스킬이 inbox JSON을 읽어 원본 wiki 문서를 수정하고, 처리 결과를 outcome 폴더와 `history/YYYY/MM/*.json`에 남긴다.

## Git 동기화

Docs UI나 plan wiki 관리 스킬이 만든 변경은 현재 프로젝트 repo가 아니라 nested source repo 변경이다.

```bash
git -C .codex/plan-wiki/source status --short
```

커밋과 푸시는 plan wiki 관리 스킬의 마지막 단계에서 사용자 승인 후 진행한다.

## 원칙

- docs 화면은 source of truth가 아니다.
- source of truth는 GitHub plan wiki repo와 그 project-local clone이다.
- planning skill은 `./.codex/plan-wiki/source/wiki`만 읽는다.
- 관리 skill과 docs server는 `./.codex/plan-wiki/source`를 읽고 쓴다.
- wiki 문서가 추가, 삭제, 수정되면 서버가 다음 요청에서 다시 읽어 자동 반영한다.
- tag page와 raw evidence 연결은 원본 wiki 링크 구조를 따른다.
