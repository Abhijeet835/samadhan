"""
Build Samadhan_v2_Demo_Institute_Report.docx following every Demo Institute B.Tech Report Guideline
in docs/Project Report Template.pdf (A4, 2.54 cm margins, Times New Roman, 1.5 line spacing,
zero paragraph indent, Roman front-matter i-ix, Page | N body footer, native TOC/LOF/LOT fields,
algorithm horizontal-rule frames, 300-DPI figures, and exact citations).

After saving the .docx, invokes Microsoft Word COM (if available) to:
1. Recalculate TOC, List of Figures, List of Tables, and Section Page numbers.
2. Export a verification PDF (docs/report/Samadhan_v2_Demo_Institute_Report.pdf) and report
   exact rendered front-matter and body page counts (enforcing <= 30 body pages).
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Pt, RGBColor

REPORT_DIR = Path(__file__).resolve().parent
FIG_DIR = REPORT_DIR / "figures"
OUT_DOCX = REPORT_DIR / "Samadhan_v2_Demo_Institute_Report.docx"
OUT_PDF = REPORT_DIR / "Samadhan_v2_Demo_Institute_Report.pdf"

CONTENT_WIDTH_CM = 21.0 - 2 * 2.54  # 15.92 cm exact A4 printable width

COLOR_BLACK = RGBColor(0x00, 0x00, 0x00)
COLOR_NAVY = RGBColor(0x1B, 0x36, 0x5D)
COLOR_PLACEHOLDER = RGBColor(0x8B, 0x00, 0x00)
COLOR_MUTED = RGBColor(0x47, 0x55, 0x69)

FIGURE_FILE_MAP = {
    "1.1": FIG_DIR / "fig1_1_dual_mode.png",
    "3.1": FIG_DIR / "fig3_1_architecture.png",
    "3.2": FIG_DIR / "fig3_2_dfd.png",
    "3.3": FIG_DIR / "fig3_3_state_machine.png",
    "4.1": FIG_DIR / "fig4_1_landing.png",
    "4.2": FIG_DIR / "fig4_2_report_duplicate.png",
    "4.3": FIG_DIR / "fig4_3_issue_detail.png",
    "4.4": FIG_DIR / "fig4_4_maps.png",
    "4.5": FIG_DIR / "fig4_5_admin.png",
}

TABLE_COL_WIDTHS_CM = {
    "1.1": [3.0, 7.3, 5.62],
    "2.1": [1.0, 2.3, 3.8, 4.2, 4.62],
    "3.1": [0.85, 2.55, 7.32, 5.2],
    "3.2": [3.0, 7.22, 5.7],
    "3.3": [3.4, 5.0, 7.52],
    "4.1": [3.4, 5.2, 2.0, 5.32],
    "4.2": [4.0, 5.8, 6.12],
}

# Unicode / subscript-friendly equation segments for Equations (3.1), (3.2), (3.3)
# Tuple format: (text, is_sub, is_sup, is_italic, is_bold)
EQUATION_SPECS = {
    "3.1": {
        "lines": [
            [
                ("IsDuplicate(P", False, False, False, False),
                ("new", True, False, False, False),
                (", c)  \u21d4  d", False, False, False, False),
                ("geo", True, False, False, False),
                ("(P", False, False, False, False),
                ("new", True, False, False, False),
                (", e.location) \u2264 R", False, False, False, False),
                ("dup", True, False, False, False),
                ("   and   (t", False, False, False, False),
                ("now", True, False, False, False),
                (" \u2212 e.createdAt) \u2264 W", False, False, False, False),
                ("dup", True, False, False, False),
            ]
        ],
    },
    "3.2": {
        "lines": [
            [
                ("Fund(i) = 0,   if  i.status = REJECTED", False, False, False, False),
            ],
            [
                ("Fund(i) = Sum of user contributions for i  +  Platform credit(i),   otherwise", False, False, False, False),
            ],
        ],
    },
    "3.3": {
        "lines": [
            [
                ("ShowHelper(h, P", False, False, False, False),
                ("user", True, False, False, False),
                (")  \u21d4  d", False, False, False, False),
                ("geo", True, False, False, False),
                ("(P", False, False, False, False),
                ("user", True, False, False, False),
                (", h.location) \u2264 min(R", False, False, False, False),
                ("user", True, False, False, False),
                (", R", False, False, False, False),
                ("helper", True, False, False, False),
                (") \u00d7 1000", False, False, False, False),
            ]
        ],
    },
}


# ---------------------------------------------------------------------------
# Low-level OOXML helpers
# ---------------------------------------------------------------------------
def set_run_font(run, size_pt: float = 12, bold: bool = False, italic: bool = False,
                 color: RGBColor = COLOR_BLACK, font_name: str = "Times New Roman"):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color is not None:
        run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    rFonts.set(qn("w:ascii"), font_name)
    rFonts.set(qn("w:hAnsi"), font_name)
    rFonts.set(qn("w:cs"), font_name)
    rFonts.set(qn("w:eastAsia"), font_name)


def set_para_double_bottom_border(para, color_hex: str = "000000", sz: str = "6", space: str = "4"):
    pPr = para._p.get_or_add_pPr()
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is not None:
        pPr.remove(pBdr)
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'  <w:bottom w:val="double" w:sz="{sz}" w:space="{space}" w:color="{color_hex}"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)


def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.find(qn("w:tcBorders"))
    if tcBorders is not None:
        tcPr.remove(tcBorders)
    tcBorders = OxmlElement("w:tcBorders")
    for side, spec in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if spec is not None:
            el = OxmlElement(f"w:{side}")
            for k, v in spec.items():
                el.set(qn(f"w:{k}"), str(v))
            tcBorders.append(el)
    tcPr.append(tcBorders)


def set_table_all_borders(table, sz: str = "4", color: str = "333333", val: str = "single"):
    tblPr = table._tbl.tblPr
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is not None:
        tblPr.remove(borders)
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def set_table_borderless(table):
    tblPr = table._tbl.tblPr
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is not None:
        tblPr.remove(borders)
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'  <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'  <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'  <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'  <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'  <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def shade_cell(cell, fill_hex: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is not None:
        tcPr.remove(shd)
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))


def set_cell_margins(cell, top=80, bottom=80, left=110, right=110):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = tcPr.find(qn("w:tcMar"))
    if tcMar is not None:
        tcPr.remove(tcMar)
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def set_row_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    if trPr.find(qn("w:cantSplit")) is None:
        trPr.append(OxmlElement("w:cantSplit"))


def set_row_header(row):
    trPr = row._tr.get_or_add_trPr()
    if trPr.find(qn("w:tblHeader")) is None:
        trPr.append(OxmlElement("w:tblHeader"))


def set_section_page_border(section, enabled: bool):
    sectPr = section._sectPr
    pgBorders = sectPr.find(qn("w:pgBorders"))
    if pgBorders is not None:
        sectPr.remove(pgBorders)
    if enabled:
        pgBorders = parse_xml(
            f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
            f'  <w:top w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
            f'  <w:left w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
            f'  <w:bottom w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
            f'  <w:right w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
            f'</w:pgBorders>'
        )
        sectPr.append(pgBorders)


def set_section_numbering(section, fmt: str = "decimal", start: int | None = None):
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn("w:pgNumType"))
    if pgNumType is not None:
        sectPr.remove(pgNumType)
    pgNumType = OxmlElement("w:pgNumType")
    pgNumType.set(qn("w:fmt"), fmt)
    if start is not None:
        pgNumType.set(qn("w:start"), str(start))
    sectPr.append(pgNumType)


def add_field(para, instr: str, placeholder_text: str = "1", size_pt: float = 11, bold: bool = False):
    r_begin = para.add_run()
    set_run_font(r_begin, size_pt=size_pt, bold=bold)
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    fld_begin.set(qn("w:dirty"), "true")
    r_begin._r.append(fld_begin)

    r_instr = para.add_run()
    set_run_font(r_instr, size_pt=size_pt, bold=bold)
    instr_el = OxmlElement("w:instrText")
    instr_el.set(qn("xml:space"), "preserve")
    instr_el.text = f" {instr} "
    r_instr._r.append(instr_el)

    r_sep = para.add_run()
    set_run_font(r_sep, size_pt=size_pt, bold=bold)
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    r_sep._r.append(fld_sep)

    r_val = para.add_run(placeholder_text)
    set_run_font(r_val, size_pt=size_pt, bold=bold)

    r_end = para.add_run()
    set_run_font(r_end, size_pt=size_pt, bold=bold)
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    r_end._r.append(fld_end)


def configure_a4_section(section):
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)
    section.header_distance = Cm(1.25)
    section.footer_distance = Cm(1.25)


# ---------------------------------------------------------------------------
# Inline Markdown & Math Sanitizer
# ---------------------------------------------------------------------------
LATEX_INLINE_REPLACEMENTS = [
    (r"\\approx", "\u2248"),
    (r"\\times", "\u00d7"),
    (r"\\le", "\u2264"),
    (r"\\ge", "\u2265"),
    (r"\\ne", "\u2260"),
    (r"\\epsilon", "\u03b5"),
    (r"\\delta", "\u03b4"),
    (r"\\lambda", "\u03bb"),
    (r"\\phi", "\u03c6"),
    (r"\\text\{([^}]*)\}", r"\1"),
    (r"_\{([^}]*)\}", r"_\1"),
]


def clean_inline_math(text: str) -> str:
    """Replace LaTeX inline expressions outside backtick code spans so Mongo $ operators stay intact."""
    parts = re.split(r"(`[^`]+`)", text)
    for idx in range(0, len(parts), 2):
        def _rep(m: re.Match) -> str:
            inner = m.group(1)
            for pat, rep in LATEX_INLINE_REPLACEMENTS:
                inner = re.sub(pat, rep, inner)
            return inner.strip()
        parts[idx] = re.sub(r"\$([^$]+)\$", _rep, parts[idx])
    return "".join(parts)


def add_formatted_runs(para, text: str, base_size: float = 12, base_bold: bool = False,
                       base_italic: bool = False, base_color: RGBColor = COLOR_BLACK):
    text = clean_inline_math(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)

    # Split preserving [INSERT ...], **...**, *...*, `...`
    token_re = re.compile(
        r"(`?\[INSERT\s+[^\]]+\]`?"
        r"|\*\*[^*]+\*\*"
        r"|(?<!\*)\*[^*]+\*(?!\*)"
        r"|`[^`]+`)"
    )
    pos = 0
    for m in token_re.finditer(text):
        if m.start() > pos:
            plain = text[pos : m.start()]
            if plain:
                r = para.add_run(plain)
                set_run_font(r, size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)
        tok = m.group(0)
        if tok.lstrip("`").startswith("[INSERT "):
            clean_tok = tok.strip("`")
            r = para.add_run(clean_tok)
            set_run_font(r, size_pt=base_size, bold=True, italic=False, color=COLOR_PLACEHOLDER)
        elif tok.startswith("**") and tok.endswith("**"):
            inner = tok[2:-2]
            add_formatted_runs(para, inner, base_size=base_size, base_bold=True,
                               base_italic=base_italic, base_color=base_color)
        elif tok.startswith("*") and tok.endswith("*"):
            inner = tok[1:-1]
            add_formatted_runs(para, inner, base_size=base_size, base_bold=base_bold,
                               base_italic=True, base_color=base_color)
        elif tok.startswith("`") and tok.endswith("`"):
            inner = tok[1:-1]
            # Strict Demo Institute Rule #3: Times New Roman only across document!
            r = para.add_run(inner)
            set_run_font(r, size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)
        pos = m.end()
    if pos < len(text):
        tail = text[pos:]
        if tail:
            r = para.add_run(tail)
            set_run_font(r, size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)


# ---------------------------------------------------------------------------
# Document Styles Setup
# ---------------------------------------------------------------------------
def configure_styles(doc: Document):
    # Enable automatic field update prompt upon opening
    settings = doc.settings.element
    if settings.find(qn("w:updateFields")) is None:
        uf = OxmlElement("w:updateFields")
        uf.set(qn("w:val"), "true")
        settings.append(uf)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    normal.font.color.rgb = COLOR_BLACK
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.first_line_indent = Pt(0)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    rPr = normal.element.get_or_add_rPr()
    rFonts = OxmlElement("w:rFonts")
    for k in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rFonts.set(qn(k), "Times New Roman")
    rPr.insert(0, rFonts)

    # Heading 1: Chapter / Front section headings (18 pt bold italic + double bottom rule)
    h1 = doc.styles["Heading 1"]
    h1.font.name = "Times New Roman"
    h1.font.size = Pt(18)
    h1.font.bold = True
    h1.font.italic = True
    h1.font.color.rgb = COLOR_BLACK
    h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h1.paragraph_format.line_spacing = 1.15
    h1.paragraph_format.space_before = Pt(0)
    h1.paragraph_format.space_after = Pt(12)
    h1.paragraph_format.keep_with_next = True

    # Heading 2: Section Heading (16 pt bold title case)
    h2 = doc.styles["Heading 2"]
    h2.font.name = "Times New Roman"
    h2.font.size = Pt(16)
    h2.font.bold = True
    h2.font.italic = False
    h2.font.color.rgb = COLOR_BLACK
    h2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h2.paragraph_format.line_spacing = 1.15
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(6)
    h2.paragraph_format.keep_with_next = True

    # Heading 3: Subsection Heading (14 pt bold normal)
    h3 = doc.styles["Heading 3"]
    h3.font.name = "Times New Roman"
    h3.font.size = Pt(14)
    h3.font.bold = True
    h3.font.italic = False
    h3.font.color.rgb = COLOR_BLACK
    h3.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h3.paragraph_format.line_spacing = 1.15
    h3.paragraph_format.space_before = Pt(10)
    h3.paragraph_format.space_after = Pt(4)
    h3.paragraph_format.keep_with_next = True

    # Custom styles for LOF / LOT / Contents (non-TOC-indexed Contents heading)
    from docx.enum.style import WD_STYLE_TYPE
    for name in ("TOCHeadingStyle", "FigureCaption", "TableCaption"):
        if name not in doc.styles:
            doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)

    th = doc.styles["TOCHeadingStyle"]
    th.font.name = "Times New Roman"
    th.font.size = Pt(18)
    th.font.bold = True
    th.font.italic = True
    th.font.color.rgb = COLOR_BLACK
    th.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    th.paragraph_format.space_before = Pt(0)
    th.paragraph_format.space_after = Pt(12)

    for cap_name in ("FigureCaption", "TableCaption"):
        cs = doc.styles[cap_name]
        cs.font.name = "Times New Roman"
        cs.font.size = Pt(12)
        cs.font.bold = False
        cs.font.italic = False
        cs.font.color.rgb = COLOR_BLACK
        cs.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cs.paragraph_format.line_spacing = 1.15
        cs.paragraph_format.space_before = Pt(4)
        cs.paragraph_format.space_after = Pt(8)

    # Configure TOC 1..3 styles so CONTENTS stays cleanly on 1 page (vii)
    for lvl, indent_cm, bold in [("TOC 1", 0.0, True), ("TOC 2", 0.45, False), ("TOC 3", 0.9, False)]:
        if lvl in doc.styles:
            ts = doc.styles[lvl]
            ts.font.name = "Times New Roman"
            ts.font.size = Pt(11)
            ts.font.bold = bold
            ts.font.color.rgb = COLOR_BLACK
            ts.paragraph_format.left_indent = Cm(indent_cm)
            ts.paragraph_format.line_spacing = 1.05
            ts.paragraph_format.space_before = Pt(0)
            ts.paragraph_format.space_after = Pt(0)
            ts.paragraph_format.tab_stops.clear_all()
            ts.paragraph_format.tab_stops.add_tab_stop(Cm(CONTENT_WIDTH_CM), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)


# ---------------------------------------------------------------------------
# Helpers for Paragraphs, Sections, Equations, Algorithms, Tables, Figures
# ---------------------------------------------------------------------------
def add_chapter_heading(doc: Document, text: str, include_in_toc: bool = True, page_break_before: bool = False):
    p = doc.add_paragraph(style="Heading 1" if include_in_toc else "TOCHeadingStyle")
    r = p.add_run(text)
    set_run_font(r, size_pt=18, bold=True, italic=True)
    set_para_double_bottom_border(p)
    p.paragraph_format.keep_with_next = True
    if page_break_before:
        p.paragraph_format.page_break_before = True
    return p


def add_body_para(doc: Document, text: str, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
                  space_after: float = 6, line_spacing: float = 1.5, bold: bool = False):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    add_formatted_runs(p, text, base_size=12, base_bold=bold)
    return p


def add_numbered_or_bullet_para(doc: Document, prefix: str, text: str, compact: bool = False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Cm(0.75)
    p.paragraph_format.first_line_indent = Cm(-0.55)
    p.paragraph_format.line_spacing = 1.25 if compact else 1.45
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3 if compact else 4)
    r = p.add_run(prefix + " ")
    set_run_font(r, size_pt=12, bold=prefix[0].isdigit())
    add_formatted_runs(p, text, base_size=12)
    return p


def add_tiny_spacer(doc: Document, space_after: float = 2):
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(space_after)
    sp.paragraph_format.line_spacing = 1.0
    r = sp.add_run()
    set_run_font(r, size_pt=2)


def add_signature_grid(doc: Document, left_lines: list[str], right_lines: list[str]):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    tbl.columns[0].width = Cm(6.5)
    tbl.columns[1].width = Cm(CONTENT_WIDTH_CM - 6.5)

    c_left, c_right = tbl.rows[0].cells
    c_left.width = Cm(6.5)
    c_right.width = Cm(CONTENT_WIDTH_CM - 6.5)
    set_row_cant_split(tbl.rows[0])

    p_l = c_left.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_l.paragraph_format.line_spacing = 1.35
    p_l.paragraph_format.space_after = Pt(0)
    for idx, line in enumerate(left_lines):
        if idx > 0:
            p_l.add_run("\n")
        add_formatted_runs(p_l, line, base_size=12)

    p_r = c_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_r.paragraph_format.line_spacing = 1.35
    p_r.paragraph_format.space_after = Pt(0)
    for idx, line in enumerate(right_lines):
        if idx > 0:
            p_r.add_run("\n")
        add_formatted_runs(p_r, line, base_size=12)


def add_equation_block(doc: Document, eq_num: str, add_spacer: bool = True):
    spec = EQUATION_SPECS[eq_num]
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    w_eq = Cm(14.32)
    w_tag = Cm(1.60)
    tbl.columns[0].width = w_eq
    tbl.columns[1].width = w_tag
    c_eq, c_tag = tbl.rows[0].cells
    c_eq.width = w_eq
    c_tag.width = w_tag
    c_eq.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    c_tag.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_row_cant_split(tbl.rows[0])
    set_cell_margins(c_eq, top=40, bottom=40, left=40, right=40)
    set_cell_margins(c_tag, top=40, bottom=40, left=20, right=0)

    for line_idx, segs in enumerate(spec["lines"]):
        p = c_eq.paragraphs[0] if line_idx == 0 else c_eq.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        for text, is_sub, is_sup, is_it, is_bd in segs:
            r = p.add_run(text)
            set_run_font(r, size_pt=11, bold=is_bd, italic=is_it)
            if is_sub:
                r.font.subscript = True
            if is_sup:
                r.font.superscript = True

    p_tag = c_tag.paragraphs[0]
    p_tag.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_tag.paragraph_format.line_spacing = 1.2
    p_tag.paragraph_format.space_after = Pt(0)
    r_tag = p_tag.add_run(f"({eq_num})")
    set_run_font(r_tag, size_pt=12)

    if add_spacer:
        add_tiny_spacer(doc, space_after=2)


def add_algorithm_block(doc: Document, title: str, steps: list[str], add_spacer: bool = True):
    # Matches Template Page 11: top rule, bold title row with bottom rule, steps, bottom rule
    tbl = doc.add_table(rows=2, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    tbl.columns[0].width = Cm(CONTENT_WIDTH_CM)

    c_hdr = tbl.rows[0].cells[0]
    c_hdr.width = Cm(CONTENT_WIDTH_CM)
    set_row_cant_split(tbl.rows[0])
    set_cell_margins(c_hdr, top=70, bottom=70, left=80, right=80)
    set_cell_borders(
        c_hdr,
        top={"val": "single", "sz": "8", "space": "0", "color": "000000"},
        bottom={"val": "single", "sz": "6", "space": "0", "color": "000000"},
    )
    p_h = c_hdr.paragraphs[0]
    p_h.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_h.paragraph_format.line_spacing = 1.2
    p_h.paragraph_format.space_after = Pt(0)
    p_h.paragraph_format.keep_with_next = True
    add_formatted_runs(p_h, title, base_size=12, base_bold=True)

    c_body = tbl.rows[1].cells[0]
    c_body.width = Cm(CONTENT_WIDTH_CM)
    set_row_cant_split(tbl.rows[1])
    set_cell_margins(c_body, top=70, bottom=80, left=100, right=80)
    set_cell_borders(
        c_body,
        bottom={"val": "single", "sz": "8", "space": "0", "color": "000000"},
    )
    for i, step in enumerate(steps):
        p = c_body.paragraphs[0] if i == 0 else c_body.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.left_indent = Cm(0.65)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.line_spacing = 1.25
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3 if i < len(steps) - 1 else 0)
        add_formatted_runs(p, step, base_size=11)

    if add_spacer:
        add_tiny_spacer(doc, space_after=4)


def add_figure_with_caption(doc: Document, fig_num: str, caption_text: str):
    img_path = FIGURE_FILE_MAP[fig_num]
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.line_spacing = 1.0
    p_img.paragraph_format.space_before = Pt(4)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    run = p_img.add_run()
    # Keep wide diagrams inside printable width cleanly
    if fig_num.startswith("4."):
        width_cm = 15.2 if fig_num == "4.4" else 13.0
    else:
        width_cm = 15.5 if fig_num != "1.1" else 14.8
    run.add_picture(str(img_path), width=Cm(width_cm))

    p_cap = doc.add_paragraph(style="FigureCaption")
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(8)
    add_formatted_runs(p_cap, f"Figure {fig_num}: {caption_text}", base_size=12)


def add_screenshot_placeholder(doc: Document, raw_marker: str):
    # Extract [INSERT FIGURE 4.X: Screenshot of ...]
    m = re.match(r"^\[INSERT\s+FIGURE\s+(4\.\d+):\s*(.+?)\]$", raw_marker)
    fig_num = m.group(1) if m else "4.X"
    desc = m.group(2) if m else raw_marker

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(15.0)
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(15.0)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_row_cant_split(tbl.rows[0])
    shade_cell(cell, "F8FAFC")
    set_cell_margins(cell, top=320, bottom=320, left=220, right=220)
    border_spec = {"val": "dashed", "sz": "6", "space": "0", "color": "64748B"}
    set_cell_borders(cell, top=border_spec, bottom=border_spec, left=border_spec, right=border_spec)

    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.25
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    r1 = p.add_run(raw_marker + "\n")
    set_run_font(r1, size_pt=11, bold=True, color=COLOR_PLACEHOLDER)
    r2 = p.add_run("(Capture live rendered UI screen, crop cleanly, and paste image into this frame.)")
    set_run_font(r2, size_pt=10, italic=True, color=COLOR_MUTED)

    p_cap = doc.add_paragraph(style="FigureCaption")
    p_cap.paragraph_format.space_before = Pt(3)
    p_cap.paragraph_format.space_after = Pt(8)
    add_formatted_runs(p_cap, f"Figure {fig_num}: {desc}.", base_size=12)


def parse_markdown_table(lines: list[str]) -> tuple[list[str], list[list[str]]]:
    rows = []
    for ln in lines:
        raw_line = ln.strip()
        if raw_line.startswith("|"):
            raw_line = raw_line[1:]
        if raw_line.endswith("|") and not raw_line.endswith("\\|"):
            raw_line = raw_line[:-1]
        cells = [c.replace("\\|", "|").strip() for c in re.split(r"(?<!\\)\|", raw_line)]
        rows.append(cells)
    if len(rows) >= 2 and all(re.match(r"^:?-+:?$", c.replace(" ", "")) for c in rows[1]):
        return rows[0], rows[2:]
    return rows[0], rows[1:]


def add_styled_table(doc: Document, table_num: str, caption_text: str, headers: list[str],
                     data_rows: list[list[str]], add_spacer: bool = True):
    p_cap = doc.add_paragraph(style="TableCaption")
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(3)
    p_cap.paragraph_format.keep_with_next = True
    add_formatted_runs(p_cap, f"Table {table_num}: {caption_text}", base_size=12)

    ncols = len(headers)
    tbl = doc.add_table(rows=1 + len(data_rows), cols=ncols)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_table_all_borders(tbl, sz="4", color="475569", val="single")

    widths = TABLE_COL_WIDTHS_CM.get(table_num)
    if not widths or len(widths) != ncols:
        widths = [round(CONTENT_WIDTH_CM / ncols, 2)] * ncols

    # Dense tables use 9.0–9.5 pt for readability inside <= 30 pages
    cell_font_pt = 9.0 if table_num in ("3.1",) else (9.5 if table_num in ("2.1", "3.3", "4.1") else 10.0)

    def _fill_row(row, values, is_header=False):
        set_row_cant_split(row)
        if is_header:
            set_row_header(row)
        for ci, val in enumerate(values):
            cell = row.cells[ci]
            cell.width = Cm(widths[ci])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            set_cell_margins(cell, top=50, bottom=50, left=75, right=75)
            if is_header:
                shade_cell(cell, "EDF2F7")
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.line_spacing = 1.12
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.first_line_indent = Pt(0)
            if is_header or (len(data_rows) <= 6 and p is not None):
                p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, val, base_size=cell_font_pt, base_bold=is_header)

    _fill_row(tbl.rows[0], headers, is_header=True)
    for ri, rvals in enumerate(data_rows):
        padded = rvals + [""] * max(0, ncols - len(rvals))
        _fill_row(tbl.rows[ri + 1], padded[:ncols], is_header=False)
        if len(data_rows) <= 6 and ri == len(data_rows) - 1:
            for cell in tbl.rows[ri + 1].cells:
                cell.paragraphs[0].paragraph_format.keep_with_next = False

    if add_spacer:
        add_tiny_spacer(doc, space_after=4)


# ---------------------------------------------------------------------------
# Front Matter Builder (Pages i - ix)
# ---------------------------------------------------------------------------
def parse_front_sections() -> dict[str, str]:
    raw = (REPORT_DIR / "front_matter.md").read_text(encoding="utf-8")
    sections = {}
    matches = list(re.finditer(r"^##\s+(.+?)\s*$", raw, flags=re.MULTILINE))
    for idx, m in enumerate(matches):
        title = m.group(1).strip()
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw)
        sections[title] = raw[start:end].strip()
    return sections


def build_front_matter(doc: Document):
    fm = parse_front_sections()

    # ----- SECTION 0: TITLE PAGE (Page i, with outer page border) -----
    sec0 = doc.sections[0]
    configure_a4_section(sec0)
    set_section_page_border(sec0, True)
    set_section_numbering(sec0, fmt="lowerRoman", start=1)
    f0 = sec0.footer
    f0.is_linked_to_previous = False
    fp0 = f0.paragraphs[0]
    fp0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_field(fp0, "PAGE", placeholder_text="i", size_pt=11)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.line_spacing = 1.35
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(28)
    r_title = p_title.add_run(
        "Samadhan v2: A Bilingual Web Application for Civic Issue Reporting and Local Helper Discovery"
    )
    set_run_font(r_title, size_pt=18, bold=True)

    title_lines = [
        ("A Report", 13, False, True, 8),
        ("Submitted in partial fulfilment of the requirements for the award of the Degree of", 12, False, True, 8),
        ("Bachelor of Technology", 14, True, True, 6),
        ("in", 12, False, True, 6),
        ("Computer Science and Engineering", 14, True, False, 14),
        ("By", 12, False, True, 12),
        ("Demo Student A (DEMO/001/26, CSE)", 13, True, False, 4),
        ("Demo Student B (DEMO/002/26, CSE)", 13, True, False, 24),
    ]
    for txt, sz, bd, it, aft in title_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(aft)
        r = p.add_run(txt)
        set_run_font(r, size_pt=sz, bold=bd, italic=it)

    emblem_path = FIG_DIR / "institute_emblem.png"
    p_emb = doc.add_paragraph()
    p_emb.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_emb.paragraph_format.space_before = Pt(6)
    p_emb.paragraph_format.space_after = Pt(36)
    p_emb.add_run().add_picture(str(emblem_path), width=Cm(3.5))

    for inst_line, aft in [("Demo Engineering Institute", 4), ("Demo Campus, India", 0)]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(aft)
        r = p.add_run(inst_line)
        set_run_font(r, size_pt=14, bold=True)

    # ----- SECTION 1: CERTIFICATES, ABSTRACT, ACKNOWLEDGEMENT, TOC/LOF/LOT (ii - ix) -----
    sec1 = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_a4_section(sec1)
    set_section_page_border(sec1, False)
    set_section_numbering(sec1, fmt="lowerRoman", start=2)
    f1 = sec1.footer
    f1.is_linked_to_previous = False
    fp1 = f1.paragraphs[0]
    fp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_field(fp1, "PAGE", placeholder_text="ii", size_pt=11)

    # Page ii: APPROVAL OF THE GUIDE
    p_ag = doc.add_paragraph()
    p_ag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ag.paragraph_format.space_before = Pt(24)
    p_ag.paragraph_format.space_after = Pt(24)
    set_run_font(p_ag.add_run("APPROVAL OF THE GUIDE"), size_pt=14, bold=True)

    app_body = (
        "Recommended that the B. Tech. Summer Internship Project titled **Samadhan v2: A Bilingual Web Application "
        "for Civic Issue Reporting and Local Helper Discovery** submitted by "
        "**Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** is approved by me for submission. "
        "This should be accepted as fulfilling the partial requirements for the award of Degree of Bachelor of Technology "
        "in **Computer Science and Engineering**. To the best of my knowledge, the report represents work carried out "
        "by the students in the Department of Computer Science and Engineering, Demo Engineering Institute, "
        "Demo City, and the content of this report has not formed a basis for the award of any previous degree to anyone else."
    )
    add_body_para(doc, app_body, space_after=48, line_spacing=1.65)
    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        [
            "**Faculty Guide**",
            "Assistant Professor",
            "Department of Computer Science and Engineering",
            "Demo Engineering Institute",
        ],
    )

    # Page iii: DECLARATION CERTIFICATE
    p_dc = doc.add_paragraph()
    p_dc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dc.paragraph_format.space_before = Pt(20)
    p_dc.paragraph_format.space_after = Pt(20)
    p_dc.paragraph_format.page_break_before = True
    set_run_font(p_dc.add_run("DECLARATION CERTIFICATE"), size_pt=14, bold=True)

    add_body_para(doc, "We certify that:", align=WD_ALIGN_PARAGRAPH.LEFT, space_after=10)
    clauses = [
        ("a)", "The work contained in the report is original and has been done by us under the general supervision of our supervisor."),
        ("b)", "The work has not been submitted to any other Institute for any other degree or diploma."),
        ("c)", "We have followed the guidelines provided by the Institute in writing the report."),
        ("d)", "We have conformed to the norms and guidelines given in the Ethical Code of Conduct of the Institute."),
        ("e)", "Whenever we have used materials (data, theoretical analysis, and text) from other sources, we have given due credit to them by citing them in the text of the report and giving their details in the references."),
        ("f)", "Whenever we have quoted written materials from other sources, we have put them under quotation marks and given due credit to the sources by citing them and giving required details in the references."),
    ]
    for code, clause in clauses:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.left_indent = Cm(1.3)
        p.paragraph_format.first_line_indent = Cm(-0.7)
        p.paragraph_format.line_spacing = 1.45
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(code + "\t")
        set_run_font(r, size_pt=12)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(1.3), WD_TAB_ALIGNMENT.LEFT)
        add_formatted_runs(p, clause, base_size=12)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(28)
    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        [
            "Demo Student A (DEMO/001/26)",
            "Demo Student B (DEMO/002/26)",
            "Department of Computer Science and Engineering",
            "Demo Engineering Institute",
        ],
    )

    # Page iv: CERTIFICATE OF APPROVAL
    p_ca = doc.add_paragraph()
    p_ca.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ca.paragraph_format.space_before = Pt(24)
    p_ca.paragraph_format.space_after = Pt(24)
    p_ca.paragraph_format.page_break_before = True
    set_run_font(p_ca.add_run("CERTIFICATE OF APPROVAL"), size_pt=14, bold=True)

    add_body_para(doc, "This is to certify that the work embodied in this Summer Internship Report entitled", space_after=8)
    p_qt = doc.add_paragraph()
    p_qt.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_qt.paragraph_format.line_spacing = 1.4
    p_qt.paragraph_format.space_after = Pt(12)
    r_qt = p_qt.add_run("“Samadhan v2: A Bilingual Web Application for Civic Issue Reporting and Local Helper Discovery”,")
    set_run_font(r_qt, size_pt=12, bold=True)

    add_body_para(
        doc,
        "is carried out by **Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** and has been "
        "approved for the degree of Bachelor of Technology in **Computer Science and Engineering** of Birla Institute "
        "of Technology, Demo Campus, Demo City.",
        space_after=48,
        line_spacing=1.6,
    )
    p_dp = doc.add_paragraph()
    p_dp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_dp.paragraph_format.line_spacing = 1.6
    p_dp.paragraph_format.space_after = Pt(54)
    add_formatted_runs(p_dp, "**Date:** 26 November 2026\n**Place:** Demo City", base_size=12)

    add_signature_grid(
        doc,
        ["**(Chairman)**", "Head of the Department", "Dept. of Comp. Sc. & Engg."],
        ["**(Panel Coordinator)**", "Examiner", "Dept. of Comp. Sc. & Engg."],
    )

    # Page v: ABSTRACT
    add_chapter_heading(doc, "ABSTRACT", include_in_toc=True, page_break_before=True)
    abs_raw = fm.get("ABSTRACT (Page v)", "")
    for para_txt in [p.strip() for p in abs_raw.split("\n\n") if p.strip() and not p.strip().startswith("---")]:
        add_body_para(doc, para_txt, space_after=8)

    # Page vi: ACKNOWLEDGEMENT
    add_chapter_heading(doc, "ACKNOWLEDGEMENT", include_in_toc=True, page_break_before=True)
    ack_raw = fm.get("ACKNOWLEDGEMENT (Page vi)", "")
    ack_paras = []
    for block in [p.strip() for p in ack_raw.split("\n\n") if p.strip()]:
        if block.startswith("---") or block.startswith("**Date:**") or block.startswith("**(Signatures)**"):
            continue
        ack_paras.append(block)
    for idx, para_txt in enumerate(ack_paras):
        add_body_para(doc, para_txt, space_after=36 if idx == len(ack_paras) - 1 else 8)

    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        ["**(Signatures)**", "Demo Student A (DEMO/001/26)", "Demo Student B (DEMO/002/26)"],
    )

    # Page vii: CONTENTS
    p_toc_h = add_chapter_heading(doc, "CONTENTS", include_in_toc=False, page_break_before=True)
    p_toc_h.paragraph_format.space_after = Pt(6)
    p_toc = doc.add_paragraph()
    p_toc.paragraph_format.line_spacing = 1.05
    add_field(p_toc, 'TOC \\o "1-3" \\h \\z \\u', placeholder_text="Update field to populate Table of Contents", size_pt=11)

    # Page viii: LIST OF FIGURES
    add_chapter_heading(doc, "LIST OF FIGURES", include_in_toc=True, page_break_before=True)
    p_lof = doc.add_paragraph()
    p_lof.paragraph_format.line_spacing = 1.25
    add_field(p_lof, 'TOC \\h \\z \\t "FigureCaption,1"', placeholder_text="Update field to populate List of Figures", size_pt=12)

    # Page ix: LIST OF TABLES
    add_chapter_heading(doc, "LIST OF TABLES", include_in_toc=True, page_break_before=True)
    p_lot = doc.add_paragraph()
    p_lot.paragraph_format.line_spacing = 1.25
    add_field(p_lot, 'TOC \\h \\z \\t "TableCaption,1"', placeholder_text="Update field to populate List of Tables", size_pt=12)


# ---------------------------------------------------------------------------
# Body Chapters + References Parser
# ---------------------------------------------------------------------------
def render_markdown_chapter(doc: Document, filename: str, add_leading_page_break: bool):
    lines = (REPORT_DIR / filename).read_text(encoding="utf-8").splitlines()
    i = 0
    n = len(lines)

    # Combine "# CHAPTER N" + "## TITLE" cleanly into Heading 1: "CHAPTER N: TITLE"
    if filename == "references.md":
        while i < n and not lines[i].strip().startswith("# "):
            i += 1
        add_chapter_heading(doc, "REFERENCES", include_in_toc=True, page_break_before=add_leading_page_break)
        i += 1
    else:
        chap_label = ""
        chap_title = ""
        while i < n:
            s = lines[i].strip()
            if s.startswith("# "):
                chap_label = s[2:].strip()
            elif s.startswith("## "):
                chap_title = s[3:].strip()
                i += 1
                break
            elif s and not s.startswith("#"):
                break
            i += 1
        full_chap = f"{chap_label}: {chap_title}" if chap_title else chap_label
        add_chapter_heading(doc, full_chap, include_in_toc=True, page_break_before=add_leading_page_break)

    pending_table_caption: tuple[str, str] | None = None

    while i < n:
        line = lines[i]
        s = line.strip()

        if not s or s == "---":
            i += 1
            continue

        # 1. Section Heading (### X.Y ...) -> Heading 2 (16 pt bold)
        if s.startswith("### "):
            heading_txt = s[4:].strip()
            p = doc.add_paragraph(style="Heading 2")
            r = p.add_run(heading_txt)
            set_run_font(r, size_pt=16, bold=True)
            p.paragraph_format.keep_with_next = True
            i += 1
            continue

        # 2. Subsection Heading (#### ...) -> Heading 3 (14 pt bold)
        if s.startswith("#### "):
            sub_txt = s[5:].strip()
            p = doc.add_paragraph(style="Heading 3")
            r = p.add_run(sub_txt)
            set_run_font(r, size_pt=14, bold=True)
            p.paragraph_format.keep_with_next = True
            i += 1
            continue

        # 3. Mermaid Diagram Block + Following Figure Caption
        if s.startswith("```mermaid"):
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                i += 1
            i += 1  # consume closing ```
            while i < n and not lines[i].strip():
                i += 1
            if i < n:
                cap_match = re.match(r"^\*Figure\s+(\d+\.\d+):\s*(.+?)\*$", lines[i].strip())
                if cap_match:
                    add_figure_with_caption(doc, cap_match.group(1), cap_match.group(2))
                    i += 1
                    continue
            continue

        # 4. Equation Block ($$ ... \tag{X.Y} $$)
        if s.startswith("$$"):
            eq_lines = [s]
            while not eq_lines[-1].endswith("$$") and i + 1 < n:
                i += 1
                eq_lines.append(lines[i].strip())
            eq_str = " ".join(eq_lines)
            m_tag = re.search(r"\\tag\{(\d+\.\d+)\}", eq_str)
            i += 1
            more = any(lines[j].strip() and lines[j].strip() != "---" for j in range(i, n))
            if m_tag and m_tag.group(1) in EQUATION_SPECS:
                add_equation_block(doc, m_tag.group(1), add_spacer=more)
            continue

        # 5. Embedded Figure Markdown (`![alt](figures/...)` + `*Figure X.Y: ...*`) or Placeholder
        if re.match(r"^!\[[^\]]*\]\([^)]+\)$", s):
            i += 1
            while i < n and not lines[i].strip():
                i += 1
            if i < n:
                cap_match = re.match(r"^\*Figure\s+(\d+\.\d+):\s*(.+?)\*$", lines[i].strip())
                if cap_match and cap_match.group(1) in FIGURE_FILE_MAP:
                    add_figure_with_caption(doc, cap_match.group(1), cap_match.group(2))
                    i += 1
                    continue
            continue

        if re.match(r"^`?\[INSERT\s+FIGURE\s+4\.\d+:", s):
            add_screenshot_placeholder(doc, s.strip("`"))
            i += 1
            continue

        # 6. Algorithm Block (**Algorithm 3.X: ...** + following 1..N lines)
        alg_match = re.match(r"^\*\*Algorithm\s+(\d+\.\d+:\s*.+?)\*\*$", s)
        if alg_match:
            alg_title = "Algorithm " + alg_match.group(1)
            i += 1
            while i < n and not lines[i].strip():
                i += 1
            steps = []
            while i < n and re.match(r"^\d+\.\s+", lines[i].strip()):
                steps.append(lines[i].strip())
                i += 1
            more = any(lines[j].strip() and lines[j].strip() != "---" for j in range(i, n))
            add_algorithm_block(doc, alg_title, steps, add_spacer=more)
            continue

        # 7. Table Caption (*Table X.Y: ...*) + Pipe Table
        tbl_cap_match = re.match(r"^\*Table\s+(\d+\.\d+):\s*(.+?)\*$", s)
        if tbl_cap_match:
            pending_table_caption = (tbl_cap_match.group(1), tbl_cap_match.group(2))
            i += 1
            continue

        if s.startswith("|"):
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            headers, data_rows = parse_markdown_table(tbl_lines)
            t_num, t_cap = pending_table_caption if pending_table_caption else ("", "Summary Table")
            more = any(lines[j].strip() and lines[j].strip() != "---" for j in range(i, n))
            add_styled_table(doc, t_num, t_cap, headers, data_rows, add_spacer=more)
            pending_table_caption = None
            continue

        # 8. Numbered list item or References entry
        num_match = re.match(r"^(\d+\.)\s+(.+)$", s)
        if num_match:
            add_numbered_or_bullet_para(doc, num_match.group(1), num_match.group(2), compact=(filename == "references.md"))
            i += 1
            continue

        # 9. Bullet item
        bul_match = re.match(r"^[-*]\s+(.+)$", s)
        if bul_match:
            add_numbered_or_bullet_para(doc, "\u2022", bul_match.group(1))
            i += 1
            continue

        # 10. Regular Body Paragraph (combine contiguous lines until blank line)
        para_lines = [s]
        while i + 1 < n:
            nxt = lines[i + 1].strip()
            if (
                not nxt
                or nxt.startswith("#")
                or nxt.startswith("```")
                or nxt.startswith("$$")
                or nxt.startswith("|")
                or nxt == "---"
                or re.match(r"^\*(?:Figure|Table)\s+\d", nxt)
                or re.match(r"^`?\[INSERT\s+FIGURE", nxt)
                or re.match(r"^\*\*Algorithm\s+\d", nxt)
                or re.match(r"^(?:\d+\.|[-*])\s+", nxt)
            ):
                break
            para_lines.append(nxt)
            i += 1
        add_body_para(doc, " ".join(para_lines))
        i += 1


def update_fields_and_export_pdf(docx_path: Path, pdf_path: Path):
    """Use Word COM to recalculate TOC/LOF/LOT/PAGE numbers cleanly and verify printed layout."""
    ps_script = f"""
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {{
    $doc = $word.Documents.Open("{str(docx_path)}")
    foreach ($stName in @("TOC 1", "TOC 2", "TOC 3")) {{
        try {{
            $st = $doc.Styles.Item($stName)
            $st.Font.Name = "Times New Roman"
            $st.Font.Size = 11.5
            $st.ParagraphFormat.LineSpacingRule = 0
            $st.ParagraphFormat.SpaceBefore = 1
            $st.ParagraphFormat.SpaceAfter = 1.5
        }} catch {{}}
    }}
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) {{ $toc.Update() }}
    foreach ($tof in $doc.TablesOfFigures) {{ $tof.Update() }}
    foreach ($sec in $doc.Sections) {{
        foreach ($f in $sec.Footers) {{ $f.Range.Fields.Update() | Out-Null }}
    }}
    $doc.Fields.Update() | Out-Null
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) {{ $toc.Update() }}
    foreach ($tof in $doc.TablesOfFigures) {{ $tof.Update() }}
    $doc.Save()
    # Export PDF (wdExportFormatPDF = 17)
    $doc.ExportAsFixedFormat("{str(pdf_path)}", 17)
    $doc.Close($false)
    Write-Output "WORD_COM_OK"
}} finally {{
    $word.Quit()
}}
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    if res.returncode != 0:
        print("Word COM update warning:", res.stderr.strip())
    else:
        print(res.stdout.strip())


