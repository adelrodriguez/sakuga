---
"sakuga": patch
---

Improve error handling with informative, well-formatted error messages.

- Add comprehensive error handlers for all render command errors (file system, markdown parsing, theme, FFmpeg, validation)
- Include documentation links to Shiki languages/themes and FFmpeg installation
- Add CLI validation error handlers for unclustered flags and multiple values
- Use multi-line formatted messages with contextual details
