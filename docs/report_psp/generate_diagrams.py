"""
Generate crisp 300-DPI computer-generated figures for the Problem-Solving Platform (Samadhan v2) Report.
Outputs PNG files into docs/report_psp/figures/:
  - fig1_1_two_ecosystems.png
  - fig3_1_local_flow.png
  - fig3_2_global_lifecycle.png
  - fig3_3_architecture.png
"""

from pathlib import Path
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT_DIR = Path(__file__).resolve().parent / "figures"
OUT_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.unicode_minus"] = False

NAVY = "#1B365D"
SLATE = "#334155"
BLUE_FILL = "#EEF4FB"
BLUE_EDGE = "#2B5B84"
TEAL_FILL = "#EDF7F4"
TEAL_EDGE = "#1F6F5B"
AMBER_FILL = "#FDF6E9"
AMBER_EDGE = "#9A5B13"
GRAY_FILL = "#F5F7FA"
GRAY_EDGE = "#64748B"
PURPLE_FILL = "#F3F0FA"
PURPLE_EDGE = "#5B4B8A"
DARK = "#0F172A"


def setup_canvas(w_in: float, h_in: float):
    fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    return fig, ax


def box(ax, x, y, w, h, title, body="", fc="#FFFFFF", ec=SLATE, lw=1.2, pad=0.8,
        title_size=9.0, body_size=7.4, title_color=DARK, title_y_frac=None, body_y_frac=None):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.3,rounding_size={pad}",
        facecolor=fc, edgecolor=ec, linewidth=lw, zorder=2
    )
    ax.add_patch(patch)
    cx = x + w / 2
    if body:
        t_frac = title_y_frac if title_y_frac is not None else (0.71 if "\n" in title else 0.67)
        b_frac = body_y_frac if body_y_frac is not None else 0.28
        ax.text(cx, y + h * t_frac, title, ha="center", va="center", fontsize=title_size,
                fontweight="bold", color=title_color, linespacing=1.2, zorder=4)
        ax.text(cx, y + h * b_frac, body, ha="center", va="center", fontsize=body_size,
                color=SLATE, linespacing=1.32, zorder=4)
    else:
        ax.text(cx, y + h / 2, title, ha="center", va="center", fontsize=title_size,
                fontweight="bold", color=title_color, linespacing=1.25, zorder=4)
    return patch


def container(ax, x, y, w, h, label, fc="#FAFAFA", ec=GRAY_EDGE, label_color=NAVY, label_size=8.4):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.2,rounding_size=1.2",
        facecolor=fc, edgecolor=ec, linewidth=1.1, linestyle="--", zorder=1
    )
    ax.add_patch(patch)
    ax.text(x + 1.5, y + h - 1.8, label, ha="left", va="top",
            fontsize=label_size, fontweight="bold", color=label_color, zorder=3)


def arrow(ax, x1, y1, x2, y2, label="", rad=0.0, color=SLATE, lw=1.2, ls="-",
          lx=None, ly=None, label_size=7.0):
    arr = FancyArrowPatch(
        (x1, y1), (x2, y2),
        connectionstyle=f"arc3,rad={rad}",
        arrowstyle="-|>", mutation_scale=12,
        color=color, linewidth=lw, linestyle=ls, zorder=5
    )
    ax.add_patch(arr)
    if label:
        mx = lx if lx is not None else (x1 + x2) / 2
        my = ly if ly is not None else (y1 + y2) / 2
        ax.text(mx, my, label, ha="center", va="center", fontsize=label_size,
                color=color, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="none", alpha=0.94), zorder=6)