def inspect_pdf_pages(pdf_path: Path):
    import pymupdf
    d = pymupdf.open(str(pdf_path))
    front_pages = 0
    body_pages = 0
    ref_start = None
    chap_starts = {}
    for idx, page in enumerate(d):
        txt = page.get_text("text")
        lines = [l.strip() for l in txt.splitlines() if l.strip()]
        footer = lines[-1] if lines else ""
        if "Page |" in txt:
            body_pages += 1
            for ch in range(1, 6):
                if f"CHAPTER {ch}:" in txt and ch not in chap_starts:
                    chap_starts[ch] = footer
            if "REFERENCES" in txt and ref_start is None and idx > 10:
                ref_start = footer
        else:
            front_pages += 1
    print(f"Total PDF pages: {len(d)} | Front matter: {front_pages} pages | Body + Refs: {body_pages} pages (Limit <= 30)")
    print("Body section starts:", chap_starts, "| REFERENCES:", ref_start)
    # Check raw markdown syntax leak
    leaks = []
    for idx, page in enumerate(d):
        txt = page.get_text("text")
        if "$$" in txt or "```" in txt or "**" in txt:
            leaks.append(idx + 1)
    print("Markdown leak pages:", leaks if leaks else "NONE [PASS]")


def build():
    doc = Document()
    configure_styles(doc)
    build_front_matter(doc)

    # ----- SECTION 2: MAIN BODY (Chapter 1 .. References, Decimal starting 1, Footer "Page | N") -----
    sec2 = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_a4_section(sec2)
    set_section_page_border(sec2, False)
    set_section_numbering(sec2, fmt="decimal", start=1)
    f2 = sec2.footer
    f2.is_linked_to_previous = False
    fp2 = f2.paragraphs[0]
    fp2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_prefix = fp2.add_run("Page | ")
    set_run_font(r_prefix, size_pt=10.5)
    add_field(fp2, "PAGE", placeholder_text="1", size_pt=10.5)

    body_files = [
        "ch1_intro.md",
        "ch2_literature.md",
        "ch3_methodology.md",
        "ch4_results.md",
        "ch5_conclusion.md",
        "references.md",
    ]
    for idx, fname in enumerate(body_files):
        render_markdown_chapter(doc, fname, add_leading_page_break=(idx > 0))

    doc.save(str(OUT_DOCX))
    print("Saved initial DOCX:", OUT_DOCX, f"({OUT_DOCX.stat().st_size} bytes)")
    update_fields_and_export_pdf(OUT_DOCX, OUT_PDF)
    if OUT_PDF.exists():
        inspect_pdf_pages(OUT_PDF)


if __name__ == "__main__":
    build()
