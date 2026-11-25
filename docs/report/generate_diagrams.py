"""
Generate clean 300-DPI computer-generated figures for the Samadhan v2 report.
Outputs PNG files into docs/report/figures/:
  - fig1_1_dual_mode.png
  - fig3_1_architecture.png
  - fig3_2_dfd.png
  - fig3_3_state_machine.png
"""

from pathlib import Path
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon, Circle, Ellipse

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
RED_FILL = "#FCEEEE"
RED_EDGE = "#A32A2A"
DARK = "#0F172A"


def setup_canvas(w_in: float, h_in: float):
    fig, ax = plt.subplots(figsize=(w_in, h_in), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    return fig, ax


def box(ax, x, y, w, h, title, body="", fc="#FFFFFF", ec=SLATE, lw=1.2, pad=0.8,
        title_size=9.0, body_size=7.4, title_color=DARK, linestyle="-",
        title_y_frac=None, body_y_frac=None):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.3,rounding_size={pad}",
        facecolor=fc, edgecolor=ec, linewidth=lw, linestyle=linestyle, zorder=2
    )
    ax.add_patch(patch)
    cx = x + w / 2
    if body:
        t_frac = title_y_frac if title_y_frac is not None else (0.71 if "\n" in title else 0.68)
        b_frac = body_y_frac if body_y_frac is not None else 0.28
        ax.text(cx, y + h * t_frac, title,
                ha="center", va="center", fontsize=title_size, fontweight="bold",
                color=title_color, linespacing=1.18, zorder=4)
        ax.text(cx, y + h * b_frac, body,
                ha="center", va="center", fontsize=body_size, color=SLATE,
                linespacing=1.32, zorder=4)
    else:
        ax.text(cx, y + h / 2, title,
                ha="center", va="center", fontsize=title_size, fontweight="bold",
                color=title_color, linespacing=1.25, zorder=4)
    return patch


def container(ax, x, y, w, h, label, fc="#FAFAFA", ec=GRAY_EDGE, lw=1.1, label_color=NAVY, label_size=8.4):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.2,rounding_size=1.2",
        facecolor=fc, edgecolor=ec, linewidth=lw, linestyle="--", zorder=1
    )
    ax.add_patch(patch)
    ax.text(x + 1.4, y + h - 1.8, label, ha="left", va="top",
            fontsize=label_size, fontweight="bold", color=label_color, zorder=3)
    return patch


def arrow(ax, x1, y1, x2, y2, label="", rad=0.0, color=SLATE, lw=1.2, ls="-",
          lx=None, ly=None, lx_off=0.0, ly_off=0.0, label_size=7.2, style="-|>", mutation=12):
    arr = FancyArrowPatch(
        (x1, y1), (x2, y2),
        connectionstyle=f"arc3,rad={rad}",
        arrowstyle=style, mutation_scale=mutation,
        color=color, linewidth=lw, linestyle=ls, zorder=5
    )
    ax.add_patch(arr)
    if label:
        mx = (lx if lx is not None else (x1 + x2) / 2) + lx_off
        my = (ly if ly is not None else (y1 + y2) / 2) + ly_off
        ax.text(mx, my, label, ha="center", va="center", fontsize=label_size,
                color=color, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor="none", alpha=0.94), zorder=6)


def cylinder(ax, x, y, w, h, title, body="", fc=AMBER_FILL, ec=AMBER_EDGE, title_size=8.3, body_size=7.0):
    ry = h * 0.14
    body_rect = FancyBboxPatch(
        (x, y + ry * 0.4), w, h - ry * 0.9,
        boxstyle="square,pad=0", facecolor=fc, edgecolor=ec, linewidth=1.2, zorder=2
    )
    ax.add_patch(body_rect)
    top = Ellipse((x + w / 2, y + h - ry * 0.5), w, ry, facecolor="#FFFDF7", edgecolor=ec, linewidth=1.2, zorder=3)
    bot = Ellipse((x + w / 2, y + ry * 0.4), w, ry, facecolor=fc, edgecolor=ec, linewidth=1.2, zorder=1)
    ax.add_patch(bot)
    ax.add_patch(top)
    ax.text(x + w / 2, y + h * 0.56, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=DARK, zorder=4)
    if body:
        ax.text(x + w / 2, y + h * 0.27, body, ha="center", va="center", fontsize=body_size, color=SLATE, linespacing=1.3, zorder=4)


