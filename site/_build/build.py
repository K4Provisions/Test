"""Builds the site's HTML pages from layout.html + pages/*.html.
Edit a page in site/_build/pages/, then run:  python3 site/_build/build.py
The finished pages are written to site/ (the folder you upload to a host).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent

PHONE_DISPLAY = "(214) 931-7844"
PHONE_TEL = "+12149317844"
EMAIL = "k4provisions@gmail.com"

NAV = [
    ("hood-cleaning.html", "Hood cleaning"),
    ("parking-lot-cleaning.html", "Parking lots"),
    ("garbage-can-cleaning.html", "Garbage cans"),
    ("service-area.html", "Service area"),
]

PAGES = [
    {
        "out": "index.html", "src": "home.html", "nav": None,
        "title": "K4 Provisions LLC | Kitchen Hood Cleaning & Pressure Washing in North Texas",
        "description": "K4 Provisions cleans commercial kitchen hoods, filters, ductwork and rooftop exhaust fans across North Texas, plus parking lot pressure washing and garbage can cleaning. Call (214) 931-7844.",
        "scripts": ['<script type="module" src="assets/js/story.js"></script>'],
        "preload": '<link rel="modulepreload" href="assets/js/three.module.min.js">',
        "schema": True,
    },
    {
        "out": "hood-cleaning.html", "src": "hood.html", "nav": "hood-cleaning.html",
        "title": "Kitchen Hood & Exhaust Cleaning in North Texas | K4 Provisions",
        "description": "Commercial kitchen hood, filter, duct and rooftop exhaust fan cleaning for restaurants across North Texas. Scheduled around your service hours.",
    },
    {
        "out": "parking-lot-cleaning.html", "src": "lot.html", "nav": "parking-lot-cleaning.html",
        "title": "Parking Lot Pressure Washing in North Texas | K4 Provisions",
        "description": "Pressure washing for parking lots, drive-thru lanes, sidewalks and storefronts across North Texas. Oil stains, gum and grime lifted.",
    },
    {
        "out": "garbage-can-cleaning.html", "src": "bins.html", "nav": "garbage-can-cleaning.html",
        "title": "Garbage Can & Dumpster Pad Cleaning in North Texas | K4 Provisions",
        "description": "Garbage can, bin and dumpster pad washing and deodorizing across North Texas. Less smell, fewer flies.",
    },
    {
        "out": "service-area.html", "src": "area.html", "nav": "service-area.html",
        "title": "Service Area: Dallas, Fort Worth & North Texas | K4 Provisions",
        "description": "K4 Provisions serves all of North Texas, including Dallas, Fort Worth, Plano, Arlington, Frisco, McKinney, Denton and surrounding cities.",
    },
    {
        "out": "contact.html", "src": "contact.html", "nav": "contact.html",
        "title": "Get a Free Quote | K4 Provisions LLC",
        "description": "Request a free quote for kitchen hood cleaning, parking lot pressure washing or garbage can cleaning in North Texas. Call or text (214) 931-7844.",
    },
    {
        "out": "404.html", "src": "404.html", "nav": None,
        "title": "Page not found | K4 Provisions LLC",
        "description": "This page doesn't exist.",
        "noindex": True,
    },
]


def schema():
    data = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "K4 Provisions LLC",
        "description": "Commercial kitchen hood and exhaust cleaning, parking lot pressure washing, and garbage can cleaning.",
        "telephone": PHONE_TEL,
        "email": EMAIL,
        "areaServed": "North Texas",
        "image": "assets/img/k4-logo-960.webp",
        "makesOffer": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}}
            for n in ("Kitchen hood and exhaust cleaning", "Parking lot pressure washing", "Garbage can and dumpster pad cleaning")
        ],
    }
    return f'<script type="application/ld+json">{json.dumps(data, indent=1)}</script>'


def render(page, layout):
    body = (HERE / "pages" / page["src"]).read_text()
    nav_links = "\n".join(
        f'<a href="{href}"{" aria-current=\"page\"" if page["nav"] == href else ""}>{label}</a>'
        for href, label in NAV
    )
    html = layout
    repl = {
        "{{title}}": page["title"],
        "{{description}}": page["description"],
        "{{nav}}": nav_links,
        "{{body}}": body,
        "{{scripts}}": "\n  ".join(page.get("scripts", [])),
        "{{preload}}": page.get("preload", ""),
        "{{schema}}": schema() if page.get("schema") else "",
        "{{robots}}": '<meta name="robots" content="noindex">' if page.get("noindex") else "",
        "{{quote_current}}": ' aria-current="page"' if page["nav"] == "contact.html" else "",
        "{{phone}}": PHONE_DISPLAY,
        "{{tel}}": PHONE_TEL,
        "{{email}}": EMAIL,
    }
    for k, v in repl.items():
        html = html.replace(k, v)
    assert "{{" not in html, f"unreplaced placeholder in {page['out']}"
    return html


def main():
    layout = (HERE / "layout.html").read_text()
    for page in PAGES:
        (SITE / page["out"]).write_text(render(page, layout))
        print("built", page["out"])


if __name__ == "__main__":
    main()
