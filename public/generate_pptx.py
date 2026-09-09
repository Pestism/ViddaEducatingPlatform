from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import pptx.oxml.ns as nsmap
from lxml import etree

# ── helpers ──────────────────────────────────────────────────────────────────

def rgb(r, g, b): return RGBColor(r, g, b)

W, H = Inches(13.33), Inches(7.5)   # 16:9 widescreen

# colours
C_BG        = rgb(10,  15,  30)
C_ACCENT    = rgb(124, 58, 237)   # violet
C_BLUE      = rgb(37, 99, 235)
C_GREEN     = rgb(22, 163, 74)
C_AMBER     = rgb(217, 119,  6)
C_RED       = rgb(220, 38,  38)
C_TEAL      = rgb(8, 145, 178)
C_PINK      = rgb(190, 24,  93)
C_WHITE     = rgb(255,255,255)
C_LIGHT     = rgb(148,163,184)
C_DARK      = rgb(30, 41, 59)
C_VIOLET_LT = rgb(196,181,253)
C_GREEN_LT  = rgb(187,247,208)
C_BLUE_LT   = rgb(186,230,253)
C_AMBER_LT  = rgb(253,230,138)
C_RED_LT    = rgb(254,202,202)

def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, l, t, w, h, fill=None, line=None, line_w=Pt(1)):
    shape = slide.shapes.add_shape(1, l, t, w, h)  # MSO_SHAPE_TYPE.RECTANGLE=1
    shape.line.width = line_w
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if line:
        shape.line.color.rgb = line
    else:
        shape.line.fill.background()
    return shape

def add_label(slide, text, l, t, w, h, size=Pt(12), bold=False, color=C_WHITE,
              align=PP_ALIGN.LEFT, wrap=True):
    txb = slide.shapes.add_textbox(l, t, w, h)
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = size
    run.font.bold = bold
    run.font.color.rgb = color
    return txb

def add_card(slide, l, t, w, h, title, body_lines,
             border=C_ACCENT, title_bg=None, title_color=C_WHITE,
             body_color=C_LIGHT, body_size=Pt(10), title_size=Pt(12)):
    """Rounded card with title strip and bullet lines."""
    add_rect(slide, l, t, w, h, fill=rgb(15,23,42), line=border, line_w=Pt(1.5))
    strip_h = Inches(0.38)
    add_rect(slide, l, t, w, strip_h, fill=title_bg or border, line=None)
    add_label(slide, title, l+Inches(0.12), t+Inches(0.06), w-Inches(0.24), strip_h,
              size=title_size, bold=True, color=title_color, align=PP_ALIGN.LEFT)
    y = t + strip_h + Inches(0.1)
    line_h = Inches(0.22)
    for line in body_lines:
        add_label(slide, line, l+Inches(0.15), y, w-Inches(0.3), line_h,
                  size=body_size, color=body_color)
        y += line_h
    return y

def chip(slide, text, l, t, w, h, bg, fg=C_WHITE, size=Pt(9)):
    add_rect(slide, l, t, w, h, fill=bg, line=None)
    add_label(slide, text, l, t, w, h, size=size, bold=True, color=fg,
              align=PP_ALIGN.CENTER)

# ─────────────────────────────────────────────────────────────────────────────
prs = Presentation()
prs.slide_width  = W
prs.slide_height = H
blank = prs.slide_layouts[6]   # completely blank

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — TITLE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)

# Left panel
add_rect(sl, 0, 0, Inches(5.4), H, fill=rgb(18,10,50), line=None)
# Accent bar
add_rect(sl, Inches(5.4), 0, Inches(0.06), H, fill=C_ACCENT, line=None)

# Badge
add_rect(sl, Inches(0.45), Inches(0.5), Inches(0.9), Inches(0.9),
         fill=C_ACCENT, line=None)
add_label(sl, "🎓", Inches(0.45), Inches(0.5), Inches(0.9), Inches(0.9),
          size=Pt(32), align=PP_ALIGN.CENTER)

add_label(sl, "Vidda Solutions", Inches(0.45), Inches(1.7), Inches(4.8), Inches(0.6),
          size=Pt(40), bold=True, color=C_WHITE)
add_label(sl, "AI-Powered Compliance Training Generator",
          Inches(0.45), Inches(2.3), Inches(4.8), Inches(0.4),
          size=Pt(16), color=C_VIOLET_LT)

# Divider
add_rect(sl, Inches(0.45), Inches(2.8), Inches(3.2), Inches(0.05), fill=C_ACCENT, line=None)

