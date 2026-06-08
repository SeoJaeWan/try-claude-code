---
name: tech-note
description: "Turn technical or functional conversations with Codex into source-backed Korean Markdown technical notes or blog drafts, with a 4:3 thumbnail and optional explanatory images. Use when the user asks to document a conversation, preserve technical reasoning, write a tech note, create a blog-style draft, add sources, generate a thumbnail, or make explanatory images. Korean triggers include '기술 노트', '문서화해줘', '대화 정리해줘', '출처 붙여서 정리해줘', '블로그 초안', '썸네일도 만들어줘'."
---

# tech-note

## Purpose

Turn a technical conversation into a durable Korean Markdown note with verified sources, the user's explanatory blog tone, and helpful generated visuals.

## Required References

Read only the references needed for the current request:

- `references/writing-style.md` for Korean prose style and structure.
- `references/source-policy.md` when the note includes technical claims, version-sensitive behavior, standards, APIs, libraries, or web platform details.
- `references/image-policy.md` when creating a thumbnail or explanatory image.
- `references/templates.md` when drafting the final Markdown or image prompts.

## Mode Selection

- If the user asks to "review", "검토", "구체화", or "설계" the idea, produce a concise proposal and do not create files unless explicitly requested.
- If the user asks to "write", "문서화", "정리", "저장", "초안", or gives a destination file, create or update the Markdown note.
- If the user asks for images, or does not decline images for a blog-style note, include a 4:3 thumbnail plan and generate it when image generation is available.

## Workflow

1. Extract the topic, concrete situation, user-facing question, conclusion candidates, unresolved assumptions, and any claims that need sources.
2. Separate verified facts, conversation-based inference, and practical judgment before writing.
3. Choose the output destination:
   - Use the user's requested path when provided.
   - Otherwise, in this repository prefer `docs/tech-notes/{slug}.md`.
   - Store note images under `docs/tech-notes/assets/{slug}/`.
4. Verify source-backed claims before drafting. Prefer official docs, standards, MDN, RFCs, and primary project documentation.
5. Draft the note in Korean Markdown using the writing style reference.
6. Create one 4:3 thumbnail for blog-style notes unless the user explicitly declines images.
7. Add explanatory images only when they clarify a process, comparison, architecture, scope, or mental model.
8. Reference generated images from Markdown with relative paths.
9. End the note with `## 출처`, listing the sources actually used.
10. Run a final pass for unsupported claims, stale/version-sensitive claims, broken image paths, and prose that sounds unlike the user's style.

## Guardrails

- Do NOT invent sources.
- Do NOT hide uncertainty; mark unsourced reasoning as practical judgment or conversation-based inference.
- Do NOT put important labels as text inside generated images when Markdown captions can carry them.
- Do NOT generate decorative-only images.
- Do NOT overwrite an existing note or asset unless the user asked for replacement; create a versioned filename instead.
