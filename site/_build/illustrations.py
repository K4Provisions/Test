"""Generates the before/after illustration SVGs in assets/img/ba/.
Each scene is drawn twice from the same base, once dirty and once clean, so the slider lines up exactly.
Swap any of these for a real job photo by changing the <img> src in the page.
Run: python3 site/_build/illustrations.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "img" / "ba"
W, H = 800, 520


def svg(body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{defs}</defs>{body}</svg>')


GRIME_FILTER = """
<filter id="grime" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="{f}" numOctaves="4" seed="{seed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 {r}  0 0 0 0 {g}  0 0 0 0 {b}  0 0 0 {k} {o}"/>
  <feComposite in2="SourceGraphic" operator="in"/>
</filter>"""


def grime(fid, f, seed, rgb, k, o):
    r, g, b = rgb
    return GRIME_FILTER.replace('id="grime"', f'id="{fid}"').format(f=f, seed=seed, r=r, g=g, b=b, k=k, o=o)


# ---------------------------------------------------------------- hood
def hood(dirty):
    defs = """
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#eef2f6"/><stop offset=".45" stop-color="#b9c3cf"/>
  <stop offset=".7" stop-color="#dfe5ec"/><stop offset="1" stop-color="#8e9aa8"/>
</linearGradient>
<linearGradient id="steelDark" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#aab4c0"/><stop offset="1" stop-color="#6c7886"/>
</linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#121b2b"/><stop offset="1" stop-color="#1b2638"/>
</linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5">
  <stop offset="0" stop-color="#fff6e0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe2a8" stop-opacity=".45"/>
  <stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/>