add_label(sl, "Governing AI in Financial Crime Compliance\nwith AMLR 2024/1624",
          Inches(0.45), Inches(3.0), Inches(4.8), Inches(0.7),
          size=Pt(13), color=C_LIGHT, wrap=True)

# Problem pill
add_rect(sl, Inches(0.35), Inches(3.9), Inches(4.9), Inches(1.1),
         fill=rgb(26,5,5), line=C_RED, line_w=Pt(1.5))
add_label(sl, "THE PROBLEM", Inches(0.5), Inches(3.95), Inches(4.5), Inches(0.25),
          size=Pt(9), bold=True, color=C_RED)
add_label(sl, "AML compliance training is generic, unaccountable,\nand disconnected from regulation. No role-specific\nrisk mapping. No human governance over AI outputs.",
          Inches(0.5), Inches(4.2), Inches(4.6), Inches(0.75),
          size=Pt(11), color=C_RED_LT, wrap=True)

# Solution pill
add_rect(sl, Inches(0.35), Inches(5.2), Inches(4.9), Inches(1.1),
         fill=rgb(5,46,22), line=C_GREEN, line_w=Pt(1.5))
add_label(sl, "THE SOLUTION", Inches(0.5), Inches(5.25), Inches(4.5), Inches(0.25),
          size=Pt(9), bold=True, color=C_GREEN)
add_label(sl, "Role-specific. Regulation-grounded. Governed.\nViddaGPT maps each AML role to AMLR articles,\ngenerates explainable training with human checkpoints.",
          Inches(0.5), Inches(5.5), Inches(4.6), Inches(0.75),
          size=Pt(11), color=C_GREEN_LT, wrap=True)

# Metrics
add_rect(sl, Inches(0.35), Inches(6.5), Inches(4.9), Inches(0.75),
         fill=rgb(15,23,42), line=rgb(30,41,59), line_w=Pt(1))
for val, label, x in [("5","Roles",0.6),("7","Gov. Steps",1.95),("22+","Modules",3.3),("100%","Audited",4.5)]:
    add_label(sl, val, Inches(x), Inches(6.55), Inches(1.1), Inches(0.35),
              size=Pt(22), bold=True, color=C_VIOLET_LT, align=PP_ALIGN.CENTER)
    add_label(sl, label, Inches(x), Inches(6.88), Inches(1.1), Inches(0.25),
              size=Pt(9), color=C_LIGHT, align=PP_ALIGN.CENTER)

# Right: 4 pillars preview
pillars = [
    ("🔍 Transparency", "No hidden AI decision\nEvery output cites its source", C_ACCENT, rgb(46,16,101)),
    ("🔗 Traceability",  "role_id → analysis → module\n→ employee → decision", C_BLUE, rgb(12,35,64)),
    ("🔏 Auditability",  "Append-only log · actor+timestamp\nJSON details · No delete ever", C_GREEN, rgb(5,46,22)),
    ("✏️  Customise",    "7 inline-edit steps · risk badges\nMaterial select · Employee target", C_AMBER, rgb(28,20,0)),
]
py = Inches(0.3)
for icon_title, desc, border, bg in pillars:
    add_rect(sl, Inches(5.65), py, Inches(7.5), Inches(1.4),
             fill=bg, line=border, line_w=Pt(1.5))
    add_label(sl, icon_title, Inches(5.85), py+Inches(0.1), Inches(7.0), Inches(0.4),
              size=Pt(16), bold=True, color=C_WHITE)
    add_label(sl, desc, Inches(5.85), py+Inches(0.5), Inches(7.0), Inches(0.7),
              size=Pt(12), color=C_LIGHT, wrap=True)
    py += Inches(1.55)

# Hackathon footer
add_rect(sl, Inches(5.65), Inches(6.8), Inches(7.5), Inches(0.55),
         fill=C_ACCENT, line=None)
add_label(sl, "🏆  Hackathon 2026 — Vidda Solutions Team  |  Governing AI in Financial Crime Compliance",
          Inches(5.65), Inches(6.82), Inches(7.5), Inches(0.4),
          size=Pt(11), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — END-TO-END PIPELINE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)

add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(15,10,40), line=None)
add_label(sl, "END-TO-END PIPELINE", Inches(0.4), Inches(0.1), Inches(8), Inches(0.45),
          size=Pt(22), bold=True, color=C_WHITE)
add_label(sl, "7 steps · 3 governance checkpoints · full audit at every stage",
          Inches(0.4), Inches(0.42), Inches(9), Inches(0.3),
          size=Pt(12), color=C_LIGHT)

