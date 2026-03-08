# skill-creator Windows 인코딩 수정 제안

## 문제

`skill-creator` 플러그인의 `generate_review.py`와 `aggregate_benchmark.py`에서 파일 I/O 시 `encoding="utf-8"`을 명시하지 않아, Windows 환경(기본 인코딩: cp949)에서 비ASCII 문자(한국어, 일본어 등)가 포함된 eval 데이터를 처리할 때 `UnicodeDecodeError`가 발생한다.

```
UnicodeDecodeError: 'cp949' codec can't decode byte 0xec in position 71: illegal multibyte sequence
```

## 영향 범위

- **eval-viewer/generate_review.py** — 9개 지점
- **scripts/aggregate_benchmark.py** — 5개 지점
- **총 14개 지점**에서 인코딩 미지정

## 재현 조건

1. Windows (한국어 로케일)
2. `eval_metadata.json`에 비ASCII 프롬프트 포함 (예: `"이 프로젝트에 try-claude를 초기화해줘"`)
3. `generate_review.py` 또는 `aggregate_benchmark.py` 실행

## 수정 내용

### eval-viewer/generate_review.py

| 라인 | 현재 코드 | 수정 코드 |
|------|----------|----------|
| 94 | `candidate.read_text()` | `candidate.read_text(encoding="utf-8")` |
| 107 | `candidate.read_text()` | `candidate.read_text(encoding="utf-8")` |
| 134 | `candidate.read_text()` | `candidate.read_text(encoding="utf-8")` |
| 225 | `feedback_path.read_text()` | `feedback_path.read_text(encoding="utf-8")` |
| 258 | `template_path.read_text()` | `template_path.read_text(encoding="utf-8")` |
| 339 | `self.benchmark_path.read_text()` | `self.benchmark_path.read_text(encoding="utf-8")` |
| 369 | `self.feedback_path.write_text(...)` | `self.feedback_path.write_text(..., encoding="utf-8")` |
| 427 | `benchmark_path.read_text()` | `benchmark_path.read_text(encoding="utf-8")` |
| 434 | `args.static.write_text(html)` | `args.static.write_text(html, encoding="utf-8")` |

### scripts/aggregate_benchmark.py

| 라인 | 현재 코드 | 수정 코드 |
|------|----------|----------|
| 90 | `open(metadata_path)` | `open(metadata_path, encoding="utf-8")` |
| 120 | `open(grading_file)` | `open(grading_file, encoding="utf-8")` |
| 142 | `open(timing_file)` | `open(timing_file, encoding="utf-8")` |
| 377 | `open(output_json, "w")` | `open(output_json, "w", encoding="utf-8")` |
| 383 | `open(output_md, "w")` | `open(output_md, "w", encoding="utf-8")` |

## 왜 이 수정이 필요한가

Python의 `open()`과 `Path.read_text()`는 인코딩을 명시하지 않으면 `locale.getpreferredencoding()`을 사용한다. macOS/Linux에서는 기본이 UTF-8이라 문제가 없지만, Windows에서는 시스템 로케일에 따라 cp949(한국), shift_jis(일본), gbk(중국) 등이 기본값이 된다.

skill-creator의 데이터 파일(JSON, Markdown)은 모두 UTF-8로 작성되므로, `encoding="utf-8"`을 명시적으로 지정하는 것이 올바른 접근이다.

## 기존 관련 이슈/PR (anthropics/skills)

레포: https://github.com/anthropics/skills

| # | 제목 | 상태 | 범위 |
|---|------|------|------|
| #255 | Specify UTF-8 encoding when reading skill_md | Open PR | SKILL.md 읽기 |
| #284 | Fix(skill-creator): specify utf-8 encoding when reading SKILL.md | Open PR | SKILL.md 읽기 |
| #224 | Set the default encoding to utf8 when skill initialization | Open PR | 스킬 초기화 |
| #187 | Fix GBK encoding issues on Windows | Closed (merged) | Windows GBK 인코딩 |

**기존 PR들과의 차이점**: 위 PR들은 SKILL.md 읽기 또는 스킬 초기화 시점의 인코딩만 다룬다. 본 문서가 다루는 14개 지점은 **skill-creator의 eval 파이프라인** (`generate_review.py` 9개, `aggregate_benchmark.py` 5개)으로, 기존 PR과 중복되지 않는 별도 수정 범위이다.

## 기여 방법

이 수정은 [anthropics/skills](https://github.com/anthropics/skills) 레포에 PR로 제출할 수 있다.

```bash
# 1. 레포 포크 및 클론
gh repo fork anthropics/skills --clone

# 2. 브랜치 생성
git checkout -b fix/skill-creator-eval-utf8-encoding

# 3. 위 테이블의 14개 지점 수정
# - skills/skill-creator/eval-viewer/generate_review.py (9개)
# - skills/skill-creator/scripts/aggregate_benchmark.py (5개)

# 4. PR 제출
gh pr create \
  --title "fix(skill-creator): add UTF-8 encoding to eval pipeline for Windows" \
  --body "Fixes UnicodeDecodeError in generate_review.py and aggregate_benchmark.py on Windows when eval_metadata.json contains non-ASCII characters (Korean, Japanese, Chinese, etc.). Related: #255, #284, #224, #187"
```

## 로컬 임시 해결

PR이 머지되기 전까지 로컬에서 해결하는 방법:

```python
# run_viewer.py — UTF-8 monkey-patch wrapper
import pathlib

_original = pathlib.Path.read_text
def _utf8(self, encoding=None, errors=None):
    return _original(self, encoding=encoding or "utf-8", errors=errors or "replace")
pathlib.Path.read_text = _utf8

# 이후 generate_review.py import 및 실행
```

또는 플러그인 캐시의 소스 파일을 직접 수정할 수 있다:
```
~/.claude/plugins/cache/anthropic-agent-skills/example-skills/<hash>/skills/skill-creator/
```
단, 플러그인 업데이트 시 덮어씌워질 수 있다.
