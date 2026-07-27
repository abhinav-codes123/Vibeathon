# FlowDine AI — Vibeathon 6.0 official submission

## Final outputs

- `FlowDine_AI_Vibeathon_Official_Submission.pptx` — editable six-slide PowerPoint based on the official template
- `FlowDine_AI_Vibeathon_Official_Submission.pdf` — visually verified six-page PDF
- `FlowDine_AI_Presentation_Content.md` — final visible slide content and claim boundaries
- `FlowDine_AI_Speaker_Notes.md` — complete three-to-four-minute pitch notes
- `assets/screenshots/` — fresh 1440×900 customer-side browser captures

## Inputs

- Official template: `/Users/mac/Downloads/Vibeathon_6.0_Vibecoding_Hackathon_July_2026_Idea_Submission_Template.pptx`
- Previous official-template deck: `/Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/FlowDine_AI_Official_Template_Submission.pptx`
- Previous detailed deck: `/Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/FlowDine_AI_Pitch_Deck.pptx`
- Problem statement: `/Users/mac/Desktop/Codex_Projects/Vibeathon/Vibeathon_6.0_PS.pdf`

Source backups are stored in `presentation/backups/`.

## Screenshot capture

Start the deterministic local QA server:

```bash
FLOWDINE_LOCAL=1 \
PATH="/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH" \
/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm dev:test
```

Reset the local seed state before capture:

```bash
curl -fsS -X POST http://127.0.0.1:3001/api/test/reset \
  -H 'x-flowdine-test-secret: flowdine-local-qa-secret'
```

The fresh customer menu, reservation, queue, and home screens were captured with the Codex in-app Browser at an explicit 1440×900 viewport. Protected staff routes require test-role request headers, which the in-app browser capture surface does not expose; the deck therefore reuses the repository’s existing verified real KDS, waiter, and manager captures instead of fabricating replacements.

## Generate the PPTX

The generator uses the official template as its base and preserves the master, six-slide order, titles, branding, bullet markers, and editable text.

```bash
node /Users/mac/.codex/plugins/cache/openai-primary-runtime/presentations/26.723.12215/skills/presentations/container_tools/setup_artifact_tool_workspace.mjs \
  --workspace /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/submission_build

/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/submission_build/generate_submission.mjs
```

## Inspect and render

```bash
/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/mac/.codex/plugins/cache/openai-primary-runtime/presentations/26.723.12215/skills/presentations/template_following_scripts/inspect_template_deck.mjs \
  --workspace /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/submission_build \
  --pptx /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/FlowDine_AI_Vibeathon_Official_Submission.pptx \
  --out-dir final-inspect \
  --scale 1.5
```

## Export the verified PDF

After inspection produces the six verified slide PNGs:

```bash
/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/submission_build/export_verified_pdf.py
```

The PDF is built from the inspected slide renders because LibreOffice on this machine substitutes template fonts and can omit some imported media. The PPTX remains fully editable; only the submission PDF is rasterized for visual fidelity.

## Validate

```bash
unzip -t /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/FlowDine_AI_Vibeathon_Official_Submission.pptx

/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdfinfo \
  /Users/mac/Desktop/Codex_Projects/Vibeathon/presentation/FlowDine_AI_Vibeathon_Official_Submission.pdf
```

## Missing team information

Replace these four clean placeholders on slide 1 before final submission:

- `[TEAM NAME]`
- `[TEAM LEADER]`
- `[COLLEGE]`
- `[YEAR — DEPARTMENT]`

No public GitHub repository was verified, so the deck intentionally does not display a GitHub link or QR code.