# Pipeline rail
add_rect(sl, Inches(0.3), Inches(1.15), Inches(12.73), Inches(0.12),
         fill=rgb(30,41,59), line=None)

steps = [
    ("1","Select\nRole",     C_ACCENT,  ["5 AML profiles","Band + risk level","role_id generated"]),
    ("2","ViddaGPT\nAnalysis",rgb(91,33,182),["RAG retrieval","AMLR evidence","analysis_id"]),
    ("3","7-Step\nValidate", C_BLUE,    ["Approve/Modify/Reject","3 checkpoints","Human-in-loop"]),
    ("4","Training\nPath",   C_TEAL,    ["Q1–Q4 modules","KSJ competencies","OpenRouter AI"]),
    ("5","Material\nGen",    C_GREEN,   ["Per-module select","Manager approval","before LMS"]),
    ("6","LMS\nAssign",      C_AMBER,   ["Employee email","training_assigned","Audit logged"]),
    ("7","Monitor\n& Sim",   C_RED,     ["MLRO scenario","Decision+justify","Dashboard live"]),
]
col_w = Inches(1.76)
for i, (num, title, col, bullets) in enumerate(steps):
    lx = Inches(0.3) + i * col_w
    # circle stub
    add_rect(sl, lx + Inches(0.62), Inches(1.0), Inches(0.52), Inches(0.52),
             fill=col, line=None)
    add_label(sl, num, lx + Inches(0.62), Inches(1.0), Inches(0.52), Inches(0.52),
              size=Pt(16), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)
    # card
    add_rect(sl, lx + Inches(0.08), Inches(1.55), Inches(1.58), Inches(3.6),
             fill=rgb(15,23,42), line=col, line_w=Pt(1.5))
    add_rect(sl, lx + Inches(0.08), Inches(1.55), Inches(1.58), Inches(0.65),
             fill=col, line=None)
    add_label(sl, title, lx + Inches(0.14), Inches(1.6), Inches(1.46), Inches(0.55),
              size=Pt(13), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=True)
    y = Inches(2.28)
    for b in bullets:
        add_label(sl, f"▸  {b}", lx+Inches(0.18), y, Inches(1.4), Inches(0.3),
                  size=Pt(10), color=C_LIGHT)
        y += Inches(0.3)

# Checkpoints
ckpts = [
    (Inches(0.3),  Inches(5.4), Inches(3.44), "CHECKPOINT A", "Steps 1–3: Role · Responsibilities · Inherent AML Risk"),
    (Inches(3.82), Inches(5.4), Inches(3.44), "CHECKPOINT B", "Steps 4–6: Risk Themes · Obligations · Competencies"),
    (Inches(7.34), Inches(5.4), Inches(5.69), "CHECKPOINT C", "Step 7: Training Focus + Material Approval + LMS Assign"),
]
for lx, ty, cw, label, desc in ckpts:
    add_rect(sl, lx, ty, cw, Inches(0.75), fill=rgb(5,46,22), line=C_GREEN, line_w=Pt(1.5))
    add_label(sl, label, lx+Inches(0.12), ty+Inches(0.06), cw, Inches(0.3),
              size=Pt(11), bold=True, color=C_GREEN)
    add_label(sl, desc, lx+Inches(0.12), ty+Inches(0.36), cw-Inches(0.24), Inches(0.32),
              size=Pt(9), color=C_GREEN_LT)

# AMLR strip
add_rect(sl, Inches(0.3), Inches(6.38), Inches(12.73), Inches(0.8),
         fill=rgb(15,5,40), line=C_ACCENT, line_w=Pt(1))
arts = ["Art.9 Controls","Art.10 Risk","Art.11 Functions","Art.12 Training","Art.13 Integrity","Art.14","Art.15"]
aw = Inches(12.73/8)
add_label(sl, "AMLR 2024/1624:", Inches(0.4), Inches(6.5), Inches(1.5), Inches(0.4),
          size=Pt(9), bold=True, color=C_VIOLET_LT)
for j, a in enumerate(arts):
    chip(sl, a, Inches(0.3)+Inches(1.6)+(j*aw), Inches(6.52), aw-Inches(0.08), Inches(0.44),
         bg=rgb(76,29,149), fg=rgb(233,213,255), size=Pt(9))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — TRANSPARENCY
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(30,10,80), line=None)
add_label(sl, "🔍  TRANSPARENCY", Inches(0.4), Inches(0.1), Inches(8), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "Every AI decision is visible, cited, and explained",
          Inches(0.4), Inches(0.42), Inches(9), Inches(0.3), size=Pt(13), color=C_VIOLET_LT)