def diamond(ax, cx, cy, w, h, label, fc=AMBER_FILL, ec=AMBER_EDGE, fontsize=7.0):
    pts = [(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)]
    poly = Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=1.2, zorder=3)
    ax.add_patch(poly)
    ax.text(cx, cy, label, ha="center", va="center", fontsize=fontsize, fontweight="bold", color=DARK, linespacing=1.18, zorder=4)


def make_fig1_1():
    fig, ax = setup_canvas(9.4, 4.6)
    box(ax, 25, 79, 50, 17,
        "User Account",
        "English and Hindi Interface  |  Demo Wallet (Stored in Paise)",
        fc=GRAY_FILL, ec=NAVY, lw=1.4, title_size=9.8, body_size=8.0,
        title_y_frac=0.66, body_y_frac=0.29)

    box(ax, 2.5, 34, 45, 31,
        "GLOBAL MODE — Civic Issues",
        "• Rs 5 report fee (500 paise) + wallet record\n"
        "• Checks nearby issues within 100 m (last 30 days)\n"
        "• Neighbours add +1 support for Rs 1 (100 paise)\n"
        "• Unlocks social posts (Rs 200) & email (Rs 500)",
        fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.3, title_size=8.9, body_size=7.3,
        title_y_frac=0.78, body_y_frac=0.38)

    box(ax, 52.5, 34, 45, 31,
        "LOCAL MODE — Verified Helpers (Free)",
        "• 9 home services (Medical redirected to 112)\n"
        "• Checks both user & helper search radius\n"
        "• Phone hidden until Connect (10 per 24h limit)\n"
        "• Approximate area shown + reviews after Connect",
        fc=TEAL_FILL, ec=TEAL_EDGE, lw=1.3, title_size=8.9, body_size=7.3,
        title_y_frac=0.78, body_y_frac=0.38)

    box(ax, 7, 4, 86, 19,
        "Shared Backend & Database Core",
        "Login & Role Checks (JWT)  |  MongoDB Atlas (17 Collections, Geo Index, Transactions)\n"
        "Admin Audit Trail  |  90-Day Notification CleFaculty  |  Offline Draft Auto-Save",
        fc="#F3F0FA", ec="#5B4B8A", lw=1.3, title_size=9.3, body_size=7.7,
        title_y_frac=0.72, body_y_frac=0.31)

    arrow(ax, 38, 78.7, 25, 65.5, "Global Mode", rad=0.06, color=BLUE_EDGE, lx_off=-5.5, ly_off=0.6)
    arrow(ax, 62, 78.7, 75, 65.5, "Local Mode", rad=-0.06, color=TEAL_EDGE, lx_off=5.5, ly_off=0.6)
    arrow(ax, 25, 33.7, 36, 23.5, "", color=BLUE_EDGE)
    arrow(ax, 75, 33.7, 64, 23.5, "", color=TEAL_EDGE)

    fig.savefig(OUT_DIR / "fig1_1_dual_mode.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_1():
    fig, ax = setup_canvas(9.8, 5.2)

    container(ax, 1.5, 18, 27, 77, "React Frontend (:5173)", fc=BLUE_FILL, ec=BLUE_EDGE, label_size=8.1)
    box(ax, 3.8, 67, 22.4, 18, "App Pages", "Global · Local\nLeaflet Maps · Admin", fc="white", ec=BLUE_EDGE, title_size=8.4, body_size=7.2)
    box(ax, 3.8, 44, 22.4, 18, "Language Switcher", "817 EN / 817 HI Keys\nHindi Font Support", fc="white", ec=BLUE_EDGE, title_size=8.4, body_size=7.2)
    box(ax, 3.8, 21, 22.4, 18, "Offline Shell (43 Files)", "Static Assets Cached\nAPI Calls Excluded", fc="white", ec=BLUE_EDGE, title_size=8.0, body_size=7.2)

    container(ax, 35.5, 18, 29, 77, "Express API Server (:5000)", fc=TEAL_FILL, ec=TEAL_EDGE, label_size=8.1)
    box(ax, 37.8, 67, 24.4, 18, "Request Checks", "Headers · CORS · 100 KB Limit\nZod Check · JWT · Rate Limit", fc="white", ec=TEAL_EDGE, title_size=8.4, body_size=7.1)
    box(ax, 37.8, 44, 24.4, 18, "13 Feature Services", "Wallet · Issues · Tiers\nHelpers · Admin · Email", fc="white", ec=TEAL_EDGE, title_size=8.4, body_size=7.1)
    box(ax, 37.8, 21, 24.4, 18, "Scheduled Tasks", "Auto-Close (1h) · Retry (10m)\nCron Webhook Endpoint", fc="white", ec=TEAL_EDGE, title_size=8.3, body_size=7.1)

    container(ax, 71, 46, 27.5, 49, "External Adapters (Fallback)", fc=GRAY_FILL, ec=GRAY_EDGE, label_size=8.0)
    box(ax, 73.2, 74.5, 23, 11.5, "Cloudinary Photos", "5 MB Limit (503 if unset)", fc="white", ec=GRAY_EDGE, title_size=8.1, body_size=6.9)
    box(ax, 73.2, 60.8, 23, 11.5, "Email & Webhook", "Saved as Simulated if unset", fc="white", ec=GRAY_EDGE, title_size=8.1, body_size=6.9)
    box(ax, 73.2, 47.5, 23, 11.5, "Social Post Templates", "Buffer · Telegram · Reddit", fc="white", ec=GRAY_EDGE, title_size=8.1, body_size=6.9)

    cylinder(ax, 71, 16, 27.5, 24.5, "MongoDB Atlas",
             "17 Collections · Geo Indexes\nTransactions · 90-Day TTL",
             fc=AMBER_FILL, ec=AMBER_EDGE, title_size=8.0, body_size=6.8)

    box(ax, 3.8, 3, 22.4, 10, "Browser Draft Storage", "Saves Form Text for 7 Days", fc="#F8FAFC", ec=GRAY_EDGE, title_size=8.0, body_size=6.9)
    box(ax, 37.8, 3, 24.4, 10, "Public Share Link (/i/:id)", "Share Preview & Click Count", fc="#F8FAFC", ec=GRAY_EDGE, title_size=8.0, body_size=6.9)

    arrow(ax, 26.5, 76, 37.5, 76, "/api/* Token", ly_off=3.2, color=NAVY, label_size=7.2)
    arrow(ax, 50, 66.8, 50, 62.3, "", color=TEAL_EDGE)
    arrow(ax, 50, 39.3, 50, 43.7, "", color=TEAL_EDGE)
    arrow(ax, 62.5, 48.5, 70.8, 28, "DB Read/Write", rad=-0.06, color=AMBER_EDGE, lx_off=0.2, ly_off=-4.5, label_size=7.0)
    arrow(ax, 62.5, 57, 72.9, 80, "", color=GRAY_EDGE, ls="-.")
    arrow(ax, 62.5, 54, 72.9, 66.5, "After Commit", color=GRAY_EDGE, lx_off=-0.4, ly_off=3.2, label_size=7.0)
    arrow(ax, 62.5, 51, 72.9, 53, "", color=GRAY_EDGE)
    arrow(ax, 15, 20.8, 15, 13.3, "", color=GRAY_EDGE, ls="--")
    arrow(ax, 26.5, 8, 37.5, 8, "Share Link", ly_off=2.8, color=GRAY_EDGE, ls=":", label_size=7.0)
    arrow(ax, 50, 20.8, 50, 13.3, "", color=TEAL_EDGE, ls="--")

    fig.savefig(OUT_DIR / "fig3_1_architecture.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_2():
    fig, ax = setup_canvas(9.8, 6.6)

    container(ax, 1.5, 72, 97, 26, "(a) Level 0 Context Diagram", fc="#F8FAFC", ec=NAVY, label_size=8.4)
    box(ax, 3.5, 84, 18.5, 7.8, "Citizen / Resident", fc="white", ec=BLUE_EDGE, title_size=8.3)
    box(ax, 3.5, 74, 18.5, 7.8, "Local Helper", fc="white", ec=TEAL_EDGE, title_size=8.3)
    box(ax, 40.5, 75, 20, 16, "Samadhan v2\nPlatform", fc=BLUE_FILL, ec=NAVY, lw=1.4, title_size=9.2)
    box(ax, 78, 84, 18.5, 7.8, "Admin", fc="white", ec=SLATE, title_size=8.3)
    box(ax, 78, 74, 18.5, 7.8, "Civic Department", fc="white", ec=AMBER_EDGE, title_size=8.3)

    arrow(ax, 22.3, 87.8, 40.2, 85.2, "Report / Support / Connect", color=BLUE_EDGE, lx=31.2, ly=89.6, label_size=6.8)
    arrow(ax, 22.3, 77.8, 40.2, 79.8, "Register / Availability", color=TEAL_EDGE, lx=31.2, ly=75.2, label_size=6.8)
    arrow(ax, 77.7, 87.8, 60.8, 85.2, "Verify / Moderate / Credit", color=SLATE, lx=69.3, ly=89.6, label_size=6.8)
    arrow(ax, 60.8, 79.8, 77.7, 77.8, "Tier 2 Email", color=AMBER_EDGE, lx=69.3, ly=75.2, label_size=6.8)

    container(ax, 1.5, 2, 97, 67, "(b) Level 1 Data Flows", fc="#FFFFFF", ec=SLATE, label_size=8.4)

    ax.text(3.5, 61.8, "Global Civic Issue Flow", fontsize=8.1, fontweight="bold", color=BLUE_EDGE)
    box(ax, 3.5, 44.5, 13.5, 14.5, "1.1 Report\nForm", "Details + Pin\n+ Retry Key",
        fc=BLUE_FILL, ec=BLUE_EDGE, title_size=7.6, body_size=6.7, title_y_frac=0.69, body_y_frac=0.25)
    box(ax, 19.5, 44.5, 15.5, 14.5, "1.2 Nearby\nCheck", "100 m & 30 Days\nReplay Checked First",
        fc=BLUE_FILL, ec=BLUE_EDGE, title_size=7.6, body_size=6.7, title_y_frac=0.69, body_y_frac=0.25)
    diamond(ax, 43.2, 51.8, 12.2, 12.5, "Nearby\nMatch?", fontsize=6.7)
    box(ax, 55.5, 52.2, 17, 11.2, "1.3 Pay & Save", "-Rs 5 + New Issue\n+ Wallet Log",
        fc=AMBER_FILL, ec=AMBER_EDGE, title_size=7.6, body_size=6.7, title_y_frac=0.72, body_y_frac=0.29)
    box(ax, 55.5, 37.0, 17, 11.2, "1.4 Support +1", "Prompt on 409\n-Rs 1 Contribution",
        fc=TEAL_FILL, ec=TEAL_EDGE, title_size=7.6, body_size=6.7, title_y_frac=0.72, body_y_frac=0.29)
    box(ax, 77.5, 43.2, 18.5, 14.5, "1.5 Tier Check\n(After Commit)", "Single Winner Claim\nSocial + Email",
        fc="#F3F0FA", ec="#5B4B8A", title_size=7.6, body_size=6.7, title_y_frac=0.69, body_y_frac=0.25)

    arrow(ax, 17.2, 51.8, 19.3, 51.8, "", color=BLUE_EDGE)
    arrow(ax, 35.2, 51.8, 37.0, 51.8, "", color=BLUE_EDGE)
    arrow(ax, 49.4, 53.4, 55.2, 57.2, "No / Override", color=AMBER_EDGE, lx=50.5, ly=59.5, label_size=6.5)
    arrow(ax, 43.2, 45.3, 55.2, 42.0, "Yes (409)", rad=0.12, color=TEAL_EDGE, lx=47.0, ly=39.8, label_size=6.5)
    arrow(ax, 72.7, 57.0, 77.2, 52.8, "", color=NAVY)
    arrow(ax, 72.7, 42.5, 77.2, 47.4, "", color=NAVY)

    ax.plot([3.5, 96.5], [33.5, 33.5], color="#CBD5E1", linestyle=":", linewidth=1.0)

    ax.text(3.5, 29.8, "Local Helper Search & Connect Flow", fontsize=8.1, fontweight="bold", color=TEAL_EDGE)
    box(ax, 3.5, 6.5, 18.5, 18.5, "2.1 User Search", "Location + Radius\n(2 / 5 / 10 km)",
        fc=TEAL_FILL, ec=TEAL_EDGE, title_size=7.8, body_size=6.9, title_y_frac=0.71, body_y_frac=0.28)
    box(ax, 26, 6.5, 20.5, 18.5, "2.2 Geo Match &\nHelper Radius", "Verified & Visible\nd <= min(user, helper)",
        fc=TEAL_FILL, ec=TEAL_EDGE, title_size=7.8, body_size=6.8, title_y_frac=0.69, body_y_frac=0.25)
    box(ax, 50.5, 6.5, 19.5, 18.5, "2.3 Mask Private\nLocation", "Hide Address & Phone\nRound to ~110 m",
        fc=TEAL_FILL, ec=TEAL_EDGE, title_size=7.8, body_size=6.8, title_y_frac=0.69, body_y_frac=0.25)
    box(ax, 76.5, 6.5, 19.5, 18.5, "2.4 Connect Gate\n(10 / 24h Limit)", "Check Daily Cap\nReveal Phone & Log",
        fc=AMBER_FILL, ec=AMBER_EDGE, title_size=7.8, body_size=6.8, title_y_frac=0.69, body_y_frac=0.25)

    arrow(ax, 22.3, 15.8, 25.8, 15.8, "", color=TEAL_EDGE)
    arrow(ax, 46.8, 15.8, 50.2, 15.8, "", color=TEAL_EDGE)
    arrow(ax, 70.3, 15.8, 76.2, 15.8, "Click\nConnect", lx=73.2, ly=21.2, color=AMBER_EDGE, label_size=6.5)

    fig.savefig(OUT_DIR / "fig3_2_dfd.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


def make_fig3_3():
    fig, ax = setup_canvas(9.8, 5.8)

    ax.text(50, 96, "Note: The escalation tier (0, 1, or 2) is stored in a separate field so status updates never reset it.",
            ha="center", va="center", fontsize=7.8, style="italic", color=SLATE,
            bbox=dict(boxstyle="round,pad=0.32", facecolor="#F8FAFC", edgecolor="#CBD5E1"))

    start = Circle((4.2, 46), 1.8, facecolor=DARK, edgecolor=DARK, zorder=4)
    ax.add_patch(start)

    box(ax, 9.5, 39, 13.5, 14, "ACTIVE", "Created with\nRs 5 Fee", fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.4,
        title_size=9.0, body_size=7.0, title_y_frac=0.70, body_y_frac=0.28)
    box(ax, 30.5, 58.5, 18.5, 13.0, "ACKNOWLEDGED", "Seen by Admin /\nAssigned", fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.3,
        title_size=8.5, body_size=7.0, title_y_frac=0.70, body_y_frac=0.27)
    box(ax, 33.5, 22.5, 17, 13.0, "IN_PROGRESS", "Repair Work\nUnderway", fc=BLUE_FILL, ec=BLUE_EDGE, lw=1.3,
        title_size=8.6, body_size=7.0, title_y_frac=0.70, body_y_frac=0.27)
    box(ax, 63.5, 39, 14.5, 14, "RESOLVED", "Marked Fixed\n7-Day Timer", fc=TEAL_FILL, ec=TEAL_EDGE, lw=1.4,
        title_size=8.9, body_size=7.0, title_y_frac=0.70, body_y_frac=0.28)
    box(ax, 85, 39, 13, 14, "CLOSED", "Final\nState", fc=GRAY_FILL, ec=SLATE, lw=1.4,
        title_size=8.9, body_size=7.0, title_y_frac=0.70, body_y_frac=0.28)
    box(ax, 27, 2.5, 28, 13.0, "REJECTED (Final)", "Admin Only (Note >= 10 chars)\nRefunds Users + Hides Posts",
        fc=RED_FILL, ec=RED_EDGE, lw=1.4, title_size=8.5, body_size=6.9, title_color=RED_EDGE,
        title_y_frac=0.70, body_y_frac=0.27)

    arrow(ax, 6.2, 46, 9.2, 46, "", color=DARK)
    arrow(ax, 23.2, 50.0, 30.2, 64.0, "Admin only", color=NAVY, lx=23.5, ly=59.2, label_size=6.9)
    arrow(ax, 23.2, 41.5, 33.2, 30.5, "Admin only", color=NAVY, lx=24.8, ly=34.2, label_size=6.9)
    arrow(ax, 40.5, 58.2, 40.5, 35.8, "Admin only", color=NAVY, lx=34.0, ly=51.8, label_size=6.9)
    arrow(ax, 23.3, 46, 63.2, 46, "Reporter / Admin", color=TEAL_EDGE, lx=50.5, ly=48.4, label_size=6.9)
    arrow(ax, 49.3, 64.5, 64.0, 53.3, "Reporter / Admin", color=TEAL_EDGE, lx=60.0, ly=61.0, label_size=6.8)
    arrow(ax, 50.8, 30.0, 64.0, 38.7, "Reporter / Admin", color=TEAL_EDGE, lx=60.0, ly=31.5, label_size=6.8)
    arrow(ax, 78.3, 46, 84.7, 46, "Admin /\nCron", color=SLATE, lx=81.5, ly=51.5, label_size=6.8)

    arrow(ax, 70.5, 53.3, 16.5, 53.3, "Reopen: Reporter within 7 days",
          rad=0.58, color=AMBER_EDGE, ls="--", lx=43.5, ly=80.0, label_size=7.4)

    arrow(ax, 16.5, 38.7, 26.8, 9.5, "Admin reject", rad=0.14, color=RED_EDGE, lx=15.5, ly=21.5, label_size=6.9)
    arrow(ax, 42.0, 22.2, 42.0, 15.8, "Admin reject", color=RED_EDGE, lx=35.2, ly=18.8, label_size=6.9)
    arrow(ax, 49.3, 60.5, 53.8, 15.8, "Admin reject", rad=-0.16, color=RED_EDGE, lx=59.2, ly=23.5, label_size=6.9)

    fig.savefig(OUT_DIR / "fig3_3_state_machine.png", dpi=300, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)


if __name__ == "__main__":
    make_fig1_1()
    make_fig3_1()
    make_fig3_2()
    make_fig3_3()
    print("Regenerated figures cleanly.")
