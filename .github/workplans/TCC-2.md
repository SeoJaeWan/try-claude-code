---
schema_version: 1
jira_key: "TCC-2"
jira_url: "https://seojaewan.atlassian.net/browse/TCC-2"
jira_revision: "10010:2026-08-05T12:01:00.360+0900"
generated_at: "2026-08-05T03:02:35.238Z"
generator_model: "qwen3.5:9b-q4_K_M"
---

# TCC-2 — jira.seojaewan.com 등록 화면 동작 확인

> 이 문서는 Jira와 Local Work Memory를 바탕으로 생성된 개발 workplan입니다.
> 최종 요구사항은 연결된 Jira issue를 기준으로 확인합니다.

## 목적

jira.seojaewan.com 등록 화면 동작 확인 및 LLM-6 이슈 JIRA 등록 워크플로우 검증

## Jira 요약

LLM-6 구현을 위한 jira.seojaewan.com 신규 도메인 구축, 프로젝트 매핑 선택 기능, 본문 작성 플로우 구현 후 실제 JIRA 이슈 생성 테스트 수행

## 예상 변경 범위

- control.seojaewan.com 외에 jira.seojaewan.com이라는 새로운 페이지(도메인)를 추가한다.
- jira에 이슈 등록을 위한 전용 플로우 (프로젝트 선택 및 본문 입력) 를 만든다.

## 구현 순서

1. LLM-6 JIRA 이슈 상세 요구사항 분석
2. 새로운 도메인 jira.seojaewan.com 의 기본 구조 설정
3. JIRA API 연동 코드 구현 (프로젝트 매핑, 본문 작성)
4. 등록 화면 UI/UX 구성 및 테스트 환경 배포
5. TCC-2 에서 정의된 동작 확인을 위한 실제 등록 시나리오 실행
6. LLM-6 이슈가 정상적으로 Jira 에 생성되었는지 검증 후 PR 제출

## Acceptance

- jira.seojaewan.com 도메인이 신규로 생성되고 접근 가능해야 한다.
- 프로젝트 매핑 목록에서 원하는 프로젝트를 선택할 수 있어야 한다.
- 본문을 작성하고 등록 버튼을 누르면 해당 내용이 JIRA 이슈로 정상적으로 생성되어야 한다.
- LLM-6 관련 workplan PR 이 성공적으로 머지되거나 폐기될 수 있도록 검증 절차가 완료되어야 한다.

## 주의점과 확인할 사항

- TCC-2 에서 언급된 '확인이 끝나면 지운다'는 내용으로 인해, 테스트 후 해당 도메인 및 코드가 즉시 제거되는 경우 변경 사항이 최종 결과물에 포함되지 않을 위험.
- LLM-6 이슈의 구체적인 API 엔드포인트나 인증 방식 등 기술적 세부사항이 Jira 페이지 설명에 명시되어 있지 않아 추후 구현 시 추가 조사가 필요할 수 있음.

## 관련 Local Work Memory

- [구조 지도](https://control.seojaewan.com/memory/baea247f925cc323ee4283843877fd8b64c3a67a8d5764de238a50a2bd7efe2d) — 시스템의 전체적인 구조와 워크플로우를 이해하는 데 참고.

## 원문

- Jira: https://seojaewan.atlassian.net/browse/TCC-2