layers = [
    ("Layer 1 — Regulatory",   C_ACCENT, rgb(30,10,80),
     "AMLR 2024/1624 Articles 9–15 retrieved via RAG and shown inline next to every AI output that cites them. Not a footnote — actual text highlighted in a document viewer."),
    ("Layer 2 — AI Decision",  C_BLUE,   rgb(12,35,64),
     "ViddaGPT structures its output into title · summary · detail rows · AMLR articles[] · evidence · excerpts. Every claim has a source. The model name and generation timestamp are also shown."),
    ("Layer 3 — Governance",   C_GREEN,  rgb(5,46,22),
     "Manager sees the full AI output before it becomes policy. Three checkpoints (A/B/C) block advancement until all 7 steps are resolved. MODIFIED badge shows exactly where the human changed the AI."),
    ("Layer 4 — Audit",        C_AMBER,  rgb(28,20,0),
     "Append-only AuditLog records every event with actor + timestamp + JSON details. Visible in the Step 6 LMS screen. No row is ever updated or deleted."),
    ("Layer 5 — Learner",      C_RED,    rgb(26,5,5),
     "Employee writes free-text justification per scenario decision. Manager dashboard shows last decision, last justification, and progress in real time."),
]
ly = Inches(0.8)
for title, border, bg, desc in layers:
    add_rect(sl, Inches(0.3), ly, Inches(12.73), Inches(0.98),
             fill=bg, line=border, line_w=Pt(1.5))
    add_rect(sl, Inches(0.3), ly, Inches(0.08), Inches(0.98), fill=border, line=None)
    add_label(sl, title, Inches(0.52), ly+Inches(0.06), Inches(4), Inches(0.3),
              size=Pt(12), bold=True, color=C_WHITE)
    add_label(sl, desc, Inches(0.52), ly+Inches(0.36), Inches(12.1), Inches(0.54),
              size=Pt(11), color=C_LIGHT, wrap=True)
    ly += Inches(1.06)

# Principle chips
chips = ["No hidden AI decision","Every output cites its source","Human gate before it matters","Full chain: Regulation → Audit"]
cw = Inches(3.0)
for k, c in enumerate(chips):
    chip(sl, c, Inches(0.3)+k*cw, Inches(7.12), cw-Inches(0.1), Inches(0.28),
         bg=rgb(46,16,101), fg=C_VIOLET_LT, size=Pt(10))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — TRACEABILITY
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(7,35,70), line=None)
add_label(sl, "🔗  TRACEABILITY", Inches(0.4), Inches(0.1), Inches(8), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "Every object links to every other — a single unbroken chain from regulation to learner decision",
          Inches(0.4), Inches(0.42), Inches(12), Inches(0.3), size=Pt(13), color=C_BLUE_LT)

# ID chain
chain = [
    ("AMLR\nArticle", C_ACCENT, rgb(30,10,80)),
    ("RAG\nEvidence",  rgb(91,33,182), rgb(20,5,50)),
    ("role_id",        C_BLUE,   rgb(12,35,64)),
    ("analysis_id",    C_TEAL,   rgb(8,40,52)),
    ("module_id",      C_GREEN,  rgb(5,46,22)),
    ("material_id",    rgb(5,150,105), rgb(3,28,16)),
    ("employee\nemail",C_AMBER,  rgb(28,20,0)),
    ("scenario\ndecision", C_RED, rgb(26,5,5)),
]
node_w = Inches(1.44)
arrow_w = Inches(0.22)
total = len(chain)*node_w + (len(chain)-1)*arrow_w
lx_start = (float(W) - float(total)) / 2

for k, (label, border, bg) in enumerate(chain):
    lx = lx_start + k*(float(node_w)+float(arrow_w))
    add_rect(sl, lx, Inches(0.82), node_w, Inches(1.1),
             fill=bg, line=border, line_w=Pt(1.5))
    add_label(sl, label, lx, Inches(0.82), node_w, Inches(1.1),
              size=Pt(12), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=True)
    if k < len(chain)-1:
        add_label(sl, "→", lx+node_w, Inches(1.15), arrow_w, Inches(0.4),
                  size=Pt(18), bold=True, color=C_LIGHT, align=PP_ALIGN.CENTER)

