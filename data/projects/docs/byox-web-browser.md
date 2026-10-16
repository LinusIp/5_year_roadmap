# Build your own web browser

**Goal.** A toy browser that fetches pages with your own HTTP code, parses HTML and a subset of CSS, lays out block and inline content, paints it in a window, scrolls, and follows links when you click them.

**Why.** Software Architect roadmap: `software-architect/http-https`, `software-architect/w3c-and-whatwg` and `software-architect/tcp-ip-model`. Skills: forgiving parsers, tree algorithms (style resolution, layout), text measurement and line breaking, and hit-testing, which together show what every web framework sits on.

**Scope.** MVP: URL parsing and relative resolution, HTTP/1.1 GET over sockets with TLS, redirects, Content-Length and chunked bodies; an HTML tokeniser and tree builder that handles unclosed and implied tags and entities; a CSS parser for tag, class, id and descendant selectors; cascade, specificity and inheritance for a dozen properties; block and inline layout with word wrapping; a display list painted to a canvas; scrolling; clickable links and a back button. Stretch: an address bar, images, a tiny JavaScript hook, caching.

**Architecture.** The network layer returns headers and body for a URL. The HTML parser builds a DOM tree. The style engine applies the default stylesheet, page styles and inline styles to compute each node's style. Layout builds a tree of block and line boxes with positions and sizes. Paint turns the layout tree into a display list of text and rectangles. The window draws the list at the scroll offset and maps clicks back to the link under the pointer.

```
URL ─▶ HTTP ─▶ HTML parser ─▶ DOM ─▶ style (CSS cascade)
                                         │
 click ─▶ hit test ◀── window ◀── paint ◀── layout (block, inline)
```

**Stack.** Python 3.12 with socket and ssl, Tkinter or Skia via skia-python with SDL for drawing, pytest; a local folder of test pages plus a handful of simple real sites.

**Milestones.** HTTP client with TLS, redirects and chunked bodies (6 h) · HTML tokeniser and tree builder (8 h) · CSS parsing, selectors and the cascade (8 h) · block and inline layout with line breaking (10 h) · painting, scrolling, link clicks and write-up (8 h). Total 40 h.

**Done when.** Five real pages chosen in advance render recognisably, shown side by side with a real browser's screenshots. Test pages covering nested blocks, inline runs with mixed fonts, and implied tags lay out as expected. Clicking a link loads the new page and back returns to the previous one at its scroll position. At least 50 unit tests pass across the HTTP, HTML, CSS and layout modules.

**Measure and report.** Time per stage (fetch, parse, style, layout, paint) for each of the five pages; DOM node and layout box counts; layout time against page size; frames per second while scrolling a long page.

**Pitfalls.** Treating HTML as XML and choking on unclosed tags. Measuring text per character instead of per word with real font metrics, so lines wrap wrongly. Re-running layout on every scroll frame. Ignoring chunked transfer encoding, which most servers use. Resolving relative links against the wrong base after a redirect.

**References.** stanford-cs144, w-sys-tcp-echo, w-json-parser, crafting-interpreters, build-your-own-x.

**Write-up.** Side-by-side screenshots against a real browser, a GIF of scrolling and clicking, the per-stage timing table, a diagram of the pipeline, and what incremental layout or JavaScript would require.
