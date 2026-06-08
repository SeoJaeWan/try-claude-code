# Templates

## Markdown Note Template

```md
# {title}

![](./assets/{slug}/thumbnail.png)

{opening situation or question}

# 문제 상황

{what happened, what was discussed, or why this note exists}

# 왜 이런 일이 생겼을까?

{conceptual explanation}

# 핵심 개념

{break down important terms and mechanisms}

# 선택 기준

{trade-offs, when to use each option, and practical judgment}

# 주의할 점

{edge cases, version caveats, security/performance concerns}

# 정리

{short conclusion with the main rule of thumb}

## 출처

- [{source title}]({url})
```

## Short Conversation Capture Template

```md
# {title}

![](./assets/{slug}/thumbnail.png)

Codex와 이야기하면서 `{topic}`에 대해 이런 질문이 생겼습니다.

## 핵심 결론

{one or two paragraph conclusion}

## 판단 근거

{verified facts and project observations}

## 실무적으로 보면

{practical judgment and trade-offs}

## 출처

- [{source title}]({url})
```

## Thumbnail Prompt Template

```text
Use case: productivity-visual
Asset type: 4:3 technical blog thumbnail
Primary request: Create a clean conceptual thumbnail for a Korean technical blog post about {topic}.
Scene/backdrop: {concrete technical metaphor, such as browser requests, cache layers, server/client boundary, or UI component variants}
Style/medium: polished editorial tech illustration, crisp shapes, modern but restrained
Composition/framing: 4:3 landscape composition, clear focal point, generous safe margins
Lighting/mood: bright, clear, explanatory
Color palette: balanced, not dominated by a single hue
Text: no text
Constraints: no logos, no watermark, no readable UI text, no decorative-only abstract background
```

## Explanatory Image Prompt Template

```text
Use case: infographic-diagram
Asset type: explanatory image for a Markdown technical note
Primary request: Create a visual explanation of {process or comparison}.
Scene/backdrop: simplified technical system diagram without readable text
Style/medium: clean educational infographic illustration
Composition/framing: 4:3 or wide composition depending on document layout, clear separation between parts
Text: no text; labels will be added in Markdown captions
Constraints: no logos, no watermark, no tiny unreadable labels, no decorative-only elements
```