# Three columns: Regulation | Pipeline | Audit
col_titles = ["AMLR Regulatory Layer","Pipeline Traceability","RAG + Document Viewer"]
col_borders = [C_ACCENT, C_BLUE, C_TEAL]
col_bgs     = [rgb(20,5,60), rgb(7,23,50), rgb(5,30,42)]
col_content = [
    ["Articles 9–15 each cited by name","RAG engine retrieves exact sentences","Article text highlighted in viewer",
     "article_excerpt[] stored per step","Clickable AMLR buttons per detail row","Evidence score shown (vector similarity)"],
    ["role_id created on import","analysis_id links role → steps","module_id links analysis → module",
     "material_id tracks approved material","employee_email binds LMS assignment","scenario_id logs each simulation round"],
    ["Vector search on every article click","Top-k sentences returned with scores","Source filename + document_id tracked",
     "Highlight start/end offsets stored","Document viewer panel opens inline","Smooth scroll to RAG result"],
]
cw2 = Inches(4.11)
for k, (ct, cb, cbg, cc) in enumerate(zip(col_titles, col_borders, col_bgs, col_content)):
    lx = Inches(0.3) + k*(cw2+Inches(0.2))
    add_card(sl, lx, Inches(2.1), cw2, Inches(4.6), ct, cc,
             border=cb, title_bg=cbg, title_color=C_WHITE, body_color=C_LIGHT, body_size=Pt(10.5))

# Footer note
add_rect(sl, Inches(0.3), Inches(7.0), Inches(12.73), Inches(0.35),
         fill=rgb(15,23,42), line=rgb(30,41,59), line_w=Pt(1))
add_label(sl, "Every AuditLog row carries the full ID chain so any event can be traced back to its originating role, analysis, module, and employee",
          Inches(0.5), Inches(7.02), Inches(12.3), Inches(0.3),
          size=Pt(10), color=C_LIGHT, align=PP_ALIGN.CENTER)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — AUDITABILITY
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(5,46,22), line=None)
add_label(sl, "🔏  AUDITABILITY", Inches(0.4), Inches(0.1), Inches(8), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "Append-only · Actor-stamped · JSON-detailed · ID-chained · PostgreSQL",
          Inches(0.4), Inches(0.42), Inches(11), Inches(0.3), size=Pt(13), color=C_GREEN_LT)

# Schema box
add_card(sl, Inches(0.3), Inches(0.82), Inches(3.8), Inches(3.5),
         "Prisma AuditLog Schema",
         ["id        String   @id @default(cuid())",
          "eventType String   // event name",
          "actor     String   // system | user | …",
          "details   Json     // full context",
          "createdAt DateTime @default(now())",
          "",
          "No @updatedAt. No delete operations.",
          "Append-only by design."],
         border=C_GREEN, title_bg=rgb(5,46,22), body_color=C_GREEN_LT, body_size=Pt(10))

# Event timeline
events = [
    ("role_imported",          "system",   C_GREEN),
    ("analysis_started",       "system",   C_GREEN),
    ("analysis_completed",     "system",   C_GREEN),
    ("step1_approved",         "user",     C_BLUE),
    ("step3_modified",         "user",     C_TEAL),
    ("step3_approved",         "user",     C_BLUE),
    ("training_path_generated","openrouter",C_AMBER),
    ("material_approved",      "manager",  C_GREEN),
    ("training_assigned",      "system",   C_GREEN),
    ("scenario_decision",      "employee", C_RED),
]
add_label(sl, "Full Event Chain", Inches(4.3), Inches(0.82), Inches(8.7), Inches(0.3),
          size=Pt(12), bold=True, color=C_WHITE)
ey = Inches(1.15)
for evt, actor, col in events:
    add_rect(sl, Inches(4.3), ey, Inches(8.5), Inches(0.38),
             fill=rgb(15,23,42), line=col, line_w=Pt(1))
    add_rect(sl, Inches(4.3), ey, Inches(0.06), Inches(0.38), fill=col, line=None)
    add_label(sl, evt, Inches(4.52), ey+Inches(0.06), Inches(5.5), Inches(0.26),
              size=Pt(10), bold=True, color=C_WHITE)
    add_label(sl, f"actor: {actor}", Inches(10.1), ey+Inches(0.06), Inches(2.5), Inches(0.26),
              size=Pt(9), color=C_LIGHT)
    ey += Inches(0.42)

# Sample JSON
add_rect(sl, Inches(0.3), Inches(4.45), Inches(3.8), Inches(2.3),
         fill=rgb(10,14,26), line=rgb(30,41,59), line_w=Pt(1))