</radialGradient>
<linearGradient id="slat" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#5d6876"/><stop offset=".5" stop-color="#c7d0da"/><stop offset="1" stop-color="#6f7a88"/>
</linearGradient>
<linearGradient id="drip" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3b2408"/><stop offset="1" stop-color="#6a4413"/>
</linearGradient>
<clipPath id="panelClip"><rect x="40" y="40" width="720" height="250"/></clipPath>
""" + grime("hg", 0.008, 7, (0.16, 0.1, 0.03), -1.7, 1.05) + grime("hg2", 0.04, 3, (0.1, 0.06, 0.01), -2.2, 1.25) + '<filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>'

    b = ['<rect width="800" height="520" fill="url(#wall)"/>']
    # canopy front panel
    b.append('<rect x="40" y="40" width="720" height="250" fill="url(#steel)"/>')
    # reflections
    b.append('<g clip-path="url(#panelClip)" opacity=".55">'
             '<polygon points="180,40 260,40 120,290 40,290" fill="#fff" opacity=".35"/>'
             '<polygon points="300,40 330,40 190,290 160,290" fill="#fff" opacity=".25"/>'
             '<polygon points="560,40 650,40 520,290 430,290" fill="#fff" opacity=".3"/></g>')
    # brushed lines
    lines = "".join(f'<line x1="40" x2="760" y1="{y}" y2="{y + 0.6}" stroke="#ffffff" stroke-opacity=".07"/>' for y in range(44, 290, 5))
    b.append(f'<g>{lines}</g>')
    # seams
    b.append('<g stroke="#7d8896" stroke-width="2"><line x1="280" y1="40" x2="280" y2="290"/><line x1="520" y1="40" x2="520" y2="290"/></g>')
    # bottom lip
    b.append('<rect x="34" y="286" width="732" height="16" fill="url(#steelDark)"/>')
    # filter bank under lip
    b.append('<rect x="60" y="302" width="680" height="120" fill="#0d1420"/>')
    for i in range(34):
        x = 66 + i * 20
        b.append(f'<rect x="{x}" y="308" width="14" height="108" fill="url(#slat)"/>')
    b.append('<g stroke="#2a3443" stroke-width="3"><line x1="230" y1="304" x2="230" y2="420"/><line x1="400" y1="304" x2="400" y2="420"/><line x1="570" y1="304" x2="570" y2="420"/></g>')
    # trough
    b.append('<rect x="56" y="420" width="688" height="14" rx="3" fill="url(#steelDark)"/>')
    # lights
    for cx in (170, 400, 630):
        b.append(f'<circle cx="{cx}" cy="120" r="90" fill="url(#glow)"/>')
        b.append(f'<rect x="{cx - 26}" y="60" width="52" height="10" rx="3" fill="#7b8794"/>'
                 f'<rect x="{cx - 22}" y="70" width="44" height="58" rx="18" fill="#fffaf0" opacity=".95"/>'
                 f'<g stroke="#9aa5b2" stroke-width="2.4" fill="none"><path d="M{cx - 22} 88h44M{cx - 22} 106h44M{cx} 70v58"/></g>')
    # floor / plastic
    b.append('<rect x="0" y="434" width="800" height="86" fill="#1a2434"/>')
    b.append('<path d="M0 450 C120 440 200 470 320 452 S560 446 800 458 V520 H0Z" fill="#cfe4ff" opacity=".08"/>')

    if dirty:
        # amber film over steel, heavier toward the bottom
        b.append('<linearGradient id="film" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4e12" stop-opacity=".45"/>'
                 '<stop offset=".7" stop-color="#5b3a0c" stop-opacity=".7"/><stop offset="1" stop-color="#2a1803" stop-opacity=".92"/></linearGradient>')
        b.append('<rect x="40" y="40" width="720" height="250" fill="url(#film)"/>')
        b.append('<rect x="40" y="40" width="720" height="250" fill="#000" filter="url(#hg)"/>')
        b.append('<rect x="40" y="200" width="720" height="90" fill="#000" filter="url(#hg2)"/>')
        b.append('<rect x="34" y="286" width="732" height="16" fill="#2a1803" opacity=".85"/>')
        # drips from the lip
        import random
        rnd = random.Random(4)
        for _ in range(26):
            x = rnd.uniform(50, 750)
            h = rnd.uniform(10, 46)
            w = rnd.uniform(4, 9)
            b.append(f'<path d="M{x - w / 2:.1f} 300 q0 {h * 0.7:.1f} {w / 2:.1f} {h:.1f} q{w / 2:.1f} -{h * 0.3:.1f} {w / 2:.1f} -{h:.1f}z" fill="url(#drip)"/>')
        # filters caked
        b.append('<rect x="60" y="302" width="680" height="120" fill="#3a2406" opacity=".62"/>')
        b.append('<rect x="60" y="302" width="680" height="120" fill="#000" filter="url(#hg2)"/>')
        b.append('<rect x="56" y="420" width="688" height="14" rx="3" fill="#2a1803"/>')
        # lights dimmer, yellowed
        for cx in (170, 400, 630):
            b.append(f'<rect x="{cx - 22}" y="70" width="44" height="58" rx="18" fill="#c99a3c" opacity=".45"/>')
    else:
        # crisp highlight band on the clean lip
        b.append('<rect x="34" y="288" width="732" height="3" fill="#fff" opacity=".6"/>')
    return svg("".join(b), defs)


# ---------------------------------------------------------------- parking lot (top-down)
def lot(dirty):
    import random
    rnd = random.Random(11)
    defs = """
