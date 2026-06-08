# Image Policy

## Default Assets

- Create one thumbnail for blog-style notes unless the user explicitly declines images.
- Use a 4:3 ratio. Prefer `1600x1200` or `1200x900` when the tool supports size control.
- Save the thumbnail as `thumbnail.png` under the note asset directory.
- Use relative Markdown paths from the note to the asset.

## Thumbnail Direction

- Make the thumbnail communicate the article's core idea, not a generic developer mood.
- Prefer clean technical blog visuals: browser windows, request paths, cache layers, data flow, UI states, abstract but concrete system metaphors.
- Avoid text in the image. Put title and labels in Markdown instead.
- Avoid logos unless the user asks and usage is appropriate.
- Avoid dark, vague, decorative-only backgrounds.

## Explanatory Images

Generate explanatory images only when they clarify:

- request/response flow
- cache or render pipeline
- client/server responsibility
- comparison between approaches
- architecture or ownership boundaries
- mental model that would be hard to explain with prose alone

For exact technical diagrams with important labels, prefer Markdown diagrams, Mermaid, SVG, or code-native diagrams when available. If using a generated raster image, keep labels outside the image in captions or nearby prose.

## Image Generation Workflow

- Use the image generation capability when available. If a separate image generation skill or tool is available, follow its workflow.
- Treat generated images as project-bound assets when they are referenced by the Markdown note.
- Move or copy final images into the note asset directory before referencing them.
- Validate that the image matches the topic, has the intended 4:3 framing, contains no broken/garbled text, and is not merely decorative.
- If image generation is unavailable, include a ready-to-run image prompt in the note draft or final response and mark image creation as blocked.

## File Naming

- `thumbnail.png` for the top image.
- `{concept}-flow.png` for process visuals.
- `{topic}-comparison.png` for comparison visuals.
- `{concept}-model.png` for mental-model visuals.

Do NOT overwrite existing images unless the user asked for replacement.