add_label(sl, "Sample Log Entry (step3_modified)", Inches(0.42), Inches(4.5), Inches(3.6), Inches(0.28),
          size=Pt(10), bold=True, color=C_GREEN)
sample = [
    '{ "id": "cm9k2x4p…"',
    '  "eventType": "step3_modified"',
    '  "actor": "user"',
    '  "details": { step_num: 3,',
    '    original: {…}, modified: {…} }',
    '  "createdAt": "2026-05-20T09:37Z" }',
]
sy = Inches(4.82)
for line in sample:
    add_label(sl, line, Inches(0.42), sy, Inches(3.6), Inches(0.25),
              size=Pt(9), color=C_GREEN_LT)
    sy += Inches(0.26)

# Guarantees footer
guarantees = ["Append-only","Actor on every row","ISO timestamp","Full JSON context","ID chain: role→scenario","PostgreSQL"]
gw = Inches(12.73 / len(guarantees))
for k, g in enumerate(guarantees):
    chip(sl, g, Inches(0.3)+k*gw, Inches(7.1), gw-Inches(0.08), Inches(0.28),
         bg=rgb(5,46,22), fg=C_GREEN_LT, size=Pt(9))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — CUSTOMISATION
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(28,20,0), line=None)
add_label(sl, "✏️  CUSTOMISATION", Inches(0.4), Inches(0.1), Inches(8), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "Every layer of the pipeline is editable — changes ripple downstream into a unique curriculum",
          Inches(0.4), Inches(0.42), Inches(12), Inches(0.3), size=Pt(13), color=C_AMBER_LT)

# 5 Role cards
roles = [
    ("👔 AML DDI Manager","Band H · HIGH","third_party_risk"),
    ("📞 Customer Advisor","Band F · MED-HIGH","onboarding_risk"),
    ("⚖️  MLRO","Band 5 · CRITICAL","personal_liability"),
    ("🔍 TM Analyst","Band G · HIGH","detection_risk"),
    ("🛡️  KYC Analyst","Band G · CRITICAL","high_risk_cust."),
]
rw = Inches(2.43)
for k, (name, band, risk) in enumerate(roles):
    lx = Inches(0.3) + k*rw
    add_rect(sl, lx, Inches(0.82), rw-Inches(0.12), Inches(1.1),
             fill=rgb(20,12,50), line=C_ACCENT, line_w=Pt(1.5))
    add_label(sl, name, lx+Inches(0.12), Inches(0.86), rw-Inches(0.24), Inches(0.4),
              size=Pt(11), bold=True, color=C_WHITE, wrap=True)
    add_label(sl, band, lx+Inches(0.12), Inches(1.28), rw-Inches(0.24), Inches(0.24),
              size=Pt(9), color=C_VIOLET_LT)
    add_label(sl, risk, lx+Inches(0.12), Inches(1.54), rw-Inches(0.24), Inches(0.24),
              size=Pt(9), color=C_LIGHT)

# Inline edit controls card
add_card(sl, Inches(0.3), Inches(2.1), Inches(4.2), Inches(4.5),
         "7-Step Inline Editing",
         ["Each step: Approve / Modify / Reject",
          "Free-text textarea per detail field",
          "Risk badge: CRITICAL/HIGH/MEDIUM/LOW",
          "Save without approving (review first)",
          "MODIFIED badge = AI delta visible",
          "Reject + Reset returns to AI output",
          "All 7 must approve to advance",
          "RAG article buttons per detail row"],
         border=C_BLUE, title_bg=rgb(12,35,64), body_color=C_LIGHT)

# Quarter + material card
add_card(sl, Inches(4.65), Inches(2.1), Inches(3.9), Inches(4.5),
         "Module & Material Select",
         ["Quarter filter: All / Q1 / Q2 / Q3 / Q4",
          "Toggle module details inline",
          "MANDATORY / OPTIONAL badges",
          "content_type · risk_alignment shown",
          "TrainingMaterialGenerator per module",
          "Manager approves each module's material",
          "At least 1 approved → Step 6 unlocked",
          "approvedMaterialIds tracked in state"],
         border=C_AMBER, title_bg=rgb(28,20,0), body_color=C_LIGHT)

# Employee + scenario card
add_card(sl, Inches(8.7), Inches(2.1), Inches(4.33), Inches(4.5),
         "Employee Targeting & Scenario",
         ["Employee email bound to training path",
          "Email validation before LMS unlock",
          "employeeEmail → Step 7 dashboard",
          "MLRO scenario: free-text justification",
          "Decision choice per scenario round",
          "modulesCompleted increments per round",
          "Last decision + justification shown",
          "Manager sees live progress + audit"],
         border=C_RED, title_bg=rgb(26,5,5), body_color=C_LIGHT)

