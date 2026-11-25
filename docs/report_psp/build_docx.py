"""
Build Problem_Solving_Platform_Demo_Institute_Report.docx matching every Demo Institute B.Tech Report Guideline
in docs/Project Report Template.pdf (A4, 2.54 cm margins, Times New Roman, 1.5 line spacing,
zero paragraph indent, Roman front-matter i-ix, Page | N body footer, Word-updated TOC/LOF/LOT,
algorithm frames, 300-DPI figures, and verified references).
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Pt, RGBColor

REPORT_DIR = Path(__file__).resolve().parent
FIG_DIR = REPORT_DIR / "figures"
OUT_DOCX = REPORT_DIR / "Problem_Solving_Platform_Demo_Institute_Report.docx"
OUT_PDF = REPORT_DIR / "Problem_Solving_Platform_Demo_Institute_Report.pdf"

CONTENT_WIDTH_CM = 21.0 - 2 * 2.54  # 15.92 cm exact A4 printable width

COLOR_BLACK = RGBColor(0x00, 0x00, 0x00)
COLOR_PLACEHOLDER = RGBColor(0x8B, 0x00, 0x00)
COLOR_MUTED = RGBColor(0x47, 0x55, 0x69)

FIGURE_FILE_MAP = {
    "1.1": FIG_DIR / "fig1_1_two_ecosystems.png",
    "3.1": FIG_DIR / "fig3_1_local_flow.png",
    "3.2": FIG_DIR / "fig3_2_global_lifecycle.png",
    "3.3": FIG_DIR / "fig3_3_architecture.png",
    "4.1": FIG_DIR / "fig4_1_landing.png",
    "4.2": FIG_DIR / "fig4_2_report_duplicate.png",
    "4.3": FIG_DIR / "fig4_3_issue_detail.png",
    "4.4": FIG_DIR / "fig4_4_maps.png",
    "4.5": FIG_DIR / "fig4_5_admin.png",
}

TABLE_COL_WIDTHS_CM = {
    "2.1": [3.2, 3.8, 4.1, 4.82],
    "3.1": [3.4, 12.52],
    "3.2": [3.4, 3.3, 3.3, 5.92],
    "3.3": [3.0, 4.2, 8.72],
    "4.1": [3.4, 7.32, 5.2],
    "4.2": [3.6, 5.2, 2.0, 5.12],
    "4.3": [4.2, 5.8, 5.92],
}

EQUATION_SPECS = {
    "3.1": {
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
    "3.2": {
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
    "3.3": {
        "lines": [
            [
                ("Fund(i) = 0,   if  i.status = REJECTED", False, False, False, False),
            ],
            [
                ("Fund(i) = Sum of user contributions for i  +  Platform credit(i),   otherwise", False, False, False, False),
            ],
        ],
    },
}


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
    for k in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rFonts.set(qn(k), font_name)


def set_para_double_bottom_border(para, color_hex: str = "000000", sz: str = "6", space: str = "4"):
    pPr = para._p.get_or_add_pPr()
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is not None:
        pPr.remove(pBdr)
    pPr.append(
        parse_xml(
            f'<w:pBdr {nsdecls("w")}>'
            f'  <w:bottom w:val="double" w:sz="{sz}" w:space="{space}" w:color="{color_hex}"/>'
            f'</w:pBdr>'
        )
    )


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


def set_table_all_borders(table, sz: str = "4", color: str = "475569", val: str = "single"):
    tblPr = table._tbl.tblPr
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is not None:
        tblPr.remove(borders)
    tblPr.append(
        parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'</w:tblBorders>'
        )
    )


def set_table_borderless(table):
    tblPr = table._tbl.tblPr
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is not None:
        tblPr.remove(borders)
    tblPr.append(
        parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'  <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'  <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'  <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'  <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'  <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'  <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>'
            f'</w:tblBorders>'
        )
    )


def shade_cell(cell, fill_hex: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is not None:
        tcPr.remove(shd)
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))


def set_cell_margins(cell, top=60, bottom=60, left=85, right=85):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = tcPr.find(qn("w:tcMar"))
    if tcMar is not None:
        tcPr.remove(tcMar)
    tcPr.append(
        parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'  <w:top w:w="{top}" w:type="dxa"/>'
            f'  <w:left w:w="{left}" w:type="dxa"/>'
            f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'  <w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
    )


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
        sectPr.append(
            parse_xml(
                f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
                f'  <w:top w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
                f'  <w:left w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
                f'  <w:bottom w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
                f'  <w:right w:val="single" w:sz="6" w:space="28" w:color="000000"/>'
                f'</w:pgBorders>'
            )
        )


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
    for ftype in ("begin", "instr", "separate", "val", "end"):
        if ftype == "begin":
            r = para.add_run()
            set_run_font(r, size_pt=size_pt, bold=bold)
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), "begin")
            el.set(qn("w:dirty"), "true")
            r._r.append(el)
        elif ftype == "instr":
            r = para.add_run()
            set_run_font(r, size_pt=size_pt, bold=bold)
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = f" {instr} "
            r._r.append(el)
        elif ftype == "separate":
            r = para.add_run()
            set_run_font(r, size_pt=size_pt, bold=bold)
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), "separate")
            r._r.append(el)
        elif ftype == "val":
            r = para.add_run(placeholder_text)
            set_run_font(r, size_pt=size_pt, bold=bold)
        else:
            r = para.add_run()
            set_run_font(r, size_pt=size_pt, bold=bold)
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), "end")
            r._r.append(el)


def configure_a4_section(section):
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)
    section.header_distance = Cm(1.25)
    section.footer_distance = Cm(1.25)


def clean_inline_math(text: str) -> str:
    parts = re.split(r"(`[^`]+`)", text)
    for idx in range(0, len(parts), 2):
        parts[idx] = re.sub(
            r"\$([^$]+)\$",
            lambda m: re.sub(r"\\text\{([^}]*)\}", r"\1", m.group(1)).replace("_", "").strip(),
            parts[idx],
        )
    return "".join(parts)


def add_formatted_runs(para, text: str, base_size: float = 12, base_bold: bool = False,
                       base_italic: bool = False, base_color: RGBColor = COLOR_BLACK):
    text = clean_inline_math(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
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
                set_run_font(para.add_run(plain), size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)
        tok = m.group(0)
        if tok.lstrip("`").startswith("[INSERT "):
            set_run_font(para.add_run(tok.strip("`")), size_pt=base_size, bold=True, color=COLOR_PLACEHOLDER)
        elif tok.startswith("**") and tok.endswith("**"):
            add_formatted_runs(para, tok[2:-2], base_size=base_size, base_bold=True, base_italic=base_italic, base_color=base_color)
        elif tok.startswith("*") and tok.endswith("*"):
            add_formatted_runs(para, tok[1:-1], base_size=base_size, base_bold=base_bold, base_italic=True, base_color=base_color)
        elif tok.startswith("`") and tok.endswith("`"):
            set_run_font(para.add_run(tok[1:-1]), size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)
        pos = m.end()
    if pos < len(text):
        tail = text[pos:]
        if tail:
            set_run_font(para.add_run(tail), size_pt=base_size, bold=base_bold, italic=base_italic, color=base_color)


def configure_styles(doc: Document):
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

    h1 = doc.styles["Heading 1"]
    h1.font.name, h1.font.size, h1.font.bold, h1.font.italic = "Times New Roman", Pt(18), True, True
    h1.font.color.rgb = COLOR_BLACK
    h1.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h1.paragraph_format.line_spacing = 1.15
    h1.paragraph_format.space_before = Pt(0)
    h1.paragraph_format.space_after = Pt(10)
    h1.paragraph_format.keep_with_next = True

    h2 = doc.styles["Heading 2"]
    h2.font.name, h2.font.size, h2.font.bold, h2.font.italic = "Times New Roman", Pt(16), True, False
    h2.font.color.rgb = COLOR_BLACK
    h2.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h2.paragraph_format.line_spacing = 1.15
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(5)
    h2.paragraph_format.keep_with_next = True

    h3 = doc.styles["Heading 3"]
    h3.font.name, h3.font.size, h3.font.bold, h3.font.italic = "Times New Roman", Pt(14), True, False
    h3.font.color.rgb = COLOR_BLACK
    h3.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h3.paragraph_format.line_spacing = 1.15
    h3.paragraph_format.space_before = Pt(10)
    h3.paragraph_format.space_after = Pt(4)
    h3.paragraph_format.keep_with_next = True

    for name in ("TOCHeadingStyle", "FigureCaption", "TableCaption"):
        if name not in doc.styles:
            doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)

    th = doc.styles["TOCHeadingStyle"]
    th.font.name, th.font.size, th.font.bold, th.font.italic = "Times New Roman", Pt(18), True, True
    th.font.color.rgb = COLOR_BLACK
    th.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    th.paragraph_format.space_before = Pt(0)
    th.paragraph_format.space_after = Pt(8)

    for cap_name in ("FigureCaption", "TableCaption"):
        cs = doc.styles[cap_name]
        cs.font.name, cs.font.size, cs.font.bold, cs.font.italic = "Times New Roman", Pt(12), False, False
        cs.font.color.rgb = COLOR_BLACK
        cs.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cs.paragraph_format.line_spacing = 1.15
        cs.paragraph_format.space_before = Pt(4)
        cs.paragraph_format.space_after = Pt(8)


def add_chapter_heading(doc: Document, text: str, include_in_toc: bool = True, page_break_before: bool = False):
    p = doc.add_paragraph(style="Heading 1" if include_in_toc else "TOCHeadingStyle")
    set_run_font(p.add_run(text), size_pt=18, bold=True, italic=True)
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
    set_run_font(p.add_run(prefix + " "), size_pt=12, bold=prefix[0].isdigit())
    add_formatted_runs(p, text, base_size=12)
    return p


def add_tiny_spacer(doc: Document, space_after: float = 3):
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(space_after)
    sp.paragraph_format.line_spacing = 1.0
    set_run_font(sp.add_run(), size_pt=2)


def add_signature_grid(doc: Document, left_lines: list[str], right_lines: list[str]):
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    tbl.columns[0].width = Cm(6.5)
    tbl.columns[1].width = Cm(CONTENT_WIDTH_CM - 6.5)
    c_l, c_r = tbl.rows[0].cells
    c_l.width, c_r.width = Cm(6.5), Cm(CONTENT_WIDTH_CM - 6.5)
    set_row_cant_split(tbl.rows[0])

    for cell, lines, align in ((c_l, left_lines, WD_ALIGN_PARAGRAPH.LEFT), (c_r, right_lines, WD_ALIGN_PARAGRAPH.RIGHT)):
        p = cell.paragraphs[0]
        p.alignment = align
        p.paragraph_format.line_spacing = 1.35
        p.paragraph_format.space_after = Pt(0)
        for idx, line in enumerate(lines):
            if idx > 0:
                p.add_run("\n")
            add_formatted_runs(p, line, base_size=12)


def add_equation_block(doc: Document, eq_num: str, add_spacer: bool = True):
    spec = EQUATION_SPECS[eq_num]
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    tbl.columns[0].width, tbl.columns[1].width = Cm(14.32), Cm(1.60)
    c_eq, c_tag = tbl.rows[0].cells
    c_eq.width, c_tag.width = Cm(14.32), Cm(1.60)
    c_eq.vertical_alignment = c_tag.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_row_cant_split(tbl.rows[0])

    for line_idx, segs in enumerate(spec["lines"]):
        p = c_eq.paragraphs[0] if line_idx == 0 else c_eq.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.2
        p.paragraph_format.space_after = Pt(0)
        for text, is_sub, is_sup, is_it, is_bd in segs:
            r = p.add_run(text)
            set_run_font(r, size_pt=11.5, bold=is_bd, italic=is_it)
            if is_sub:
                r.font.subscript = True
            if is_sup:
                r.font.superscript = True

    p_tag = c_tag.paragraphs[0]
    p_tag.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_tag.paragraph_format.space_after = Pt(0)
    set_run_font(p_tag.add_run(f"({eq_num})"), size_pt=12)
    if add_spacer:
        add_tiny_spacer(doc, space_after=3)


def add_algorithm_block(doc: Document, title: str, steps: list[str], add_spacer: bool = True):
    tbl = doc.add_table(rows=2, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borderless(tbl)
    tbl.autofit = False
    tbl.columns[0].width = Cm(CONTENT_WIDTH_CM)

    c_hdr = tbl.rows[0].cells[0]
    c_hdr.width = Cm(CONTENT_WIDTH_CM)
    set_row_cant_split(tbl.rows[0])
    set_cell_margins(c_hdr, top=65, bottom=65, left=80, right=80)
    set_cell_borders(c_hdr, top={"val": "single", "sz": "8", "space": "0", "color": "000000"},
                     bottom={"val": "single", "sz": "6", "space": "0", "color": "000000"})
    p_h = c_hdr.paragraphs[0]
    p_h.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_h.paragraph_format.line_spacing = 1.2
    p_h.paragraph_format.space_after = Pt(0)
    p_h.paragraph_format.keep_with_next = True
    add_formatted_runs(p_h, title, base_size=12, base_bold=True)

    c_body = tbl.rows[1].cells[0]
    c_body.width = Cm(CONTENT_WIDTH_CM)
    set_row_cant_split(tbl.rows[1])
    set_cell_margins(c_body, top=65, bottom=75, left=100, right=80)
    set_cell_borders(c_body, bottom={"val": "single", "sz": "8", "space": "0", "color": "000000"})
    for i, step in enumerate(steps):
        p = c_body.paragraphs[0] if i == 0 else c_body.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.left_indent = Cm(0.65)
        p.paragraph_format.first_line_indent = Cm(-0.5)
        p.paragraph_format.line_spacing = 1.25
        p.paragraph_format.space_after = Pt(3 if i < len(steps) - 1 else 0)
        add_formatted_runs(p, step, base_size=11.5)

    if add_spacer:
        add_tiny_spacer(doc, space_after=4)


def add_figure_with_caption(doc: Document, fig_num: str, caption_text: str):
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.line_spacing = 1.0
    p_img.paragraph_format.space_before = Pt(4)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    width_cm = 15.2 if fig_num == "4.4" else (13.0 if fig_num.startswith("4.") else 15.0)
    p_img.add_run().add_picture(str(FIGURE_FILE_MAP[fig_num]), width=Cm(width_cm))

    p_cap = doc.add_paragraph(style="FigureCaption")
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(8)
    add_formatted_runs(p_cap, f"Figure {fig_num}: {caption_text}", base_size=12)


def add_screenshot_placeholder(doc: Document, raw_marker: str):
    m = re.match(r"^\[INSERT\s+FIGURE\s+(4\.\d+):\s*(.+?)\]$", raw_marker)
    fig_num, desc = (m.group(1), m.group(2)) if m else ("4.X", raw_marker)

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Cm(15.0)
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(15.0)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_row_cant_split(tbl.rows[0])
    shade_cell(cell, "F8FAFC")
    set_cell_margins(cell, top=300, bottom=300, left=220, right=220)
    b = {"val": "dashed", "sz": "6", "space": "0", "color": "64748B"}
    set_cell_borders(cell, top=b, bottom=b, left=b, right=b)

    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.25
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    set_run_font(p.add_run(raw_marker + "\n"), size_pt=11, bold=True, color=COLOR_PLACEHOLDER)
    set_run_font(p.add_run("(Insert planned UI wireframe or prototype screen capture before final print.)"), size_pt=10, italic=True, color=COLOR_MUTED)

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

    widths = TABLE_COL_WIDTHS_CM.get(table_num) or [round(CONTENT_WIDTH_CM / ncols, 2)] * ncols
    cell_font_pt = 9.5 if table_num in ("2.1", "3.1") else 10.5

    def _fill_row(row, values, is_header=False):
        set_row_cant_split(row)
        if is_header:
            set_row_header(row)
        for ci, val in enumerate(values):
            cell = row.cells[ci]
            cell.width = Cm(widths[ci])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            set_cell_margins(cell, top=55, bottom=55, left=80, right=80)
            if is_header:
                shade_cell(cell, "EDF2F7")
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(0)
            if is_header or len(data_rows) <= 6:
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


def parse_front_sections() -> dict[str, str]:
    raw = (REPORT_DIR / "front_matter.md").read_text(encoding="utf-8")
    sections = {}
    matches = list(re.finditer(r"^##\s+(.+?)\s*$", raw, flags=re.MULTILINE))
    for idx, m in enumerate(matches):
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw)
        sections[m.group(1).strip()] = raw[start:end].strip()
    return sections


def build_front_matter(doc: Document):
    fm = parse_front_sections()

    # SECTION 0: Title Page (Page i, with outer border)
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
    p_title.paragraph_format.space_before = Pt(20)
    p_title.paragraph_format.space_after = Pt(28)
    set_run_font(
        p_title.add_run("Problem-Solving Platform: A Web Application for Local Services and Collective Public Issue Resolution"),
        size_pt=18,
        bold=True,
    )

    for txt, sz, bd, it, aft in [
        ("A Report", 13, False, True, 8),
        ("Submitted in partial fulfilment of the requirements for the award of the Degree of", 12, False, True, 8),
        ("Bachelor of Technology", 14, True, True, 6),
        ("in", 12, False, True, 6),
        ("Computer Science and Engineering", 14, True, False, 14),
        ("By", 12, False, True, 12),
        ("Demo Student A (DEMO/001/26, CSE)", 13, True, False, 4),
        ("Demo Student B (DEMO/002/26, CSE)", 13, True, False, 24),
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(aft)
        set_run_font(p.add_run(txt), size_pt=sz, bold=bd, italic=it)

    p_emb = doc.add_paragraph()
    p_emb.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_emb.paragraph_format.space_before = Pt(6)
    p_emb.paragraph_format.space_after = Pt(36)
    p_emb.add_run().add_picture(str(FIG_DIR / "institute_emblem.png"), width=Cm(3.5))

    for inst_line, aft in [("Demo Engineering Institute", 4), ("Demo Campus, India", 0)]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(aft)
        set_run_font(p.add_run(inst_line), size_pt=14, bold=True)

    # SECTION 1: Certificates, Abstract, Acknowledgement, Contents, Lists (ii - ix)
    sec1 = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_a4_section(sec1)
    set_section_page_border(sec1, False)
    set_section_numbering(sec1, fmt="lowerRoman", start=2)
    f1 = sec1.footer
    f1.is_linked_to_previous = False
    fp1 = f1.paragraphs[0]
    fp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_field(fp1, "PAGE", placeholder_text="ii", size_pt=11)

    # ii: Approval of the Guide
    p_ag = doc.add_paragraph()
    p_ag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ag.paragraph_format.space_before = Pt(24)
    p_ag.paragraph_format.space_after = Pt(24)
    set_run_font(p_ag.add_run("APPROVAL OF THE GUIDE"), size_pt=14, bold=True)

    app_body = (
        "Recommended that the B. Tech. Summer Internship Project titled **Problem-Solving Platform: A Web Application "
        "for Local Services and Collective Public Issue Resolution** submitted by **Demo Student A (DEMO/001/26)** "
        "and **Demo Student B (DEMO/002/26)** is approved by me for submission. This should be accepted as fulfilling the "
        "partial requirements for the award of Degree of Bachelor of Technology in **Computer Science and Engineering**. To the "
        "best of my knowledge, the report represents work carried out by the students in "
        "the Department of Computer Science and Engineering, Demo Engineering Institute, Demo City, "
        "and the content of this report has not formed a basis for the award of any previous degree to anyone else."
    )
    add_body_para(doc, app_body, space_after=48, line_spacing=1.65)
    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        ["**Faculty Guide**", "Assistant Professor", "Department of Computer Science and Engineering", "Demo Engineering Institute"],
    )

    # iii: Declaration Certificate
    p_dc = doc.add_paragraph()
    p_dc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dc.paragraph_format.space_before = Pt(20)
    p_dc.paragraph_format.space_after = Pt(20)
    p_dc.paragraph_format.page_break_before = True
    set_run_font(p_dc.add_run("DECLARATION CERTIFICATE"), size_pt=14, bold=True)

    add_body_para(doc, "We certify that:", align=WD_ALIGN_PARAGRAPH.LEFT, space_after=10)
    clauses = [
        ("a)", "The work contained in the report is original and has been done by ourselves under the general supervision of our supervisor."),
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
        set_run_font(p.add_run(code + "\t"), size_pt=12)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(1.3), WD_TAB_ALIGNMENT.LEFT)
        add_formatted_runs(p, clause, base_size=12)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(28)
    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        ["Demo Student A (DEMO/001/26)", "Demo Student B (DEMO/002/26)", "Department of Computer Science and Engineering", "Demo Engineering Institute"],
    )

    # iv: Certificate of Approval
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
    set_run_font(
        p_qt.add_run("“Problem-Solving Platform: A Web Application for Local Services and Collective Public Issue Resolution”,"),
        size_pt=12,
        bold=True,
    )
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

    # v: Abstract
    add_chapter_heading(doc, "ABSTRACT", include_in_toc=True, page_break_before=True)
    for para_txt in [p.strip() for p in fm.get("ABSTRACT (Page v)", "").split("\n\n") if p.strip() and not p.strip().startswith("---")]:
        add_body_para(doc, para_txt, space_after=8)

    # vi: Acknowledgement
    add_chapter_heading(doc, "ACKNOWLEDGEMENT", include_in_toc=True, page_break_before=True)
    ack_paras = [
        b for b in [p.strip() for p in fm.get("ACKNOWLEDGEMENT (Page vi)", "").split("\n\n") if p.strip()]
        if not (b.startswith("---") or b.startswith("**Date:**") or b.startswith("**(Signatures)**"))
    ]
    for idx, para_txt in enumerate(ack_paras):
        add_body_para(doc, para_txt, space_after=36 if idx == len(ack_paras) - 1 else 8)
    add_signature_grid(
        doc,
        ["**Date:** 26 November 2026"],
        ["**(Signatures)**", "Demo Student A (DEMO/001/26)", "Demo Student B (DEMO/002/26)"],
    )

    # vii: Contents
    p_toc_h = add_chapter_heading(doc, "CONTENTS", include_in_toc=False, page_break_before=True)
    p_toc_h.paragraph_format.space_after = Pt(4)
    p_toc = doc.add_paragraph()
    p_toc.paragraph_format.line_spacing = 1.0
    p_toc.paragraph_format.space_after = Pt(0)
    add_field(p_toc, 'TOC \\o "1-3" \\h \\z \\u', placeholder_text="Update field to populate Table of Contents", size_pt=10.5)

    # viii: List of Figures
    add_chapter_heading(doc, "LIST OF FIGURES", include_in_toc=True, page_break_before=True)
    p_lof = doc.add_paragraph()
    p_lof.paragraph_format.line_spacing = 1.25
    add_field(p_lof, 'TOC \\h \\z \\t "FigureCaption,1"', placeholder_text="Update field to populate List of Figures", size_pt=12)

    # ix: List of Tables
    add_chapter_heading(doc, "LIST OF TABLES", include_in_toc=True, page_break_before=True)
    p_lot = doc.add_paragraph()
    p_lot.paragraph_format.line_spacing = 1.25
    add_field(p_lot, 'TOC \\h \\z \\t "TableCaption,1"', placeholder_text="Update field to populate List of Tables", size_pt=12)


def render_markdown_chapter(doc: Document, filename: str, add_leading_page_break: bool):
    lines = (REPORT_DIR / filename).read_text(encoding="utf-8").splitlines()
    i, n = 0, len(lines)

    if filename in ("references.md", "appendix.md"):
        chap_label, chap_title = "", ""
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
        if filename == "references.md":
            add_chapter_heading(doc, "REFERENCES", include_in_toc=True, page_break_before=add_leading_page_break)
        else:
            full_app = f"{chap_label}: {chap_title}" if chap_title else chap_label
            add_chapter_heading(doc, full_app, include_in_toc=True, page_break_before=add_leading_page_break)
    else:
        chap_label, chap_title = "", ""
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
        add_chapter_heading(doc, f"{chap_label}: {chap_title}" if chap_title else chap_label, include_in_toc=True, page_break_before=add_leading_page_break)

    pending_table_caption: tuple[str, str] | None = None

    while i < n:
        s = lines[i].strip()
        if not s or s == "---":
            i += 1
            continue

        if s.startswith("### "):
            p = doc.add_paragraph(style="Heading 2")
            set_run_font(p.add_run(s[4:].strip()), size_pt=16, bold=True)
            p.paragraph_format.keep_with_next = True
            i += 1
            continue

        if s.startswith("#### "):
            p = doc.add_paragraph(style="Heading 3")
            set_run_font(p.add_run(s[5:].strip()), size_pt=14, bold=True)
            p.paragraph_format.keep_with_next = True
            i += 1
            continue

        if s.startswith("```mermaid"):
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                i += 1
            i += 1
            while i < n and not lines[i].strip():
                i += 1
            if i < n:
                cap_match = re.match(r"^\*Figure\s+(\d+\.\d+):\s*(.+?)\*$", lines[i].strip())
                if cap_match:
                    add_figure_with_caption(doc, cap_match.group(1), cap_match.group(2))
                    i += 1
                    continue
            continue

        if s.startswith("$$"):
            eq_lines = [s]
            while not eq_lines[-1].endswith("$$") and i + 1 < n:
                i += 1
                eq_lines.append(lines[i].strip())
            m_tag = re.search(r"\\tag\{(\d+\.\d+)\}", " ".join(eq_lines))
            i += 1
            more = any(lines[j].strip() and lines[j].strip() != "---" for j in range(i, n))
            if m_tag and m_tag.group(1) in EQUATION_SPECS:
                add_equation_block(doc, m_tag.group(1), add_spacer=more)
            continue

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
            t_num, t_cap = pending_table_caption or ("", "Summary Table")
            more = any(lines[j].strip() and lines[j].strip() != "---" for j in range(i, n))
            add_styled_table(doc, t_num, t_cap, headers, data_rows, add_spacer=more)
            pending_table_caption = None
            continue

        num_match = re.match(r"^(\d+\.)\s+(.+)$", s)
        if num_match:
            add_numbered_or_bullet_para(doc, num_match.group(1), num_match.group(2), compact=(filename == "references.md"))
            i += 1
            continue

        bul_match = re.match(r"^[-*]\s+(.+)$", s)
        if bul_match:
            add_numbered_or_bullet_para(doc, "\u2022", bul_match.group(1))
            i += 1
            continue

        para_lines = [s]
        while i + 1 < n:
            nxt = lines[i + 1].strip()
            if (
                not nxt or nxt.startswith("#") or nxt.startswith("```") or nxt.startswith("$$") or nxt.startswith("|") or nxt == "---"
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
            $st.Font.Size = 10.5
            $st.ParagraphFormat.LineSpacingRule = 0
            $st.ParagraphFormat.SpaceBefore = 0
            $st.ParagraphFormat.SpaceAfter = 0.5
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
    $doc.ExportAsFixedFormat("{str(pdf_path)}", 17)
    $doc.Close($false)
    Write-Output "WORD_COM_OK"
}} finally {{
    $word.Quit()
}}
"""
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    print(res.stdout.strip() if res.returncode == 0 else f"Word COM warning: {res.stderr.strip()}")


