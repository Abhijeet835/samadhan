"""
Automated 4-Gate Self-Audit Script for the Problem-Solving Platform Demo Institute Report.
Checks:
1. Abstract <= 250w with zero citations; Acknowledgement <= 300w; body page estimate <= 30 pages.
2. Zero banned AI cliche words/phrases (exact + common inflections).
3. Citation [n] integrity against references.md ([1]..[10], zero orphans).
4. Cross-document and intra-document 10-word repeated n-grams across authored prose.
5. Generic textbook definition patterns + sentence burstiness (stdev >= 2.2, len <= 32w).
"""

from __future__ import annotations

import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

REPORT_DIR = Path(__file__).resolve().parent

DOC_FILES = [
    "front_matter.md",
    "ch1_intro.md",
    "ch2_literature.md",
    "ch3_methodology.md",
    "ch4_results.md",
    "ch5_conclusion.md",
    "references.md",
]

CHAPTER_FILES = [
    "ch1_intro.md",
    "ch2_literature.md",
    "ch3_methodology.md",
    "ch4_results.md",
    "ch5_conclusion.md",
]

BANNED_PATTERNS = [
    ("delve", r"\bdelv(?:e|es|ed|ing)\b"),
    ("tapestry", r"\btapestr(?:y|ies)\b"),
    ("seamless", r"\bseamless(?:ly|ness)?\b"),
    ("robust", r"\brobust(?:ly|ness)?\b"),
    ("cutting-edge", r"\bcutting[-\s]+edge\b"),
    ("comprehensive ecosystem", r"\bcomprehensive\s+ecosystem\b"),
    ("complementary needs", r"\bcomplementary\s+needs\b"),
    ("leverage", r"\bleverag(?:e|es|ed|ing)\b"),
    ("harness", r"\bharness(?:es|ed|ing)?\b"),
    ("pivotal", r"\bpivotal(?:ly)?\b"),
    ("landscape", r"\blandscapes?\b"),
    ("game-changer", r"\bgame[-\s]+changers?\b"),
    ("multifaceted", r"\bmultifaceted\b"),
    ("streamline", r"\bstreamlin(?:e|es|ed|ing)\b"),
    ("elevate", r"\belevat(?:e|es|ed|ing)\b"),
    ("foster", r"\bfoster(?:s|ed|ing)?\b"),
    ("realm", r"\brealms?\b"),
    ("intricate", r"\bintricate(?:ly)?\b"),
    ("furthermore", r"\bfurthermore\b"),
    ("moreover", r"\bmoreover\b"),
    ("additionally", r"\badditionally\b"),
    ("notably", r"\bnotably\b"),
    ("conversely", r"\bconversely\b"),
    ("similarly", r"\bsimilarly\b"),
    ("rather than", r"\brather\s+than\b"),
    ("instead of", r"\binstead\s+of\b"),
    ("cleanly", r"\bcleanly\b"),
    ("strictly", r"\bstrictly\b"),
    ("explicitly", r"\bexplicitly\b"),
    ("transparently", r"\btransparently\b"),
    ("exclusively", r"\bexclusively\b"),
    ("in conclusion", r"\bin\s+conclusion\b"),
    ("it is worth noting", r"\bit\s+is\s+worth\s+noting\b"),
    ("plays a crucial role", r"\bplay(?:s|ed|ing)?\s+a\s+crucial\s+role\b"),
]

GENERIC_TEXTBOOK_PATTERNS = [
    r"\bis\s+a\s+javascript\s+library\s+for\s+building\b",
    r"\bis\s+a\s+nosql\s+document\s+database\b",
    r"\bis\s+an\s+open[-\s]source\s+(?:relational|library|framework|database)\s+that\b",
    r"\bis\s+a\s+popular\s+(?:web|backend|frontend)\b",
    r"\bin\s+today'?s\s+(?:digital|modern|fast-paced)\s+world\b",
    r"\bplays?\s+an?\s+(?:important|vital|essential)\s+role\b",
    r"\bsince\s+the\s+dawn\s+of\b",
]


def strip_code_and_tables(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"\$\$[\s\S]*?\$\$", " ", text)
    text = re.sub(r"<!--[\s\S]*?-->", " ", text)
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("|") or re.match(r"^`?\[INSERT\s+", s):
            continue
        lines.append(line)
    return "\n".join(lines)