# Ripple arrow row
ripple = ["Role\nselected","AI generates\n7-step output","Manager\nedits steps",
          "Training path\nre-generated","Modules reflect\nchange","Employee gets\ncustom curriculum"]
rn_w = Inches(1.9)
rn_h = Inches(0.65)
ry = Inches(6.72)
rx = Inches(0.3)
for k, label in enumerate(ripple):
    add_rect(sl, rx, ry, rn_w, rn_h, fill=rgb(30,10,80) if k%2==0 else rgb(7,23,50),
             line=C_ACCENT if k%2==0 else C_BLUE, line_w=Pt(1.2))
    add_label(sl, label, rx, ry, rn_w, rn_h,
              size=Pt(9), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=True)
    rx += rn_w
    if k < len(ripple)-1:
        add_label(sl, "→", rx, ry, Inches(0.25), rn_h,
                  size=Pt(16), bold=True, color=C_LIGHT, align=PP_ALIGN.CENTER)
        rx += Inches(0.25)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — TECH ARCHITECTURE
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(15,23,42), line=None)
add_label(sl, "⚙️  TECHNOLOGY ARCHITECTURE", Inches(0.4), Inches(0.1), Inches(10), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "Next.js 15 · TypeScript · Prisma · PostgreSQL · OpenRouter · RAG · Claude MCP",
          Inches(0.4), Inches(0.42), Inches(12), Inches(0.3), size=Pt(13), color=C_LIGHT)

layers_arch = [
    ("Frontend — Next.js 15 App Router (pages/)", C_BLUE, rgb(7,23,50),
     ["app/page.tsx: 7-step wizard (useState orchestration)",
      "components/MLROScenarioSimulation.tsx: governed decision simulation",
      "components/TrainingMaterialGenerator.tsx: per-module material approval",
      "Tailwind CSS: dark UI · progress bar · inline edit controls · RAG document viewer"]),
    ("API Layer — Next.js API Routes (pages/api/)", C_TEAL, rgb(5,30,42),
     ["POST /api/roles/import  → create Role + AuditLog",
      "POST /api/analysis/run  → create AnalysisRun + call ViddaGPT",
      "GET  /api/analysis/[id] → fetch modules + viddagpt_output",
      "POST /api/training-path/generate → OpenRouter AI → create modules",
      "GET  /api/rag/article   → vector search → return hits + highlighted doc"]),
    ("AI / RAG Layer — ViddaGPT + OpenRouter", C_ACCENT, rgb(20,5,60),
     ["ViddaGPT: 7-step framework analysis grounded in role + AMLR articles",
      "OpenRouter: training path generation (provider + model disclosed in UI)",
      "RAG engine (lib/ragMcp.ts): semantic vector search over AMLR document chunks",
      "Article evidence: text hits · similarity scores · filename · document_id · highlights"]),
    ("Data Layer — Prisma ORM + PostgreSQL", C_GREEN, rgb(5,46,22),
     ["Models: Role · AnalysisRun · Module · Enrollment · AuditLog · SuccessMetric",
      "AuditLog: append-only, no update/delete — actor + details(Json) + createdAt",
      "Migration history in prisma/migrations/ — schema versioned and reproducible",
      "DATABASE_URL in .env (Prisma CLI) + .env.local (Next.js runtime)"]),
]
ly2 = Inches(0.82)
for title, border, bg, bullets in layers_arch:
    add_rect(sl, Inches(0.3), ly2, Inches(12.73), Inches(1.38),
             fill=bg, line=border, line_w=Pt(1.5))
    add_rect(sl, Inches(0.3), ly2, Inches(0.08), Inches(1.38), fill=border, line=None)
    add_label(sl, title, Inches(0.52), ly2+Inches(0.06), Inches(12.1), Inches(0.3),
              size=Pt(12), bold=True, color=C_WHITE)
    bx = Inches(0.52)
    by = ly2 + Inches(0.4)
    for j, b in enumerate(bullets):
        bxi = bx if j < 2 else bx + Inches(6.2)
        byi = by if j < 2 else ly2 + Inches(0.4) + (j-2)*Inches(0.44)
        if j < 2:
            byi = ly2 + Inches(0.4) + j*Inches(0.44)
        add_label(sl, f"▸  {b}", bxi, byi, Inches(5.9), Inches(0.38),
                  size=Pt(10), color=C_LIGHT)
    ly2 += Inches(1.46)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — IMPACT & CLOSING
