# 🎨 Design Tokens

> [!NOTE]
> Preserved from the original `packing/` prototype's `Neumorphic.module.css` before that scaffold was discarded and rebuilt from scratch (see [System_Overview.md](./System_Overview.md)). This is the source of truth for the palette used in [Design_Mockups](../../Design_Mockups/) and should be re-implemented as-is in the fresh frontend build.

---

## Style

**Neumorphism + Glassmorphism** — soft, embossed cards on a light bluish-gray background, pressed-in (inset) inputs, frosted-glass blur, no flat/hard-edged material-design look.

## Color tokens

| Token | Value | Use |
|---|---|---|
| `--neu-bg` | `#e6ebf1` | Base card/page background |
| `--neu-bg-light` | `#ffffff` | Light side of raised shadows, highlights |
| `--neu-bg-dark` | `#c6ccd6` | Dark side of raised shadows, inset shadows |
| `--neu-text` | `#3a4250` | Primary text (headings, labels) |
| `--neu-text-muted` | `#7b8698` | Secondary/muted text, placeholders |
| `--neu-accent` | `#4f7df3` | Primary actions, focus rings |
| `--neu-accent-dark` | `#3d63d1` | Gradient partner for primary buttons, hover/active states |
| `--neu-error` | `#e2483a` | Error text/icons |

## Shape & shadow rules

- Page background: `linear-gradient(145deg, #eef2f7, #dde3ec)`.
- Cards: large rounded corners (~28px), `backdrop-filter: blur(12px)`, subtle white border (`rgba(255,255,255,0.35)`), soft dual box-shadow that reads as *raised* — light shadow top-left, dark shadow bottom-right, plus a faint inset highlight/shadow pair for the glass edge.
- Inputs and secondary panels: rounded ~16px, **inset** (pressed-in) box-shadow using `--neu-bg-dark` / `--neu-bg-light` — the opposite direction from cards, so they read as sunken rather than raised.
- Primary buttons: `linear-gradient(145deg, var(--neu-accent), var(--neu-accent-dark))`, white bold letter-spaced text, raised shadow at rest, inset shadow + slight downward translate on `:active` (press feedback).
- Transitions: short (0.12–0.2s ease) on shadow/transform changes — the "give" is part of the feel, don't skip it.

## Where this shows up

Used throughout [Design_Mockups](../../Design_Mockups/) (QR handoff, phone AI review, delivery note final review) — those images are the visual reference for how these tokens compose into full screens.
