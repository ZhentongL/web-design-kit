/*
 * Browser Snapshot Collector
 *
 * Usage:
 * 1. Open the target page in the logged-in browser.
 * 2. Paste this script in DevTools Console, or load it through a userscript/bookmarklet.
 * 3. It downloads page-snapshot.json.
 *
 * The script runs fully in the current browser page. It does not upload data.
 * Reused in Web Design Kit with permission from the original author.
 */

(async function collectPageSnapshot() {
  const MAX_TEXT_LENGTH = 240;
  const MAX_NODES = 6000;
  const COLLECT_FULL_DOCUMENT = true;
  const WAIT_FOR_STABLE_MS = 900;
  const MAX_WAIT_MS = 6000;
  const MAX_FRAME_DEPTH = 3;
  const MAX_SCROLL_CONTAINERS = 8;
  const MAX_SCROLL_SAMPLES_PER_CONTAINER = 3;
  const STYLE_PROPS = [
    "display",
    "position",
    "boxSizing",
    "width",
    "height",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "color",
    "backgroundColor",
    "backgroundImage",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderRadius",
    "boxShadow",
    "opacity",
    "overflow",
    "overflowX",
    "overflowY",
    "alignItems",
    "justifyContent",
    "gap",
    "gridTemplateColumns",
    "flexDirection",
    "zIndex",
  ];

  const roleByTag = {
    HEADER: "header",
    NAV: "navigation",
    MAIN: "main",
    ASIDE: "aside",
    FOOTER: "footer",
    BUTTON: "button",
    INPUT: "input",
    TEXTAREA: "textarea",
    SELECT: "select",
    TABLE: "table",
    THEAD: "table-head",
    TBODY: "table-body",
    TR: "table-row",
    TH: "table-header-cell",
    TD: "table-cell",
    FORM: "form",
    IMG: "image",
    SVG: "icon",
    IFRAME: "iframe",
  };

  let nodeCount = 0;
  const seenSignatures = new Map();
  const diagnostics = {
    inaccessibleFrames: [],
    accessibleFrames: [],
    scrollContainers: [],
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForPageSettle() {
    const start = Date.now();
    let lastMutation = Date.now();
    const observer = new MutationObserver(() => {
      lastMutation = Date.now();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    while (document.readyState !== "complete" && Date.now() - start < MAX_WAIT_MS) {
      await sleep(100);
    }
    while (Date.now() - start < MAX_WAIT_MS && Date.now() - lastMutation < WAIT_FOR_STABLE_MS) {
      await sleep(100);
    }
    observer.disconnect();
  }

  function ownerWindow(el) {
    return el && el.ownerDocument && el.ownerDocument.defaultView
      ? el.ownerDocument.defaultView
      : window;
  }

  function cssEscape(value, win = window) {
    if (win.CSS && typeof win.CSS.escape === "function") return win.CSS.escape(value);
    return String(value).replace(/["\\#.:>+~[\]()]/g, "\\$&");
  }

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const win = ownerWindow(el);
    const style = win.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewportOrNear(rect) {
    if (COLLECT_FULL_DOCUMENT) return true;
    const pad = 1200;
    return (
      rect.bottom >= -pad &&
      rect.right >= -pad &&
      rect.top <= window.innerHeight + pad &&
      rect.left <= window.innerWidth + pad
    );
  }

  function absoluteRect(rect, win = window, offset = { x: 0, y: 0 }) {
    return {
      x: Math.round(rect.x + win.scrollX + (offset.x || 0)),
      y: Math.round(rect.y + win.scrollY + (offset.y || 0)),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function absoluteRectFor(el, offset) {
    return absoluteRect(el.getBoundingClientRect(), ownerWindow(el), offset);
  }

  function elementChildren(el) {
    const lightChildren = Array.from(el.children || []);
    const shadowChildren = el.shadowRoot ? Array.from(el.shadowRoot.children || []) : [];
    return lightChildren.concat(shadowChildren);
  }

  function directText(el) {
    const text = Array.from(el.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > MAX_TEXT_LENGTH
      ? `${text.slice(0, MAX_TEXT_LENGTH)}...`
      : text;
  }

  function usefulText(el) {
    const text = (el.innerText || el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > MAX_TEXT_LENGTH
      ? `${text.slice(0, MAX_TEXT_LENGTH)}...`
      : text;
  }

  function domPath(el) {
    const parts = [];
    let current = el;
    const win = ownerWindow(el);
    const rootElement = el.ownerDocument ? el.ownerDocument.documentElement : document.documentElement;
    while (current && current.nodeType === 1 && current !== rootElement) {
      const parent = current.parentElement;
      const tag = current.tagName.toLowerCase();
      const siblings = parent ? Array.from(parent.children).filter((child) => child.tagName === current.tagName) : [];
      const index = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
      const id = current.id ? `#${cssEscape(current.id, win)}` : "";
      parts.unshift(`${tag}${id}${index}`);
      current = parent;
    }
    return parts.join(" > ");
  }

  function layoutInfo(el, computed, offset) {
    const children = elementChildren(el).filter(isVisible);
    if (!children.length) {
      return { childCount: 0, visualOrder: [] };
    }
    const rects = children.map((child, index) => {
      const rect = absoluteRectFor(child, offset);
      return {
        index,
        tag: child.tagName.toLowerCase(),
        text: directText(child).slice(0, 60),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    });
    const visualOrder = rects
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((item) => item.index);
    return {
      childCount: children.length,
      display: computed.display,
      flexDirection: computed.flexDirection,
      gridTemplateColumns: computed.gridTemplateColumns,
      visualOrder,
    };
  }

  function visualStyle(el, computed) {
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage && computed.backgroundImage !== "none" ? computed.backgroundImage : "",
      borderColor: {
        top: computed.borderTopColor,
        right: computed.borderRightColor,
        bottom: computed.borderBottomColor,
        left: computed.borderLeftColor,
      },
      borderWidth: {
        top: computed.borderTopWidth,
        right: computed.borderRightWidth,
        bottom: computed.borderBottomWidth,
        left: computed.borderLeftWidth,
      },
      borderRadius: computed.borderRadius,
      boxShadow: computed.boxShadow && computed.boxShadow !== "none" ? computed.boxShadow : "",
    };
  }

  function styleMap(el) {
    const computed = ownerWindow(el).getComputedStyle(el);
    const result = {};
    for (const prop of STYLE_PROPS) {
      const value = computed[prop];
      if (!value) continue;
      result[prop] = value;
    }
    return result;
  }

  function classify(el) {
    const ariaRole = el.getAttribute("role");
    if (ariaRole) return ariaRole;

    const tagRole = roleByTag[el.tagName];
    if (tagRole) return tagRole;

    const className = String(el.className || "").toLowerCase();
    if (className.includes("card")) return "card";
    if (className.includes("toolbar") || className.includes("filter")) return "toolbar";
    if (className.includes("modal") || className.includes("dialog")) return "dialog";
    if (className.includes("drawer")) return "drawer";
    if (className.includes("menu")) return "menu";
    if (className.includes("list")) return "list";

    return "container";
  }

  function elementSignature(el) {
    const tag = el.tagName.toLowerCase();
    const cls = String(el.className || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join(".");
    return `${tag}.${cls}:${directText(el).slice(0, 40)}`;
  }

  function compactAttributes(el) {
    const attrs = {};
    for (const attr of Array.from(el.attributes || [])) {
      if (/^on/i.test(attr.name)) continue;
      if (attr.name === "style") continue;
      if (attr.name.startsWith("data-v-")) continue;
      if (attr.name.startsWith("data-single-file")) continue;
      if (attr.name === "class") {
        attrs.class = attr.value
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 16)
          .join(" ");
        continue;
      }
      if (["id", "role", "aria-label", "placeholder", "type", "href", "src", "alt", "title"].includes(attr.name)) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  function frameDocument(iframe) {
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!doc || !doc.body) return null;
      // Touching location can throw for cross-origin frames in some browsers.
      void doc.location.href;
      return doc;
    } catch (error) {
      diagnostics.inaccessibleFrames.push({
        domPath: domPath(iframe),
        src: iframe.getAttribute("src") || "",
        reason: error && error.message ? error.message : "cross-origin or unavailable frame",
      });
      return null;
    }
  }

  function orderedElementChildren(el, offset) {
    return elementChildren(el).sort((a, b) => {
      const ar = absoluteRectFor(a, offset);
      const br = absoluteRectFor(b, offset);
      return ar.y - br.y || ar.x - br.x;
    });
  }

  function collectElement(el, depth = 0, offset = { x: 0, y: 0 }, frameDepth = 0) {
    if (nodeCount >= MAX_NODES || !isVisible(el)) return null;

    const rect = el.getBoundingClientRect();
    if (!isInViewportOrNear(rect)) return null;

    const computed = ownerWindow(el).getComputedStyle(el);
    const ownRect = absoluteRect(rect, ownerWindow(el), offset);
    const orderedChildren = orderedElementChildren(el, offset);
    const children = [];
    for (const child of orderedChildren) {
      const childResult = collectElement(child, depth + 1, offset, frameDepth);
      if (childResult) children.push(childResult);
    }

    if (el.tagName === "IFRAME" && frameDepth < MAX_FRAME_DEPTH) {
      const childDocument = frameDocument(el);
      if (childDocument) {
        diagnostics.accessibleFrames.push({
          domPath: domPath(el),
          src: el.getAttribute("src") || childDocument.location.href,
          title: childDocument.title || "",
        });
        const frameTree = collectElement(
          childDocument.body,
          depth + 1,
          { x: ownRect.x, y: ownRect.y },
          frameDepth + 1
        );
        if (frameTree) children.push(frameTree);
      }
    }

    const text = directText(el);
    const fullText = children.length ? "" : usefulText(el);
    const hasContent = text || fullText || children.length || ["IMG", "SVG", "INPUT", "BUTTON", "IFRAME", "CANVAS", "VIDEO"].includes(el.tagName);
    if (!hasContent) return null;

    nodeCount += 1;
    const signature = elementSignature(el);
    const repeatedIndex = seenSignatures.get(signature) || 0;
    seenSignatures.set(signature, repeatedIndex + 1);

    return {
      id: `n${nodeCount}`,
      tag: el.tagName.toLowerCase(),
      role: classify(el),
      repeatedIndex,
      domPath: domPath(el),
      attrs: compactAttributes(el),
      text,
      fullText,
      rect: ownRect,
      style: styleMap(el),
      visual: visualStyle(el, computed),
      layout: layoutInfo(el, computed, offset),
      children,
    };
  }

  function collectDocumentContexts(rootDocument = document, offset = { x: 0, y: 0 }, frameDepth = 0, contexts = []) {
    contexts.push({ document: rootDocument, window: rootDocument.defaultView || window, offset });
    if (frameDepth >= MAX_FRAME_DEPTH) return contexts;

    for (const iframe of Array.from(rootDocument.querySelectorAll("iframe"))) {
      if (!isVisible(iframe)) continue;
      const childDocument = frameDocument(iframe);
      if (!childDocument) continue;
      const iframeRect = absoluteRectFor(iframe, offset);
      collectDocumentContexts(
        childDocument,
        { x: iframeRect.x, y: iframeRect.y },
        frameDepth + 1,
        contexts
      );
    }

    return contexts;
  }

  function collectDesignTokens(contexts) {
    const colorCounts = new Map();
    const fontCounts = new Map();
    const radiusCounts = new Map();

    for (const context of contexts) {
      for (const el of Array.from(context.document.body.querySelectorAll("*"))) {
        if (!isVisible(el)) continue;
        const style = ownerWindow(el).getComputedStyle(el);
        for (const color of [style.color, style.backgroundColor, style.borderTopColor]) {
          if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
          }
        }
        if (style.fontFamily) fontCounts.set(style.fontFamily, (fontCounts.get(style.fontFamily) || 0) + 1);
        if (style.borderRadius && style.borderRadius !== "0px") {
          radiusCounts.set(style.borderRadius, (radiusCounts.get(style.borderRadius) || 0) + 1);
        }
      }
    }

    const top = (map, limit) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([value, count]) => ({ value, count }));

    return {
      colors: top(colorCounts, 24),
      fonts: top(fontCounts, 8),
      radii: top(radiusCounts, 12),
    };
  }

  function normalizeUrl(value, doc = document) {
    try {
      return new URL(value, doc.location.href).href;
    } catch {
      return value || "";
    }
  }

  function extractCssUrls(value, doc) {
    const urls = [];
    const pattern = /url\((['"]?)(.*?)\1\)/g;
    let match;
    while ((match = pattern.exec(value || ""))) {
      if (match[2] && !match[2].startsWith("data:")) urls.push(normalizeUrl(match[2], doc));
    }
    return urls;
  }

  function addAsset(bucket, item) {
    if (!item.url) return;
    if (bucket.some((existing) => existing.url === item.url && existing.source === item.source)) return;
    bucket.push(item);
  }

  function collectAssets(contexts) {
    const assets = {
      stylesheets: [],
      scripts: [],
      images: [],
      fonts: [],
      icons: [],
      backgroundImages: [],
      performanceResources: [],
      inaccessibleStylesheets: [],
    };

    for (const context of contexts) {
      const doc = context.document;

      for (const link of Array.from(doc.querySelectorAll("link[href]"))) {
        const rel = String(link.rel || "").toLowerCase();
        const item = { url: normalizeUrl(link.getAttribute("href"), doc), rel, source: "link" };
        if (rel.includes("stylesheet")) addAsset(assets.stylesheets, item);
        if (rel.includes("icon") || rel.includes("apple-touch-icon") || rel.includes("manifest")) addAsset(assets.icons, item);
      }

      for (const script of Array.from(doc.querySelectorAll("script[src]"))) {
        addAsset(assets.scripts, {
          url: normalizeUrl(script.getAttribute("src"), doc),
          type: script.type || "",
          source: "script",
        });
      }

      for (const img of Array.from(doc.querySelectorAll("img[src], source[src], source[srcset]"))) {
        const src = img.getAttribute("src");
        const srcset = img.getAttribute("srcset");
        if (src) addAsset(assets.images, { url: normalizeUrl(src, doc), alt: img.getAttribute("alt") || "", source: img.tagName.toLowerCase() });
        if (srcset) {
          for (const part of srcset.split(",")) {
            const url = part.trim().split(/\s+/)[0];
            if (url) addAsset(assets.images, { url: normalizeUrl(url, doc), alt: img.getAttribute("alt") || "", source: "srcset" });
          }
        }
      }

      for (const el of Array.from(doc.body.querySelectorAll("*"))) {
        if (!isVisible(el)) continue;
        const style = ownerWindow(el).getComputedStyle(el);
        for (const url of extractCssUrls(style.backgroundImage, doc)) {
          addAsset(assets.backgroundImages, { url, domPath: domPath(el), source: "computed-background" });
        }
      }

      for (const sheet of Array.from(doc.styleSheets || [])) {
        if (sheet.href) addAsset(assets.stylesheets, { url: normalizeUrl(sheet.href, doc), source: "styleSheet" });
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (rule.cssText && /@font-face/i.test(rule.cssText)) {
              for (const url of extractCssUrls(rule.cssText, doc)) addAsset(assets.fonts, { url, source: "@font-face" });
            }
            if (rule.cssText && /url\(/i.test(rule.cssText)) {
              for (const url of extractCssUrls(rule.cssText, doc)) addAsset(assets.backgroundImages, { url, source: "css-rule" });
            }
          }
        } catch (error) {
          assets.inaccessibleStylesheets.push({
            url: sheet.href || "inline stylesheet",
            reason: error && error.message ? error.message : "stylesheet rules unavailable",
          });
        }
      }

      try {
        for (const entry of context.window.performance.getEntriesByType("resource")) {
          addAsset(assets.performanceResources, {
            url: entry.name,
            initiatorType: entry.initiatorType || "",
            transferSize: entry.transferSize || 0,
            source: "performance",
          });
        }
      } catch {
        // Some embedded documents restrict PerformanceResourceTiming.
      }
    }

    return assets;
  }

  function isScrollable(el) {
    if (!isVisible(el)) return false;
    const style = ownerWindow(el).getComputedStyle(el);
    const scrollY = el.scrollHeight > el.clientHeight + 24 && /(auto|scroll|overlay)/.test(style.overflowY);
    const scrollX = el.scrollWidth > el.clientWidth + 24 && /(auto|scroll|overlay)/.test(style.overflowX);
    const rect = el.getBoundingClientRect();
    return (scrollY || scrollX) && rect.width >= 160 && rect.height >= 120;
  }

  function visibleTextDigest(root, offset = { x: 0, y: 0 }, limit = 80) {
    const items = [];
    const filter = ownerWindow(root).NodeFilter || NodeFilter;
    const walker = root.ownerDocument.createTreeWalker(root, filter.SHOW_ELEMENT);
    let current = root;
    while (current && items.length < limit) {
      if (isVisible(current)) {
        const text = directText(current) || (elementChildren(current).length ? "" : usefulText(current));
        if (text) {
          items.push({
            tag: current.tagName.toLowerCase(),
            role: classify(current),
            domPath: domPath(current),
            text,
            rect: absoluteRectFor(current, offset),
          });
        }
      }
      current = walker.nextNode();
    }
    return items;
  }

  async function collectScrollCaptures(contexts) {
    const captures = [];
    const candidates = [];

    for (const context of contexts) {
      for (const el of Array.from(context.document.body.querySelectorAll("*"))) {
        if (!isScrollable(el)) continue;
        const rect = absoluteRectFor(el, context.offset);
        candidates.push({ el, rect, context });
      }
    }

    candidates
      .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height))
      .slice(0, MAX_SCROLL_CONTAINERS)
      .forEach(({ el, rect }) => {
        diagnostics.scrollContainers.push({
          domPath: domPath(el),
          rect,
          scrollWidth: el.scrollWidth,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
        });
      });

    for (const { el, rect, context } of candidates.slice(0, MAX_SCROLL_CONTAINERS)) {
      const originalTop = el.scrollTop;
      const originalLeft = el.scrollLeft;
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const topPositions = Array.from(new Set([
        0,
        Math.round(maxTop / 2),
        maxTop,
      ])).slice(0, MAX_SCROLL_SAMPLES_PER_CONTAINER);

      const samples = [];
      for (const top of topPositions) {
        el.scrollTop = top;
        if (maxLeft) el.scrollLeft = 0;
        await sleep(180);
        samples.push({
          scrollTop: el.scrollTop,
          scrollLeft: el.scrollLeft,
          textDigest: visibleTextDigest(el, context.offset),
        });
      }
      el.scrollTop = originalTop;
      el.scrollLeft = originalLeft;
      captures.push({
        domPath: domPath(el),
        rect,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
        samples,
      });
    }

    await sleep(120);
    return captures;
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  await waitForPageSettle();

  const contexts = collectDocumentContexts();
  const tree = collectElement(document.body);
  const assets = collectAssets(contexts);
  const scrollCaptures = await collectScrollCaptures(contexts);

  const snapshot = {
    schema: "singlefile-demo-baseline.browser-snapshot.v1",
    capturedAt: new Date().toISOString(),
    page: {
      title: document.title,
      url: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      document: {
        width: Math.max(
          document.documentElement.scrollWidth,
          document.body ? document.body.scrollWidth : 0,
          window.innerWidth
        ),
        height: Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0,
          window.innerHeight
        ),
      },
    },
    tokens: collectDesignTokens(contexts),
    tree,
    frames: {
      accessible: diagnostics.accessibleFrames,
      inaccessible: diagnostics.inaccessibleFrames,
    },
    assets,
    scrollCaptures,
    diagnostics,
    limits: {
      maxNodes: MAX_NODES,
      collectedNodes: nodeCount,
      maxTextLength: MAX_TEXT_LENGTH,
      collectFullDocument: COLLECT_FULL_DOCUMENT,
      maxFrameDepth: MAX_FRAME_DEPTH,
      maxScrollContainers: MAX_SCROLL_CONTAINERS,
    },
  };

  downloadJson(snapshot, "page-snapshot.json");
  console.log("[Browser Snapshot Collector] Downloaded page-snapshot.json", snapshot);
})();