# ══════════════════════════════════════════════════════════════════════════════
sl = prs.slides.add_slide(blank)
set_bg(sl, C_BG)
add_rect(sl, 0, 0, W, Inches(0.65), fill=rgb(10,15,30), line=None)
add_label(sl, "IMPACT & KEY TAKEAWAYS", Inches(0.4), Inches(0.1), Inches(10), Inches(0.45),
          size=Pt(24), bold=True, color=C_WHITE)
add_label(sl, "What Vidda Solutions delivers to financial crime compliance teams",
          Inches(0.4), Inches(0.42), Inches(10), Inches(0.3), size=Pt(13), color=C_LIGHT)

# Impact cards 2×2
impacts = [
    ("🎯 Role-specific Training",
     C_ACCENT, rgb(20,5,60),
     "Each of the 5 AML roles receives a completely different training curriculum — driven by its unique risk exposure, regulatory obligations, and competency requirements. No generic training.",
     ["AML DDI Manager: third-party oversight","MLRO: SAR decisions + liability","KYC Analyst: enhanced due diligence","TM Analyst: alert investigation","Customer Advisor: onboarding risk"]),
    ("📋 Governed AI Decisions",
     C_BLUE, rgb(7,23,50),
     "The 7-step framework ensures every AI recommendation is reviewed by a human before becoming policy. Three checkpoints lock the pipeline. Nothing proceeds without manager approval.",
     ["Approve / Modify / Reject per step","MODIFIED badge = AI delta visible","Inline field editing + risk overrides","All 7 steps must resolve to advance","Full governance chain recorded in audit"]),
    ("🔗 Regulatory Compliance",
     C_GREEN, rgb(5,46,22),
     "Training is grounded in AMLR 2024/1624 Articles 9–15. RAG retrieves actual regulation text and highlights it. Every module links to specific articles. Compliance is demonstrable.",
     ["Articles 9–15 cited per detail row","RAG evidence with similarity scores","Article text highlighted in viewer","module.amlr_articles[] per module","Regulatory coverage fully traceable"]),
    ("📊 Complete Accountability",
     C_AMBER, rgb(28,20,0),
     "An append-only audit log captures every action — who did it, when, and with what context. The full chain from role selection to employee scenario decision is permanently recorded.",
     ["Append-only PostgreSQL AuditLog","Actor + ISO timestamp + JSON details","role_id → analysis → module → employee","UI audit trail visible to manager","No update. No delete. Ever."]),
]
iw = Inches(6.2)
ih = Inches(2.95)
positions = [(Inches(0.3), Inches(0.82)), (Inches(6.65), Inches(0.82)),
             (Inches(0.3), Inches(3.9)),  (Inches(6.65), Inches(3.9))]
for (lx, ty), (title, border, bg, desc, bullets) in zip(positions, impacts):
    add_rect(sl, lx, ty, iw, ih, fill=bg, line=border, line_w=Pt(2))
    add_rect(sl, lx, ty, iw, Inches(0.48), fill=border, line=None)
    add_label(sl, title, lx+Inches(0.15), ty+Inches(0.07), iw, Inches(0.35),
              size=Pt(14), bold=True, color=C_WHITE)
    add_label(sl, desc, lx+Inches(0.15), ty+Inches(0.55), iw-Inches(0.3), Inches(0.7),
              size=Pt(10), color=C_LIGHT, wrap=True)
    by2 = ty + Inches(1.3)
    for b in bullets:
        add_label(sl, f"▸  {b}", lx+Inches(0.15), by2, iw-Inches(0.3), Inches(0.26),
                  size=Pt(9.5), color=C_WHITE)
        by2 += Inches(0.28)

# Closing banner
add_rect(sl, Inches(0.3), Inches(7.05), Inches(12.73), Inches(0.35),
         fill=C_ACCENT, line=None)
add_label(sl, "Vidda Solutions  ·  Hackathon 2026  ·  Transparency · Traceability · Auditability · Customisation  ·  AMLR 2024/1624",
          Inches(0.3), Inches(7.06), Inches(12.73), Inches(0.32),
          size=Pt(10), bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

# ── Save ─────────────────────────────────────────────────────────────────────
out = "/Users/alekhya/alekhya/2026/Hackathon/ViddaHackathon/ViddaEducatingPlatform/public/vidda_presentation.pptx"
prs.save(out)
print(f"Saved: {out}")