def clean_prose_text(text: str) -> str:
    text = strip_code_and_tables(text)
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or s == "---":
            continue
        if re.match(r"^\*(?:Figure|Table|Algorithm)\s+\d", s) or re.match(r"^!\[[^\]]*\]\([^)]+\)$", s):
            continue
        s = re.sub(r"`([^`]+)`", r"\1", s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
        s = re.sub(r"\*([^*]+)\*", r"\1", s)
        s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
        s = re.sub(r"^\s*[-*+]\s+", "", s)
        s = re.sub(r"^\s*\d+\.\s+", "", s)
        lines.append(s)
    return "\n".join(lines)


def count_words(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", text))


def extract_front_matter_section(text: str, heading: str) -> str:
    pattern = rf"^##\s+{re.escape(heading)}\b.*?\n([\s\S]*?)(?=^##\s+|\Z)"
    m = re.search(pattern, text, flags=re.MULTILINE)
    if not m:
        return ""
    cleaned = []
    for line in m.group(1).splitlines():
        s = line.strip()
        if s.startswith(">") or s.startswith("**Date:**") or s.startswith("**Signatures:**") or s == "---":
            continue
        if s.startswith("**(") or re.match(r"^(Demo Student A|Demo Student B)\s*\(`?BTECH/", s):
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def authored_text_for_file(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    if path.name != "front_matter.md":
        return raw
    return (
        extract_front_matter_section(raw, "ABSTRACT")
        + "\n\n"
        + extract_front_matter_section(raw, "ACKNOWLEDGEMENT")
    )


def split_sentences(paragraph: str) -> list[str]:
    safe = paragraph
    safe = re.sub(r"\b(e\.g|i\.e|et\s+al|Dr|Mr|Ms|Prof|Fig|Eq|No|Vol|pp|Rs|v2)\.", r"\1<DOT>", safe, flags=re.IGNORECASE)
    safe = re.sub(r"(\d)\.(\d)", r"\1<DOT>\2", safe)
    safe = re.sub(r"\b([a-zA-Z0-9_]+)\.(js|jsx|py|md|json)\b", r"\1<DOT>\2", safe)
    safe = re.sub(r"\[[^\]]+\]", "", safe)
    parts = re.split(r"(?<=[.!?])\s+", safe.strip())
    return [p.replace("<DOT>", ".").strip() for p in parts if count_words(p.replace("<DOT>", ".")) >= 3]


def load_valid_ref_ids() -> set[int]:
    ref_file = REPORT_DIR / "references.md"
    if not ref_file.exists():
        return set()
    src = ref_file.read_text(encoding="utf-8")
    return {int(m) for m in re.findall(r"^\s*(\d+)\.\s+[A-Z]", src, flags=re.MULTILINE)}


def find_citations(text: str) -> list[int]:
    no_code = re.sub(r"```[\s\S]*?```", " ", text)
    found: list[int] = []
    for bracket in re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", no_code):
        for num in bracket.split(","):
            found.append(int(num.strip()))
    return found


def check_file(path: Path, valid_refs: set[int]) -> dict:
    raw = path.read_text(encoding="utf-8")
    authored_raw = authored_text_for_file(path)
    prose = clean_prose_text(authored_raw)
    total_words = count_words(prose)
    full_words = count_words(re.sub(r"```[\s\S]*?```", " ", raw))

    scan_text = re.sub(r"<!--[\s\S]*?-->", " ", raw)
    banned_hits = []
    for label, pat in BANNED_PATTERNS:
        for m in re.finditer(pat, scan_text, flags=re.IGNORECASE):
            banned_hits.append((label, m.group(0), scan_text[: m.start()].count("\n") + 1))

    generic_hits = []
    for pat in GENERIC_TEXTBOOK_PATTERNS:
        for m in re.finditer(pat, prose, flags=re.IGNORECASE):
            generic_hits.append(m.group(0))

    raw_paras = re.split(r"\n\s*\n", strip_code_and_tables(authored_raw))
    flat_paragraphs, long_sentences, all_lengths = [], [], []
    for para in raw_paras:
        s = para.strip()
        if not s or s.startswith("#") or s.startswith(">"):
            continue
        clean_p = clean_prose_text(s)
        sents = split_sentences(clean_p)
        lens = [count_words(sent) for sent in sents]
        all_lengths.extend(lens)
        for sent, ln in zip(sents, lens):
            if ln > 32:
                long_sentences.append((ln, sent[:90] + ("..." if len(sent) > 90 else "")))
        if len(lens) >= 3:
            sd = statistics.stdev(lens)
            if sd < 2.2 or (max(lens) - min(lens)) < 4:
                flat_paragraphs.append({"lengths": lens, "stdev": round(sd, 2), "preview": clean_p[:90]})

    cites = find_citations(authored_raw if path.name == "front_matter.md" else raw)
    orphan_cites = sorted({c for c in cites if valid_refs and c not in valid_refs})
    placeholders = re.findall(r"\[INSERT\s+[^\]]+\]", raw)

    special = {}
    if path.name == "front_matter.md":
        abs_text = extract_front_matter_section(raw, "ABSTRACT")
        ack_text = extract_front_matter_section(raw, "ACKNOWLEDGEMENT")
        special = {
            "abstract_words": count_words(clean_prose_text(abs_text)),
            "abstract_citations": find_citations(abs_text),
            "acknowledgement_words": count_words(clean_prose_text(ack_text)),
        }

    return {
        "name": path.name,
        "prose_words": total_words,
        "full_words": full_words,
        "banned_hits": banned_hits,
        "generic_hits": generic_hits,
        "sentence_count": len(all_lengths),
        "sentence_mean": round(statistics.mean(all_lengths), 1) if all_lengths else 0.0,
        "sentence_stdev": round(statistics.stdev(all_lengths), 2) if len(all_lengths) >= 2 else 0.0,
        "sentence_min": min(all_lengths) if all_lengths else 0,
        "sentence_max": max(all_lengths) if all_lengths else 0,
        "flat_paragraphs": flat_paragraphs,
        "long_sentences": long_sentences,
        "citations_used": sorted(set(cites)),
        "orphan_cites": orphan_cites,
        "placeholders": placeholders,
        "special": special,
    }


def check_repeated_ngrams(docs: list[Path], n: int = 10) -> list[dict]:
    occurrences: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for p in docs:
        prose = clean_prose_text(authored_text_for_file(p))
        words = re.findall(r"[a-z0-9]+", prose.lower())
        for i in range(max(0, len(words) - n + 1)):
            occurrences[" ".join(words[i : i + n])].append((p.name, i))
    return [
        {"gram": g, "count": len(locs), "files": sorted({l[0] for l in locs})}
        for g, locs in occurrences.items()
        if len(locs) > 1
    ]


def main() -> int:
    existing = [REPORT_DIR / name for name in DOC_FILES if (REPORT_DIR / name).exists()]
    valid_refs = load_valid_ref_ids()
    results = [check_file(p, valid_refs) for p in existing]
    repeated_10 = check_repeated_ngrams([p for p in existing if p.name != "references.md"], n=10)

    print("=" * 72)
    print("PROBLEM-SOLVING PLATFORM — Demo Institute REPORT AUTOMATED AUDIT")
    print("=" * 72)
    print(f"Verified references: {sorted(valid_refs)}")

    hard_failures = 0
    body_words_total = 0

    for r in results:
        print(f"\n--- {r['name']} ---")
        print(f"Prose words: {r['prose_words']} ({r['full_words']} doc words)")
        if r["name"] in CHAPTER_FILES:
            body_words_total += r["full_words"]
        if r["special"]:
            aw, kw, ac = r["special"]["abstract_words"], r["special"]["acknowledgement_words"], r["special"]["abstract_citations"]
            print(f"  Abstract: {aw}/250 words | Citations: {ac}")
            print(f"  Acknowledgement: {kw}/300 words")
            if aw > 250 or aw == 0 or ac or kw > 300 or kw == 0:
                print("  [FAIL] Front matter constraint violated!")
                hard_failures += 1
        if r["sentence_count"]:
            print(f"  Burstiness: n={r['sentence_count']}, mean={r['sentence_mean']}w, stdev={r['sentence_stdev']}w, range=[{r['sentence_min']}..{r['sentence_max']}]")
        for fp in r["flat_paragraphs"]:
            print(f"  [WARN] Flat cadence (stdev={fp['stdev']}, lens={fp['lengths']}): {fp['preview']}")
        for ln, snip in r["long_sentences"]:
            print(f"  [WARN] Long sentence ({ln}w > 32w): {snip}")
        if r["banned_hits"]:
            hard_failures += len(r["banned_hits"])
            for hit in r["banned_hits"]:
                print(f"  [FAIL] Banned term: {hit}")
        else:
            print("  Banned AI terms: 0 [PASS]")
        if r["generic_hits"]:
            hard_failures += len(r["generic_hits"])
            print(f"  [FAIL] Generic phrasing: {r['generic_hits']}")
        else:
            print("  Generic textbook check: 0 [PASS]")
        if r["orphan_cites"]:
            hard_failures += len(r["orphan_cites"])
            print(f"  [FAIL] Orphan citations: {r['orphan_cites']}")
        elif r["citations_used"]:
            print(f"  Citations: {r['citations_used']} (0 orphans) [PASS]")
        if r["placeholders"]:
            print(f"  Placeholders ({len(r['placeholders'])}): {r['placeholders']}")

    print("\n--- REPEATED 10-WORD N-GRAMS ---")
    if repeated_10:
        hard_failures += len(repeated_10)
        for item in repeated_10:
            print(f"  [FAIL] Repeated ({item['count']}x in {item['files']}): \"{item['gram']}\"")
    else:
        print("  0 repeated 10-word n-grams [PASS]")

    print(f"\nBody words total: {body_words_total} (~{round(body_words_total / 260.0, 1)} A4 pages est.) | Hard failures: {hard_failures}")
    return 1 if hard_failures else 0


if __name__ == "__main__":
    sys.exit(main())