def inspect_pdf_pages(pdf_path: Path):
    import pymupdf
    d = pymupdf.open(str(pdf_path))
    front, body, blank, leaks = 0, 0, [], []
    for idx, page in enumerate(d):
        txt = page.get_text("text")
        lines = [l.strip() for l in txt.splitlines() if l.strip()]
        core = [l for l in lines if not l.startswith("Page |") and l not in ("i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x")]
        if not core:
            blank.append(idx + 1)
        if "Page |" in txt:
            body += 1
        else:
            front += 1
        if "$$" in txt or "```" in txt or "**" in txt:
            leaks.append(idx + 1)
    print(f"Total PDF pages: {len(d)} | Front: {front} pages | Body+Refs: {body} pages (Limit <= 30)")
    print("Blank pages:", blank if blank else "NONE", "| Markdown leaks:", leaks if leaks else "NONE")


def build():
    doc = Document()
    configure_styles(doc)
    build_front_matter(doc)

    sec2 = doc.add_section(WD_SECTION.NEW_PAGE)
    configure_a4_section(sec2)
    set_section_page_border(sec2, False)
    set_section_numbering(sec2, fmt="decimal", start=1)
    f2 = sec2.footer
    f2.is_linked_to_previous = False
    fp2 = f2.paragraphs[0]
    fp2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_run_font(fp2.add_run("Page | "), size_pt=10.5)
    add_field(fp2, "PAGE", placeholder_text="1", size_pt=10.5)

    for idx, fname in enumerate(["ch1_intro.md", "ch2_literature.md", "ch3_methodology.md", "ch4_results.md", "ch5_conclusion.md", "appendix.md", "references.md"]):
        render_markdown_chapter(doc, fname, add_leading_page_break=(idx > 0))

    doc.save(str(OUT_DOCX))
    print("Saved DOCX:", OUT_DOCX, f"({OUT_DOCX.stat().st_size} bytes)")
    update_fields_and_export_pdf(OUT_DOCX, OUT_PDF)
    if OUT_PDF.exists():
        inspect_pdf_pages(OUT_PDF)


if __name__ == "__main__":
    build()
