---
name: proofread-text
description: 'Proofread and copy-edit prose. Use when asked to proofread text, improve grammar, or tighten wording while preserving meaning and technical accuracy. Prefer direct in-editor edits and brief confirmations.'
argument-hint: 'Paste the text (or describe the selection) and desired tone.'
user-invocable: true
disable-model-invocation: false
---
# Proofread Text

## When to Use
- User asks to proofread text
- User asks for grammar, spelling, punctuation, or clarity fixes
- User asks for rewrite suggestions while keeping original meaning

## Input
The user provides a selection from a file open in the editor. If no selection is provided, stop with an error message. The user may also provide instructions on the desired tone or style.

## Output Behavior
- Default: apply obvious proofreading edits directly in the editor.
- After editing: return a brief confirmation in chat with the edited file location.
- Do not include a diff in chat unless the user explicitly asks for one.

## Procedure
0. Language: Even though existing text may use American English, British English preferred. 
1. Preserve intent:
Keep technical meaning, claims, and links unchanged unless clearly incorrect.
2. Fix correctness:
Fix spelling, grammar, punctuation, agreement, and obvious typos directly in the editor.
3. Improve readability:
Prefer concise sentences, remove repetition, and smooth transitions.
4. Keep style consistent:
Respect existing tone (formal/informal), terminology, and markup conventions.
5. Minimize edits:
Change only what improves quality; avoid unnecessary rewrites.
6. Validate formatting:
Preserve Markdown/MDX structure, code spans, links, and embedded HTML.
7. Suggest improvements:
If and only if the sentence's structure is so poor that it needs a major rewrite, do not change the file inside the editor but return a short explanation of the problem in the chat.
8. Confirm completion:
State that edits were applied directly in the editor and keep the message concise.

## Decision Points
- If text is technical documentation:
Prioritize precision over stylistic flair.
- If text contains code or API names:
Do not alter identifiers, selectors, or API casing.
- If text includes links or anchors:
Keep URLs and anchors unchanged unless asked to fix them.

## Quality Checks
- No meaning drift from source text
- No broken Markdown/MDX syntax
- Correct grammar and punctuation
- Fewer redundancies and clearer phrasing
- Output format matches user request

## Project Tone References
- `src/content/docs/basics`: [style-basics.md](style-basics.md)
- `src/content/docs/tips`: [style-tips.md](style-tips.md)
- `src/content/docs/fwvt`: [style-fwvt.md](style-fwvt.md)
- `src/content/docs/tools`: [style-tools.md](style-tools.md)

## Example Prompts
- /proofread-text: "Proofread this paragraph and keep the same tone."
- /proofread-text: "Proofread this selection directly in the editor."
- /proofread-text: "Fix grammar only; do not rewrite style."
