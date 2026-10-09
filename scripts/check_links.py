"""Check local URLs without build tools or third-party dependencies."""

from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PLATFORM_PATHS = {"/_vercel/insights/script.js"}
URL_LITERAL = re.compile(
    r"(['\"])([^'\"\n]+\.(?:html|css|js|png|jpe?g|webp|svg|gif)(?:[?#][^'\"\n]*)?)\1"
)
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("src", "href", "poster", "data-src", "data-tool-url", "data-video"):
            if attrs.get(key):
                self.urls.append(attrs[key])
        self.urls.extend(m.group(2) for m in URL_LITERAL.finditer(attrs.get("onerror", "")))
        self.urls.extend(m.group(2) for m in CSS_URL.finditer(attrs.get("style", "")))

    handle_startendtag = handle_starttag


def exact_case_exists(target):
    """Windows exists() alone misses case errors that break Linux deployments."""
    current = ROOT
    for part in target.relative_to(ROOT).parts:
        if not current.is_dir() or part not in {p.name for p in current.iterdir()}:
            return False
        current /= part
    return current.is_file()


def main():
    pages = {}
    references = []
    for file in sorted(ROOT.glob("*.html")):
        page = Page()
        source = file.read_text(encoding="utf-8")
        page.feed(source)
        pages[file] = page
        references.extend((file, url) for url in page.urls)
        # Inline script URLs use the HTML document as their base.
        for script in re.findall(r"<script\b[^>]*>(.*?)</script>", source, re.S):
            references.extend((file, m.group(2)) for m in URL_LITERAL.finditer(script))
    for file in sorted((ROOT / "src").rglob("*.css")):
        references.extend(
            (file, m.group(2))
            for m in CSS_URL.finditer(file.read_text(encoding="utf-8"))
        )
    for file in sorted((ROOT / "src").rglob("*.js")):
        # URL assignments in classic scripts resolve relative to the page.
        references.extend(
            (ROOT / "index.html", m.group(2))
            for m in URL_LITERAL.finditer(file.read_text(encoding="utf-8"))
        )

    errors = []
    checked = 0
    for origin, url in references:
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or parsed.path in PLATFORM_PATHS:
            continue
        checked += 1
        target = (
            ROOT / unquote(parsed.path.lstrip("/"))
            if parsed.path.startswith("/")
            else origin.parent / unquote(parsed.path) if parsed.path else origin
        ).resolve()
        if not target.is_relative_to(ROOT) or not exact_case_exists(target):
            errors.append(f"{origin.relative_to(ROOT)}: missing file or incorrect case: {url}")
        elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:
            errors.append(f"{origin.relative_to(ROOT)}: missing anchor: {url}")
    if errors:
        print("\n".join(sorted(set(errors))))
        return 1
    print(f"OK: {len(pages)} pages, {checked} local references; no missing files or anchors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