def make_fig1_1():
    fig, ax = setup_canvas(9.4, 4.4)
    box(ax, 20, 79, 60, 16,
        "Problem-Solving Platform (Samadhan v2)",
        "Citizens / Seekers  ·  Local Helpers  ·  Administrators  ·  EN / HI Web App",
        fc=GRAY_FILL, ec=NAVY, lw=1.4, title_size=9.6, body_size=7.6, title_y_frac=0.66, body_y_frac=0.28)

    box(ax, 2, 34, 45.5, 31,
        "LOCAL SERVICES MODE (FREE)",
        "• 9 everyday categories (Medical routed to 112)\n"
        "• Admin-verified helper profiles & search radius filter\n"
        "• Approximate area shown (~110 m); phone hidden\n"
        "• Connect tap reveals contact (10/24h) + gated reviews",
        fc=TEAL_FILL, ec=TEAL_EDGE, lw=1.3, title_size=9.0, body_size=7.1, title_y_frac=0.78, body_y_frac=0.38)

    box(ax, 52.5, 34, 45.5, 31,
        "GLOBAL ISSUE NETWORK",
        "• 8 civic categories with Rs 5 demo report fee\n"
        "• 100 m / 30-day duplicate check + Rs 1 (+1) backing\n"
        "• Tier 1 (Rs 200) social bundle & Tier 2 (Rs 500) dispatch\n"
        "• Full paise refunds if an admin rejects spam",
        fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.3, title_size=9.0, body_size=7.1, title_y_frac=0.78, body_y_frac=0.38)

    box(ax, 6, 4, 88, 18,
        "Shared Platform Services",
        "JWT Auth & Roles   ·   MongoDB 2dsphere & Txns   ·   Notifications & Audit   ·   EN/HI & Offline Drafts",
        fc=PURPLE_FILL, ec=PURPLE_EDGE, lw=1.3, title_size=9.4, body_size=7.0, title_y_frac=0.68, body_y_frac=0.28)

    arrow(ax, 38, 78.7, 25, 65.5, "Local Services", color=TEAL_EDGE, lx=24, ly=73, label_size=7.4)
    arrow(ax, 62, 78.7, 75, 65.5, "Public Issues", color=BLUE_EDGE, lx=76, ly=73, label_size=7.4)
    arrow(ax, 25, 33.7, 36, 22.5, "", color=TEAL_EDGE)
    arrow(ax, 75, 33.7, 64, 22.5, "", color=BLUE_EDGE)

    fig.savefig(OUT_DIR / "fig1_1_two_ecosystems.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_1():
    fig, ax = setup_canvas(9.6, 4.2)
    steps = [
        ("1. Switch to\nLocal Mode", BLUE_FILL, BLUE_EDGE),
        ("2. Pick Trade\n& Location", GRAY_FILL, SLATE),
        ("3. Mutual\nRadius Match", GRAY_FILL, SLATE),
        ("4. View Profile\n(~110 m Area)", TEAL_FILL, TEAL_EDGE),
        ("5. Tap Connect\n(10 / 24h Cap)", AMBER_FILL, AMBER_EDGE),
        ("6. Call or\nWhatsApp", GRAY_FILL, SLATE),
        ("7. Leave Gated\nReview", BLUE_FILL, BLUE_EDGE),
    ]
    w, h = 11.4, 22
    xs = [1.5 + i * 14.0 for i in range(7)]
    for idx, (label, fc, ec) in enumerate(steps):
        box(ax, xs[idx], 58, w, h, label, fc=fc, ec=ec, title_size=6.8)
        if idx < 6:
            arrow(ax, xs[idx] + w + 0.3, 69, xs[idx + 1] - 0.3, 69, color=NAVY)

    box(ax, 6, 16, 88, 28,
        "Privacy & Safety Checks Enforced by the Backend",
        "• Phone numbers and street addresses are omitted from public search and profile responses.\n"
        "• Free text (bios, reviews, price hints) blocks phone digits and links; 3 distinct user flags auto-hide a helper.\n"
        "• Reviews require a saved Connection row; demo sample helpers disable live WhatsApp calls.",
        fc=TEAL_FILL, ec=TEAL_EDGE, title_size=8.8, body_size=7.3, title_y_frac=0.76, body_y_frac=0.33)

    arrow(ax, 50, 57.5, 50, 44.5, "Enforced at API & DB", color=TEAL_EDGE, lx=61, ly=51, label_size=7.1)

    fig.savefig(OUT_DIR / "fig3_1_local_flow.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_2():
    fig, ax = setup_canvas(9.6, 4.4)
    container(ax, 1.5, 50, 97, 46, "(a) Civic Issue Submission, Support & Escalation Pipeline", fc="#FAFAFC", ec=NAVY)
    gsteps = [
        ("1. Fill 4-Step\nReport Form", BLUE_FILL, BLUE_EDGE),
        ("2. 100 m Geo\nDup Check", TEAL_FILL, TEAL_EDGE),
        ("3. Pay Rs 5\nor Rs 1 (+1)", AMBER_FILL, AMBER_EDGE),
        ("4. Transaction\nCommit", GRAY_FILL, SLATE),
        ("5. Tier 1:\nSocial Bundle", BLUE_FILL, BLUE_EDGE),
        ("6. Tier 2:\nDept Dispatch", AMBER_FILL, AMBER_EDGE),
        ("7. Track &\nAuto-Close", TEAL_FILL, TEAL_EDGE),
    ]
    w, h = 11.2, 23
    xs = [3.2 + i * 13.7 for i in range(7)]
    for idx, (label, fc, ec) in enumerate(gsteps):
        box(ax, xs[idx], 62, w, h, label, fc=fc, ec=ec, title_size=7.1)
        if idx < 6:
            arrow(ax, xs[idx] + w + 0.3, 73.5, xs[idx + 1] - 0.3, 73.5, color=NAVY)
    ax.text(50, 54.5, "Rule: Escalation tier (0, 1, 2) stays separate from repair status (ACTIVE -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED).",
            ha="center", va="center", fontsize=6.7, fontweight="bold", color="#9A3412")

    container(ax, 1.5, 6, 97, 38, "(b) Admin Moderation & Rejection Refund Safety", fc="#FFF8F8", ec="#A32A2A")
    osteps = [
        ("Admin Reviews\nFlagged Issue", GRAY_FILL, SLATE),
        ("Marks REJECTED\n(>=10-char note)", "#FCEEEE", "#A32A2A"),
        ("Refunds Every\nUser in Paise", AMBER_FILL, AMBER_EDGE),
        ("Zeroes Fund &\nCancels Logs", GRAY_FILL, SLATE),
        ("Marks Social\nPosts Taken Down", TEAL_FILL, TEAL_EDGE),
    ]
    ow = 16.0
    oxs = [3.5 + i * 19.0 for i in range(5)]
    for idx, (label, fc, ec) in enumerate(osteps):
        box(ax, oxs[idx], 14, ow, 22, label, fc=fc, ec=ec, title_size=7.7)
        if idx < 4:
            arrow(ax, oxs[idx] + ow + 0.3, 25, oxs[idx + 1] - 0.3, 25, color="#A32A2A")

    fig.savefig(OUT_DIR / "fig3_2_global_lifecycle.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_3():
    fig, ax = setup_canvas(9.6, 5.2)

    box(ax, 10, 79, 80, 16,
        "Frontend Web Application (React 18 + Vite PWA)",
        "Tailwind CSS  ·  Leaflet + OpenStreetMap  ·  i18next (817 EN / HI Keys)  ·  7-Day Offline Form Drafts",
        fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.3, title_size=9.4, body_size=7.8, title_y_frac=0.66, body_y_frac=0.28)

    box(ax, 10, 56, 80, 15,
        "Express 5 REST API & Middleware Layer",
        "Helmet  ·  CORS  ·  Zod Input Validation  ·  JWT Auth & Role Checks  ·  Per-IP Rate Limiters",
        fc=TEAL_FILL, ec=TEAL_EDGE, lw=1.3, title_size=9.4, body_size=7.8, title_y_frac=0.66, body_y_frac=0.28)

    engines = [
        ("Wallet & Ledger\nService", "Integer Paise\nIdempotent Keys", AMBER_FILL, AMBER_EDGE),
        ("Global Issues &\nTiers Service", "100 m Dup Check\nTier 1/2 Claims", BLUE_FILL, BLUE_EDGE),
        ("Local Helpers\nService", "Radius Search\nConnect Cap (10/24h)", TEAL_FILL, TEAL_EDGE),
        ("Admin, Dispatch\n& Cron Jobs", "Audit Diffs, SMTP\nAuto-Close (7d)", PURPLE_FILL, PURPLE_EDGE),
    ]
    ew = 20.5
    exs = [4 + i * 23.8 for i in range(4)]
    for idx, (t, b, fc, ec) in enumerate(engines):
        box(ax, exs[idx], 27, ew, 20, t, b, fc=fc, ec=ec, title_size=8.3, body_size=7.2, title_y_frac=0.71, body_y_frac=0.27)
        arrow(ax, exs[idx] + ew / 2, 55.6, exs[idx] + ew / 2, 47.4, "", color=NAVY)
        arrow(ax, exs[idx] + ew / 2, 26.6, exs[idx] + ew / 2, 18.8, "", color=SLATE)

    box(ax, 4, 3, 92, 15.5,
        "MongoDB Atlas Database & External Adapters",
        "17 Collections · 2dsphere Geo Indexes · ACID Transactions · 90-Day TTL Alerts\n"
        "Cloudinary Photo Upload (5 MB) · Nodemailer SMTP & Social Templates (Simulated Fallback)",
        fc=GRAY_FILL, ec=GRAY_EDGE, lw=1.3, title_size=9.1, body_size=7.4, title_y_frac=0.70, body_y_frac=0.29)

    arrow(ax, 50, 78.6, 50, 71.4, "/api/* Bearer JWT", lx=59, ly=75.0, color=NAVY, label_size=7.3)

    fig.savefig(OUT_DIR / "fig3_3_architecture.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


if __name__ == "__main__":
    make_fig1_1()
    make_fig3_1()
    make_fig3_2()
    make_fig3_3()
    print("Generated 4 updated figures in:", OUT_DIR)