<linearGradient id="walk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd5dc"/><stop offset="1" stop-color="#aeb6c0"/></linearGradient>
""" + grime("asph", 0.9, 2, (0.5, 0.52, 0.56), -1, 0.55) + grime("lg", 0.012, 9, (0.16, 0.13, 0.09), -1.5, 0.95) + grime("wg", 0.03, 5, (0.3, 0.27, 0.2), -1.6, 1.05) + '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>'
    b = []
    asphalt = "#5a5850" if dirty else "#262b33"
    b.append(f'<rect width="800" height="520" fill="{asphalt}"/>')
    b.append('<rect width="800" height="520" fill="#000" filter="url(#asph)" opacity=".35"/>')
    # sidewalk + curb along the top
    b.append('<rect x="0" y="0" width="800" height="96" fill="url(#walk)"/>')
    for x in range(0, 800, 100):
        b.append(f'<line x1="{x}" y1="0" x2="{x}" y2="96" stroke="#8e97a2" stroke-width="2"/>')
    b.append('<rect x="0" y="96" width="800" height="12" fill="#8e97a2"/>')
    # storefront edge
    b.append('<rect x="0" y="0" width="800" height="14" fill="#1b2638"/>')
    # stall lines
    line_col = "#d9cfa8" if dirty else "#f4f7fb"
    line_op = ".55" if dirty else "1"
    for i in range(7):
        x = 60 + i * 115
        b.append(f'<rect x="{x}" y="128" width="8" height="220" fill="{line_col}" opacity="{line_op}"/>')
    b.append(f'<rect x="60" y="344" width="698" height="8" fill="{line_col}" opacity="{line_op}"/>')
    # drive lane arrow
    b.append(f'<path d="M340 450 h90 v-16 l34 28 -34 28 v-16 h-90z" fill="{line_col}" opacity="{line_op}"/>')
    # wheel stops
    for i in range(6):
        x = 82 + i * 115
        b.append(f'<rect x="{x}" y="140" width="70" height="12" rx="4" fill="#9aa3ae"/>')
    if dirty:
        b.append('<rect y="0" width="800" height="108" fill="#000" filter="url(#wg)"/>')
        b.append('<rect width="800" height="520" fill="#000" filter="url(#lg)"/>')
        # oil stains in each stall
        for i in range(6):
            cx = 117 + i * 115 + rnd.uniform(-12, 12)
            cy = 250 + rnd.uniform(-30, 30)
            rx, ry = rnd.uniform(26, 40), rnd.uniform(36, 58)
            b.append(f'<g filter="url(#soft)"><ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="#1d1a15" opacity=".55"/>'
                     f'<ellipse cx="{cx + 6:.0f}" cy="{cy + 10:.0f}" rx="{rx * 0.6:.0f}" ry="{ry * 0.55:.0f}" fill="#0d0b09" opacity=".45"/></g>')
        # gum spots on the sidewalk
        for _ in range(60):
            b.append(f'<circle cx="{rnd.uniform(10, 790):.0f}" cy="{rnd.uniform(20, 92):.0f}" r="{rnd.uniform(2.5, 5):.1f}" fill="#3d3a35" opacity=".8"/>')
        # dumpster-area streak near the right
        b.append('<path d="M700 108 C720 180 690 260 740 360 L800 360 800 108Z" fill="#2c2416" opacity=".45"/>')
    else:
        # fresh sheen
        b.append('<path d="M0 380 C200 360 420 400 800 370 V520 H0Z" fill="#8fd3ff" opacity=".05"/>')
    return svg("".join(b), defs)


# ---------------------------------------------------------------- garbage bin
def bin_(dirty):
    import random
    rnd = random.Random(21)
    defs = """
<linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#1e3a2c"/><stop offset=".35" stop-color="#2f5a43"/><stop offset=".6" stop-color="#3a6b51"/><stop offset="1" stop-color="#1c3529"/>
</linearGradient>
<linearGradient id="lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7458"/><stop offset="1" stop-color="#244534"/></linearGradient>
<linearGradient id="pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3ae"/><stop offset="1" stop-color="#6e7884"/></linearGradient>
<linearGradient id="wallb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121b2b"/><stop offset="1" stop-color="#1d2a3e"/></linearGradient>
<linearGradient id="streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a12" stop-opacity=".9"/><stop offset="1" stop-color="#3a2a12" stop-opacity="0"/></linearGradient>
<clipPath id="bodyClip"><path d="M260 150 L540 150 L515 440 L285 440Z"/><path d="M540 200 L740 200 L722 440 L558 440Z"/><rect x="244" y="122" width="312" height="34" rx="8"/><rect x="528" y="176" width="224" height="28" rx="7"/></clipPath>
""" + grime("bg", 0.02, 13, (0.22, 0.16, 0.07), -1.5, 0.95) + grime("pg", 0.02, 8, (0.22, 0.18, 0.12), -1.5, 1.0) + '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>'
    b = ['<rect width="800" height="520" fill="url(#wallb)"/>']
    # block wall lines
    for y in range(40, 420, 46):
        b.append(f'<line x1="0" y1="{y}" x2="800" y2="{y}" stroke="#223049" stroke-width="2"/>')
    # concrete pad
    b.append('<rect x="0" y="420" width="800" height="100" fill="url(#pad)"/>')
    # big bin
    b.append('<path d="M260 150 L540 150 L515 440 L285 440Z" fill="url(#body)"/>')
    b.append('<rect x="244" y="122" width="312" height="34" rx="8" fill="url(#lid)"/>')
    b.append('<rect x="262" y="104" width="120" height="20" rx="6" fill="#2a4d3a"/>')
    b.append('<g fill="#0e1712"><circle cx="300" cy="448" r="22"/><circle cx="500" cy="448" r="22"/></g>'
             '<g fill="#56606c"><circle cx="300" cy="448" r="8"/><circle cx="500" cy="448" r="8"/></g>')
    for x in (320, 400, 480):
        b.append(f'<path d="M{x} 180 L{x - 4} 410" stroke="#1a3326" stroke-width="6" stroke-linecap="round"/>')
    # small bin
    b.append('<path d="M500 200 L700 200 L682 440 L518 440Z" fill="url(#body)" transform="translate(40 0)"/>')
    b.append('<rect x="528" y="176" width="224" height="28" rx="7" fill="url(#lid)"/>')
    b.append('<g fill="#0e1712"><circle cx="580" cy="450" r="18"/><circle cx="700" cy="450" r="18"/></g>')
    if dirty:
        b.append('<g clip-path="url(#bodyClip)">')
        for _ in range(26):
            x = rnd.uniform(270, 720)
            w = rnd.uniform(6, 22)
            h = rnd.uniform(60, 220)
            b.append(f'<rect x="{x:.0f}" y="{150 + rnd.uniform(0, 30):.0f}" width="{w:.0f}" height="{h:.0f}" fill="url(#streak)" opacity=".7" filter="url(#soft)"/>')
        b.append('<rect x="240" y="100" width="520" height="350" fill="#000" filter="url(#bg)"/>')
        b.append('<rect x="240" y="370" width="520" height="80" fill="#2b1f0d" opacity=".5" filter="url(#soft)"/></g>')
        b.append('<rect x="244" y="122" width="312" height="34" rx="8" fill="#3a2a12" opacity=".45"/>')
        b.append('<rect x="0" y="420" width="800" height="100" fill="#000" filter="url(#pg)"/>')
        for _ in range(5):
            b.append(f'<ellipse cx="{rnd.uniform(80, 760):.0f}" cy="{rnd.uniform(462, 505):.0f}" rx="{rnd.uniform(30, 70):.0f}" ry="{rnd.uniform(6, 12):.0f}" fill="#2a2214" opacity=".6"/>')
        # flies
        for _ in range(9):
            x, y = rnd.uniform(240, 700), rnd.uniform(40, 130)
            b.append(f'<g fill="#0a0a0a"><ellipse cx="{x:.0f}" cy="{y:.0f}" rx="3.2" ry="2.2"/></g>'
                     f'<g fill="#cfd8e3" opacity=".5"><ellipse cx="{x - 2:.0f}" cy="{y - 3:.0f}" rx="2.6" ry="1.4"/><ellipse cx="{x + 2:.0f}" cy="{y - 3:.0f}" rx="2.6" ry="1.4"/></g>')
    else:
        b.append('<g clip-path="url(#bodyClip)"><polygon points="300,150 330,150 300,440 280,440" fill="#fff" opacity=".12"/>'
                 '<polygon points="560,200 576,200 560,440 548,440" fill="#fff" opacity=".1"/></g>')
        # water sheen on the pad
        b.append('<path d="M0 470 C180 455 380 485 560 466 S760 470 800 462 V520 H0Z" fill="#8fd3ff" opacity=".1"/>')
    return svg("".join(b), defs)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("hood", hood), ("lot", lot), ("bin", bin_)):
        (OUT / f"{name}-before.svg").write_text(fn(True))
        (OUT / f"{name}-after.svg").write_text(fn(False))
    print("wrote", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
