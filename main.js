const header = document.getElementById("sceneHeader");
const toggle = document.getElementById("toggleHeader");

// collapse/expand header scene (only if toggle exists)
if (header && toggle) {
  toggle.addEventListener("click", () => {
    const collapsed = header.classList.toggle("isCollapsed");
    toggle.setAttribute("aria-expanded", (!collapsed).toString());
  });
}

// Optional: close the header when a tile is clicked (feels like “selecting a car”)
document.querySelectorAll(".tile").forEach(tile => {
  tile.addEventListener("click", () => {
    if (header) header.classList.add("isCollapsed");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
});

(() => {
  const box = document.getElementById("cadBox");
  const text = document.getElementById("cadText");
  const wEl = document.getElementById("dimW");
  const hEl = document.getElementById("dimH");
  if (!box || !text || !wEl || !hEl) return;

  const updateDims = () => {
    const r = box.getBoundingClientRect();
    wEl.textContent = Math.round(r.width);
    hEl.textContent = Math.round(r.height);
  };

  const measureTextContent = () => {
    const kids = [...text.children];
    if (!kids.length) {
      return { w: text.scrollWidth, h: text.scrollHeight };
    }

    const style = window.getComputedStyle(text);
    const isRow = style.flexDirection.startsWith("row");
    const gapRaw = parseFloat(style.columnGap || style.gap || "0");
    const gap = Number.isFinite(gapRaw) ? gapRaw : 0;

    const rects = kids.map((el) => el.getBoundingClientRect());
    if (isRow) {
      const w = rects.reduce((sum, r) => sum + r.width, 0) + gap * Math.max(0, kids.length - 1);
      const h = rects.reduce((mx, r) => Math.max(mx, r.height), 0);
      return { w, h };
    }

    const w = rects.reduce((mx, r) => Math.max(mx, r.width), 0);
    const h = rects.reduce((sum, r) => sum + r.height, 0) + gap * Math.max(0, kids.length - 1);
    return { w, h };
  };

  // live update on load/resize
  updateDims();
  window.addEventListener("resize", updateDims);

  // --- resizable handles ---
  const handles = [...box.querySelectorAll(".sketchHandle")];

  let start = null;

  const onDown = (e, corner) => {
    e.preventDefault();
    const r = box.getBoundingClientRect();
    start = {
      corner,
      x: e.clientX,
      y: e.clientY,
      w: r.width,
      h: r.height,
      font: parseFloat(window.getComputedStyle(text).fontSize)
    };

    // lock current computed width so resizing is stable
    box.style.width = `${Math.round(r.width)}px`;
  };

  const onMove = (e) => {
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // change width/height based on which corner is dragged
    let newW = start.w;
    let newH = start.h;

    if (start.corner.includes("r")) newW = start.w + dx;
    if (start.corner.includes("l")) newW = start.w - dx;

    if (start.corner.includes("b")) newH = start.h + dy;
    if (start.corner.includes("t")) newH = start.h - dy;

    // clamp to viewport limits first
    const maxW = window.innerWidth - 40;
    const maxH = 220;
    newW = Math.max(280, Math.min(newW, maxW));
    newH = Math.max(90, Math.min(newH, maxH));

    // Scale name by width so inward corner drags always shrink text.
    let nextFont = Math.max(28, Math.min(start.font * (newW / start.w), 96));
    text.style.fontSize = `${Math.round(nextFont)}px`;

    // Prevent resizing smaller than the rendered title content.
    const boxStyle = window.getComputedStyle(box);
    const padX = parseFloat(boxStyle.paddingLeft) + parseFloat(boxStyle.paddingRight);
    const padY = parseFloat(boxStyle.paddingTop) + parseFloat(boxStyle.paddingBottom);
    const content = measureTextContent();
    const minContentW = Math.ceil(content.w + padX + 2);
    const minContentH = Math.ceil(content.h + padY + 2);

    newW = Math.max(newW, minContentW);
    newH = Math.max(newH, minContentH);
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);

    // Recompute font from final clamped width.
    nextFont = Math.max(28, Math.min(start.font * (newW / start.w), 96));
    text.style.fontSize = `${Math.round(nextFont)}px`;

    box.style.width = `${Math.round(newW)}px`;
    box.style.paddingTop = "1.15rem"; // keep padding consistent
    box.style.paddingBottom = "2.25rem";

    // fake the height by padding (keeps layout stable + simple)
    // If you want true height resizing, we can do that too.
    box.style.minHeight = `${Math.round(newH)}px`;

    updateDims();
  };

  const onUp = () => {
    start = null;
  };

  handles.forEach(h => {
    const corner = h.classList.contains("tl") ? "tl"
      : h.classList.contains("tr") ? "tr"
      : h.classList.contains("bl") ? "bl"
      : "br";

    h.addEventListener("pointerdown", (e) => onDown(e, corner));
  });

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
})();

(() => {
  const map = document.getElementById("hobbyMap");
  const svg = document.getElementById("hobbyMapEdges");
  const nodesHost = document.getElementById("hobbyMapNodes");
  const laneBar = document.getElementById("hobbyLaneBar");
  const inspector = document.getElementById("hobbyMapInspector");
  const inspectorTitle = document.getElementById("hobbyMapInspectorTitle");
  const inspectorDetail = document.getElementById("hobbyMapInspectorDetail");
  if (!map || !svg || !nodesHost || !laneBar || !inspector || !inspectorTitle || !inspectorDetail) return;

  const viewW = 1000;
  const viewH = 680;

  const nodes = [
    { id: "ski", label: "Ski", detail: "AST1 and handling risk calmly.", theme: "ski", x: 7, y: 10, root: true, virtualRoot: true },
    { id: "mtb", label: "MTB", detail: "Trail systems and management mindset.", theme: "mtb", x: 18, y: 10, root: true, virtualRoot: true },
    { id: "hiking", label: "Hiking", detail: "Long-haul consistency and work ethic.", theme: "hiking", x: 29, y: 10, root: true, virtualRoot: true },
    { id: "reading", label: "Reading", detail: "From ideas to clear communication.", theme: "reading", x: 41, y: 10, root: true, virtualRoot: true },
    { id: "movies", label: "Movies", detail: "Design thinking and storytelling flow.", theme: "movies", x: 53, y: 10, root: true, virtualRoot: true },
    { id: "music", label: "Music", detail: "Generative experimentation and systems.", theme: "music", x: 65, y: 10, root: true, virtualRoot: true },
    { id: "games", label: "Games", detail: "Automation, modding, and tool logic.", theme: "games", x: 77, y: 10, root: true, virtualRoot: true },
    { id: "tinkering", label: "Tinkering", detail: "Build, test, iterate, repeat.", theme: "tinkering", x: 90, y: 10, root: true, virtualRoot: true },

    { id: "ski-ast1", label: "AST1", detail: "Risk models in real terrain.", theme: "ski", x: 7, y: 20 },
    { id: "ski-risk", label: "Calm under risk", detail: "Decision quality under pressure.", theme: "ski", x: 7, y: 32 },
    { id: "ski-mount", label: "Insta360/GoPro mount", detail: "Zipties + seal design challenge.", theme: "ski", x: 10, y: 74 },

    { id: "mtb-timber", label: "Timberline trails", detail: "Trail networks and logistics.", theme: "mtb", x: 18, y: 24 },
    { id: "mtb-manage", label: "Management", detail: "Constraints, access, and planning.", theme: "mtb", x: 18, y: 36 },
    { id: "mtb-sustain", label: "Sustainability", detail: "Long-view system thinking.", theme: "mtb", x: 18, y: 48 },
    { id: "mtb-network", label: "Network complete", detail: "Project closure and ownership.", theme: "mtb", x: 20, y: 74 },

    { id: "hiking-ethic", label: "Work ethic", detail: "Consistency turns effort into output.", theme: "hiking", x: 29, y: 56 },

    { id: "read-write", label: "Writing", detail: "Structure ideas with purpose.", theme: "reading", x: 40, y: 23 },
    { id: "read-convey", label: "Convey ideas", detail: "Translate complexity clearly.", theme: "reading", x: 40, y: 35 },
    { id: "read-leaf", label: "Leaf Walker presentation", detail: "Public technical storytelling.", theme: "reading", x: 40, y: 47 },

    { id: "movie-design", label: "Design", detail: "Visual systems and narrative framing.", theme: "movies", x: 53, y: 27 },
    { id: "movie-yt", label: "YT channel", detail: "Execution and audience feedback.", theme: "movies", x: 53, y: 40 },
    { id: "movie-stream", label: "Live streaming", detail: "Real-time communication practice.", theme: "movies", x: 53, y: 56 },

    { id: "cwsf", label: "CWSF 2024 presentation", detail: "Cross-domain synthesis.", theme: "core", x: 45, y: 74 },

    { id: "music-album", label: "Album gen", detail: "Creative pipeline experimentation.", theme: "music", x: 65, y: 26 },
    { id: "music-gesture", label: "Gesture link", detail: "Input mapping to engineered behavior.", theme: "music", x: 65, y: 40 },

    { id: "game-auto", label: "Automation", detail: "Workflow and repeatability.", theme: "games", x: 77, y: 26 },
    { id: "game-mod", label: "Modding", detail: "Systems reverse-engineering.", theme: "games", x: 77, y: 40 },
    { id: "game-pathfind", label: "Pathfind", detail: "Logic to robust implementation.", theme: "games", x: 77, y: 54 },

    { id: "tink-lego", label: "Lego", detail: "Mechanisms and constraints.", theme: "tinkering", x: 90, y: 22 },
    { id: "tink-car", label: "Car design", detail: "Geometry and packaging tradeoffs.", theme: "tinkering", x: 90, y: 34 },
    { id: "tink-problem", label: "Problem solving", detail: "Breakdown and iteration loops.", theme: "tinkering", x: 90, y: 45 },
    { id: "tink-print", label: "3D print", detail: "Physical prototyping feedback cycles.", theme: "tinkering", x: 90, y: 56 },
    { id: "tink-robot", label: "Coding / robotics", detail: "Hardware-software integration.", theme: "tinkering", x: 90, y: 67 },
    { id: "tink-modulus", label: "Modulus drawers", detail: "Practical CAD-to-build outcomes.", theme: "tinkering", x: 86, y: 78 },
    { id: "tink-litho", label: "Litholamps", detail: "Material and process exploration.", theme: "tinkering", x: 94, y: 78 },

    { id: "engineering", label: "ENGINEERING", detail: "The common destination.", theme: "core", x: 58, y: 91, engineering: true }
  ];

  const edges = [
    { from: "ski", to: "ski-ast1", theme: "ski", group: "ski" },
    { from: "ski-ast1", to: "ski-risk", theme: "ski", group: "ski" },
    { from: "ski-risk", to: "ski-mount", theme: "ski", group: "ski" },
    { from: "ski-mount", to: "engineering", theme: "core", group: "ski" },

    { from: "mtb", to: "mtb-timber", theme: "mtb", group: "mtb" },
    { from: "mtb-timber", to: "mtb-manage", theme: "mtb", group: "mtb" },
    { from: "mtb-manage", to: "mtb-sustain", theme: "mtb", group: "mtb" },
    { from: "mtb-sustain", to: "mtb-network", theme: "mtb", group: "mtb" },
    { from: "mtb-network", to: "engineering", theme: "core", group: "mtb" },

    { from: "hiking", to: "hiking-ethic", theme: "hiking", group: "hiking" },
    { from: "hiking-ethic", to: "engineering", theme: "core", group: "hiking" },

    { from: "reading", to: "read-write", theme: "reading", group: "reading" },
    { from: "read-write", to: "read-convey", theme: "reading", group: "reading" },
    { from: "read-convey", to: "read-leaf", theme: "reading", group: "reading" },
    { from: "read-leaf", to: "cwsf", theme: "core", group: "reading" },
    { from: "cwsf", to: "engineering", theme: "core", group: "reading" },

    { from: "movies", to: "movie-design", theme: "movies", group: "movies" },
    { from: "movie-design", to: "movie-yt", theme: "movies", group: "movies" },
    { from: "movie-yt", to: "movie-stream", theme: "movies", group: "movies" },
    { from: "movie-stream", to: "cwsf", theme: "core", group: "movies" },
    { from: "cwsf", to: "engineering", theme: "core", group: "movies" },

    { from: "music", to: "music-album", theme: "music", group: "music" },
    { from: "music-album", to: "music-gesture", theme: "music", group: "music" },
    { from: "music-gesture", to: "engineering", theme: "core", group: "music" },

    { from: "games", to: "game-auto", theme: "games", group: "games" },
    { from: "game-auto", to: "game-mod", theme: "games", group: "games" },
    { from: "game-mod", to: "game-pathfind", theme: "games", group: "games" },
    { from: "game-pathfind", to: "engineering", theme: "core", group: "games" },

    { from: "tinkering", to: "tink-lego", theme: "tinkering", group: "tinkering" },
    { from: "tink-lego", to: "tink-car", theme: "tinkering", group: "tinkering" },
    { from: "tink-car", to: "tink-problem", theme: "tinkering", group: "tinkering" },
    { from: "tink-problem", to: "tink-print", theme: "tinkering", group: "tinkering" },
    { from: "tink-print", to: "tink-robot", theme: "tinkering", group: "tinkering" },
    { from: "tink-robot", to: "tink-modulus", theme: "tinkering", group: "tinkering" },
    { from: "tink-robot", to: "tink-litho", theme: "tinkering", group: "tinkering" },
    { from: "tink-modulus", to: "engineering", theme: "core", group: "tinkering" },
    { from: "tink-litho", to: "engineering", theme: "core", group: "tinkering" }
  ];

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nodeGroupsById = new Map();
  edges.forEach(({ from, to, group }) => {
    if (!nodeGroupsById.has(from)) nodeGroupsById.set(from, new Set());
    if (!nodeGroupsById.has(to)) nodeGroupsById.set(to, new Set());
    nodeGroupsById.get(from).add(group);
    nodeGroupsById.get(to).add(group);
  });
  const firstNodeByGroup = new Map();
  edges.forEach(({ from, to, group }) => {
    if (from === group && !firstNodeByGroup.has(group)) {
      firstNodeByGroup.set(group, to);
    }
  });

  const createSvg = (name, attrs) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  };

  const pathD = (a, b) => {
    const start = { x: a.x, y: a.y };
    const end = { x: b.x, y: b.y };

    if (b.id === "engineering") {
      end.y -= Math.max(18, b.h * 0.5 + 8);
    }

    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len;
    const uy = vy / len;
    const startPad = Math.max(8, Math.min(a.w, a.h) * 0.22);
    const endPad = b.id === "engineering-hub"
      ? 0
      : Math.max(8, Math.min(b.w, b.h) * 0.22);
    const sx = start.x + ux * startPad;
    const sy = start.y + uy * startPad;
    const ex = end.x - ux * endPad;
    const ey = end.y - uy * endPad;

    const dy = ey - sy;
    const curve = Math.max(26, Math.abs(dy) * 0.35);
    const c1x = sx;
    const c1y = sy + curve;
    const c2x = ex;
    const c2y = ey - curve;
    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
  };

  const defs = createSvg("defs", {});
  const marker = createSvg("marker", {
    id: "hobbyArrow",
    markerWidth: 8,
    markerHeight: 6,
    refX: 7,
    refY: 3,
    orient: "auto",
    markerUnits: "strokeWidth"
  });
  marker.appendChild(createSvg("path", { d: "M 0 0 L 8 3 L 0 6 z", fill: "currentColor" }));
  defs.appendChild(marker);

  const terminalMarker = createSvg("marker", {
    id: "hobbyArrowTerminal",
    markerWidth: 6,
    markerHeight: 4.5,
    refX: 5.6,
    refY: 2.25,
    orient: "auto",
    markerUnits: "strokeWidth"
  });
  terminalMarker.appendChild(createSvg("path", { d: "M 0 0 L 6 2.25 L 0 4.5 z", fill: "currentColor" }));
  defs.appendChild(terminalMarker);
  svg.appendChild(defs);

  const edgeEls = [];
  const edgeRecords = [];
  let terminalArrowEl = null;
  const groupColor = {
    ski: "#77c0ff",
    mtb: "#8de07f",
    hiking: "#f2c57c",
    reading: "#d0b8ff",
    movies: "#ff9e8f",
    music: "#8df2d9",
    games: "#9eb3ff",
    tinkering: "#ffda8a"
  };
  const nodeEls = [];
  const nodeElById = new Map();
  const laneElsByGroup = new Map();
  const isMobileView = () => window.matchMedia("(max-width: 900px)").matches;
  const laneNav = document.createElement("div");
  laneNav.className = "hobbyLaneNav";
  const lanePrev = document.createElement("button");
  lanePrev.type = "button";
  lanePrev.className = "hobbyLaneNavButton prev";
  lanePrev.setAttribute("aria-label", "Show previous hobby lanes");
  lanePrev.textContent = "<";
  const laneHint = document.createElement("div");
  laneHint.className = "hobbyLaneHint";
  laneHint.textContent = "More lanes";
  const laneNext = document.createElement("button");
  laneNext.type = "button";
  laneNext.className = "hobbyLaneNavButton next";
  laneNext.setAttribute("aria-label", "Show more hobby lanes");
  laneNext.textContent = ">";
  laneNav.append(lanePrev, laneHint, laneNext);
  map.appendChild(laneNav);

  const rootNodes = nodes.filter((n) => n.virtualRoot);
  const rootByGroup = new Map(rootNodes.map((n) => [n.theme, n]));
  const laneOrder = rootNodes.map((n) => n.theme);
  const mobileLaneWindowSize = 3;
  const mobileLaneSlots = [18, 50, 82];
  const mobileLaneMaxStart = Math.max(0, laneOrder.length - mobileLaneWindowSize);
  const defaultMobileGroup = rootNodes[0]?.theme || null;
  let lockedGroup = null;
  let openNodeId = null;
  let mobileAutoLocked = false;
  let visibleLaneGroups = new Set();
  let mobileLaneStartIndex = 0;
  let mobileScrollSnapTimer = null;
  rootNodes.forEach((root) => {
    const lane = document.createElement("button");
    lane.type = "button";
    lane.className = "hobbyLane";
    lane.textContent = root.label;
    lane.dataset.group = root.theme;
    laneBar.appendChild(lane);
    laneElsByGroup.set(root.theme, lane);
  });

  const groupsForMobileWindow = (startIndex) => {
    const start = Math.max(0, Math.min(startIndex, mobileLaneMaxStart));
    return laneOrder.slice(start, start + mobileLaneWindowSize);
  };

  const clampMobileStart = (startIndex) => Math.max(0, Math.min(startIndex, mobileLaneMaxStart));

  const mobilePageStride = () => {
    const firstLane = laneElsByGroup.get(laneOrder[0]);
    if (!firstLane) return laneBar.clientWidth || 1;
    const laneWidth = firstLane.getBoundingClientRect().width || 1;
    const style = window.getComputedStyle(laneBar);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    return laneWidth + gap;
  };

  const scrollToMobileStart = (startIndex, behavior = "smooth") => {
    const left = clampMobileStart(startIndex) * mobilePageStride();
    laneBar.scrollTo({ left, behavior });
  };

  const updateLaneNav = () => {
    const mobile = isMobileView();
    if (!mobile) {
      laneNav.classList.remove("isVisible");
      laneBar.classList.remove("isScrollable");
      laneHint.hidden = true;
      return;
    }

    laneNav.classList.add("isVisible");
    laneBar.classList.add("isScrollable");
    const canPrev = mobileLaneStartIndex > 0;
    const canNext = mobileLaneStartIndex < mobileLaneMaxStart;

    lanePrev.disabled = !canPrev;
    laneNext.disabled = !canNext;
    laneHint.hidden = !(canPrev || canNext);
    laneHint.textContent = canNext ? "Swipe for more" : "Swipe back";
  };

  const updateVisibleLaneWindow = () => {
    if (!isMobileView()) {
      map.classList.remove("isLaneWindowed");
      visibleLaneGroups = new Set();
      edgeEls.forEach((el) => el.classList.remove("isWindowHidden"));
      nodeEls.forEach((el) => el.classList.remove("isWindowHidden"));
      if (terminalArrowEl) terminalArrowEl.classList.remove("isWindowHidden");
      return;
    }

    visibleLaneGroups = new Set(groupsForMobileWindow(mobileLaneStartIndex));
    map.classList.add("isLaneWindowed");

    edgeEls.forEach((el) => {
      const group = el.dataset.group || "";
      el.classList.toggle("isWindowHidden", !visibleLaneGroups.has(group));
    });

    nodeEls.forEach((el) => {
      const memberships = (el.dataset.groups || "").split(",").filter(Boolean);
      const isVisible = memberships.some((group) => visibleLaneGroups.has(group));
      el.classList.toggle("isWindowHidden", !isVisible);
    });

    if (terminalArrowEl) {
      terminalArrowEl.classList.toggle("isWindowHidden", visibleLaneGroups.size === 0);
    }
  };

  const normalizeMobileGroupSelection = () => {
    if (!isMobileView()) return;
    const windowGroups = groupsForMobileWindow(mobileLaneStartIndex);
    if (!windowGroups.length) return;
    if (!lockedGroup || !windowGroups.includes(lockedGroup)) {
      lockedGroup = windowGroups[0];
      openNodeId = null;
      mobileAutoLocked = true;
      applyOpenNode();
    }
    if (!openNodeId) setInspector(lockedGroup);
    applyActive(lockedGroup);
  };

  const commitMobileWindow = (nextStartIndex, behavior = "smooth") => {
    const clamped = clampMobileStart(nextStartIndex);
    if (clamped === mobileLaneStartIndex && behavior !== "auto") {
      scrollToMobileStart(clamped, behavior);
      return;
    }
    mobileLaneStartIndex = clamped;
    scrollToMobileStart(mobileLaneStartIndex, behavior);
    layoutAndRender();
    map.classList.add("isWindowSwitching");
    window.setTimeout(() => map.classList.remove("isWindowSwitching"), 170);
    normalizeMobileGroupSelection();
    updateLaneNav();
    updateVisibleLaneWindow();
  };

  const scrollLaneBarByStep = (direction) => {
    commitMobileWindow(mobileLaneStartIndex + direction, "smooth");
  };

  lanePrev.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollLaneBarByStep(-1);
  });
  laneNext.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollLaneBarByStep(1);
  });
  laneBar.addEventListener("scroll", () => {
    if (!isMobileView()) return;
    if (mobileScrollSnapTimer) window.clearTimeout(mobileScrollSnapTimer);
    mobileScrollSnapTimer = window.setTimeout(() => {
      const stride = mobilePageStride();
      const nextStart = clampMobileStart(Math.round((laneBar.scrollLeft || 0) / Math.max(1, stride)));
      commitMobileWindow(nextStart, "smooth");
    }, 110);
  }, { passive: true });

  nodes.forEach((node) => {
    if (node.virtualRoot) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hobbyNode ${node.theme}${node.root ? " root" : ""}${node.engineering ? " engineering" : ""}`;
    button.style.setProperty("--x", node.x);
    button.style.setProperty("--y", node.y);
    button.dataset.id = node.id;
    button.dataset.group = node.theme === "core" ? "core" : node.theme;
    const memberships = [...(nodeGroupsById.get(node.id) || new Set([button.dataset.group]))];
    button.dataset.groups = memberships.join(",");
    button.innerHTML = `
      <div class="hobbyNodeTitle">${node.label}</div>
      <div class="hobbyNodeDetail">${node.detail}</div>
    `;
    nodesHost.appendChild(button);
    nodeEls.push(button);
    nodeElById.set(node.id, button);
  });

  const nodeState = new Map(nodes.map((n) => {
    const x = (n.x / 100) * viewW;
    const y = (n.y / 100) * viewH;
    const isEngineering = Boolean(n.engineering);
    const isRoot = Boolean(n.root);
    return [
      n.id,
      {
        id: n.id,
        x,
        y,
        anchorX: x,
        anchorY: y,
        w: n.virtualRoot ? 0 : 128,
        h: n.virtualRoot ? 0 : 42,
        fixedX: isEngineering,
        fixedY: isEngineering || isRoot,
        inLayout: !n.virtualRoot
      }
    ];
  }));

  const syncNodeAnchorsForViewport = () => {
    const mobile = isMobileView();
    const pageGroups = groupsForMobileWindow(mobileLaneStartIndex);
    const groupOffset = new Map();
    const mobileYShift = 8;
    const mobileTrailStartY = 20;
    pageGroups.forEach((group, index) => {
      const root = rootByGroup.get(group);
      if (!root) return;
      const slotX = mobileLaneSlots[Math.min(index, mobileLaneSlots.length - 1)];
      groupOffset.set(group, slotX - root.x);
    });

    nodeState.forEach((state, id) => {
      const node = nodeById.get(id);
      if (!node) return;
      const baseX = (node.x / 100) * viewW;
      const yPercent = mobile && !node.engineering ? Math.max(8, node.y - mobileYShift) : node.y;
      const baseY = (yPercent / 100) * viewH;
      let anchorX = baseX;
      if (mobile && node.theme !== "core") {
        const offset = groupOffset.get(node.theme);
        if (offset !== undefined) {
          anchorX = ((node.x + offset) / 100) * viewW;
        }
      }
      state.anchorX = anchorX;
      state.anchorY = baseY;
    });

    if (mobile) {
      pageGroups.forEach((group) => {
        const firstNodeId = firstNodeByGroup.get(group);
        if (!firstNodeId) return;
        const firstState = nodeState.get(firstNodeId);
        if (!firstState) return;
        firstState.anchorY = (mobileTrailStartY / 100) * viewH;
      });
    }
  };

  const applyNodePositions = () => {
    nodeState.forEach((s) => {
      const el = nodeElById.get(s.id);
      if (!el) return;
      el.style.setProperty("--x", ((s.x / viewW) * 100).toFixed(3));
      el.style.setProperty("--y", ((s.y / viewH) * 100).toFixed(3));
    });
  };

  const redrawEdges = () => {
    const engineering = nodeState.get("engineering");
    const hub = engineering
      ? {
        x: engineering.x,
        y: engineering.y - Math.max(18, engineering.h * 0.5 + 8) - 24,
        w: 0,
        h: 0,
        id: "engineering-hub"
      }
      : null;

    edgeRecords.forEach(({ edge, el }) => {
      const from = nodeState.get(edge.from);
      const to = nodeState.get(edge.to);
      if (!from || !to) return;

      if (edge.to === "engineering" && hub) {
        el.setAttribute("d", pathD(from, hub));
      } else {
        el.setAttribute("d", pathD(from, to));
      }
    });

    if (engineering && terminalArrowEl) {
      const endY = engineering.y - Math.max(18, engineering.h * 0.5 + 8);
      const startY = hub ? hub.y : endY - 34;
      terminalArrowEl.setAttribute("d", `M ${engineering.x} ${startY} L ${engineering.x} ${endY}`);
    }
  };

  edges.forEach((edge) => {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) return;

    const p = createSvg("path", {
      d: "",
      class: `hobbyEdge ${edge.theme}`,
      "marker-end": edge.to === "engineering" ? "" : "url(#hobbyArrow)"
    });
    p.dataset.group = edge.group;
    svg.appendChild(p);
    edgeEls.push(p);
    edgeRecords.push({ edge, el: p });
  });

  terminalArrowEl = createSvg("path", {
    d: "",
    class: "hobbyEdge core terminal",
    "marker-end": "url(#hobbyArrowTerminal)"
  });
  svg.appendChild(terminalArrowEl);

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  const measureNodes = () => {
    const mapRect = map.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;
    nodeState.forEach((s) => {
      const el = nodeElById.get(s.id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      s.w = (r.width / mapRect.width) * viewW;
      s.h = (r.height / mapRect.height) * viewH;
    });
  };

  const separatePair = (a, b, axis, amount, sign) => {
    const moveA = axis === "x" ? !a.fixedX : !a.fixedY;
    const moveB = axis === "x" ? !b.fixedX : !b.fixedY;
    const movers = Number(moveA) + Number(moveB);
    if (!movers) return;

    const share = amount / movers;
    if (axis === "x") {
      if (moveA) a.x -= sign * share;
      if (moveB) b.x += sign * share;
      return;
    }
    if (moveA) a.y -= sign * share;
    if (moveB) b.y += sign * share;
  };

  const relaxLayout = () => {
    const states = [...nodeState.values()].filter((s) => s.inLayout);
    const gap = 14;

    for (let iter = 0; iter < 140; iter += 1) {
      states.forEach((s) => {
        if (!s.fixedX) s.x += (s.anchorX - s.x) * 0.06;
        if (!s.fixedY) s.y += (s.anchorY - s.y) * 0.03;

        if (s.fixedX) s.x = s.anchorX;
        if (s.fixedY) s.y = s.anchorY;

        const minX = s.w / 2 + 8;
        const maxX = viewW - s.w / 2 - 8;
        const minY = s.h / 2 + 8;
        const maxY = viewH - s.h / 2 - 8;
        s.x = clamp(s.x, minX, maxX);
        s.y = clamp(s.y, minY, maxY);
      });

      for (let i = 0; i < states.length; i += 1) {
        const a = states[i];
        for (let j = i + 1; j < states.length; j += 1) {
          const b = states[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const overlapX = (a.w + b.w) / 2 + gap - Math.abs(dx);
          const overlapY = (a.h + b.h) / 2 + gap - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;

          const canMoveX = !(a.fixedX && b.fixedX);
          const canMoveY = !(a.fixedY && b.fixedY);
          if (!canMoveX && !canMoveY) continue;

          let axis = overlapX < overlapY ? "x" : "y";
          if (axis === "x" && !canMoveX) axis = "y";
          if (axis === "y" && !canMoveY) axis = "x";

          const sign = (axis === "x" ? dx : dy) === 0
            ? (j % 2 === 0 ? 1 : -1)
            : Math.sign(axis === "x" ? dx : dy);
          const amount = axis === "x" ? overlapX : overlapY;
          separatePair(a, b, axis, amount, sign);
        }
      }
    }
  };

  const layoutAndRender = () => {
    syncNodeAnchorsForViewport();
    applyNodePositions();
    measureNodes();
    relaxLayout();
    if (isMobileView()) {
      nodeState.forEach((state) => {
        const minX = state.w / 2 + 16;
        const maxX = viewW - state.w / 2 - 16;
        state.x = clamp(state.anchorX, minX, maxX);
      });
    }
    applyNodePositions();
    redrawEdges();
  };

  layoutAndRender();
  updateLaneNav();
  updateVisibleLaneWindow();
  window.addEventListener("resize", () => {
    layoutAndRender();
    updateLaneNav();
    updateVisibleLaneWindow();
    syncMobileDefaultGroup();
  });

  const activeIdsForGroup = (group) => {
    const ids = new Set(["engineering"]);
    edges.forEach((edge) => {
      if (edge.group !== group) return;
      ids.add(edge.from);
      ids.add(edge.to);
    });
    return ids;
  };

  const applyOpenNode = () => {
    nodeEls.forEach((el) => {
      el.classList.toggle("isOpen", el.dataset.id === openNodeId);
    });
  };

  const setInspector = (nodeId) => {
    if (!nodeId) {
      inspector.className = "hobbyMapInspector";
      inspectorTitle.textContent = "Hover a node";
      inspectorDetail.textContent = "Select a node to preview project content and deeper context.";
      return;
    }

    const node = nodeById.get(nodeId);
    if (!node) return;
    inspector.className = `hobbyMapInspector ${node.theme}`;
    inspectorTitle.textContent = node.label;
    inspectorDetail.textContent = node.detail;
  };

  const applyActive = (group) => {
    if (!group || group === "core") {
      map.classList.remove("isFiltered");
      edgeEls.forEach((el) => el.classList.remove("isActive"));
      nodeEls.forEach((el) => el.classList.remove("isActive"));
      laneElsByGroup.forEach((lane) => lane.classList.remove("isActive"));
      if (terminalArrowEl) {
        terminalArrowEl.classList.remove("isActive");
        terminalArrowEl.style.stroke = "";
      }
      if (!openNodeId) setInspector(null);
      return;
    }

    const activeIds = activeIdsForGroup(group);
    map.classList.add("isFiltered");
    edgeEls.forEach((el) => {
      el.classList.toggle("isActive", el.dataset.group === group);
    });
    nodeEls.forEach((el) => {
      el.classList.toggle("isActive", activeIds.has(el.dataset.id));
    });
    laneElsByGroup.forEach((lane, laneGroup) => {
      lane.classList.toggle("isActive", laneGroup === group);
    });
    if (terminalArrowEl) {
      terminalArrowEl.classList.add("isActive");
      terminalArrowEl.style.stroke = groupColor[group] || "";
    }
  };

  const syncMobileDefaultGroup = () => {
    if (isMobileView()) {
      if (!defaultMobileGroup) return;
      normalizeMobileGroupSelection();
      updateVisibleLaneWindow();
      return;
    }

    if (mobileAutoLocked && !openNodeId) {
      lockedGroup = null;
      applyActive(null);
      updateVisibleLaneWindow();
      setInspector(null);
    }
    mobileAutoLocked = false;
  };

  nodeEls.forEach((nodeEl) => {
    const group = nodeEl.dataset.group;
    const nodeId = nodeEl.dataset.id;

    nodeEl.addEventListener("mouseenter", () => {
      if (openNodeId) return;
      setInspector(nodeId);
      if (lockedGroup) return;
      applyActive(group);
    });
    nodeEl.addEventListener("mouseleave", () => {
      if (!openNodeId) setInspector(null);
      if (lockedGroup) return;
      applyActive(null);
    });
    nodeEl.addEventListener("focus", () => {
      if (openNodeId) return;
      setInspector(nodeId);
      if (lockedGroup) return;
      applyActive(group);
    });
    nodeEl.addEventListener("blur", () => {
      if (!openNodeId) setInspector(null);
      if (lockedGroup) return;
      applyActive(null);
    });
    nodeEl.addEventListener("click", () => {
      lockedGroup = group;
      mobileAutoLocked = false;
      openNodeId = nodeId;
      setInspector(openNodeId);
      applyOpenNode();
      applyActive(lockedGroup);
      updateVisibleLaneWindow();
    });
  });

  laneElsByGroup.forEach((laneEl, group) => {
    laneEl.addEventListener("mouseenter", () => {
      if (!openNodeId) setInspector(group);
      if (lockedGroup) return;
      applyActive(group);
    });
    laneEl.addEventListener("mouseleave", () => {
      if (!openNodeId) setInspector(null);
      if (lockedGroup) return;
      applyActive(null);
    });
    laneEl.addEventListener("focus", () => {
      if (lockedGroup) return;
      applyActive(group);
    });
    laneEl.addEventListener("blur", () => {
      if (lockedGroup) return;
      applyActive(null);
    });
    laneEl.addEventListener("click", () => {
      if (isMobileView()) {
        lockedGroup = group;
        const laneIndex = laneOrder.indexOf(group);
        if (laneIndex >= 0) {
          commitMobileWindow(laneIndex, "smooth");
        }
      } else {
        lockedGroup = lockedGroup === group ? null : group;
      }
      mobileAutoLocked = false;
      openNodeId = null;
      setInspector(lockedGroup ? group : null);
      applyOpenNode();
      applyActive(lockedGroup);
      laneEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      updateVisibleLaneWindow();
    });
  });

  map.addEventListener("click", (e) => {
    if (e.target instanceof Element && (e.target.closest(".hobbyNode") || e.target.closest(".hobbyLane") || e.target.closest(".hobbyLaneNav"))) return;
    openNodeId = null;
    applyOpenNode();
    if (isMobileView()) {
      if (!lockedGroup) {
        lockedGroup = defaultMobileGroup;
        mobileAutoLocked = true;
      }
      setInspector(lockedGroup);
      applyActive(lockedGroup);
      updateVisibleLaneWindow();
      return;
    }
    lockedGroup = null;
    mobileAutoLocked = false;
    setInspector(null);
    applyActive(null);
    updateVisibleLaneWindow();
  });

  syncMobileDefaultGroup();
})();

(() => {
  const libraries = [...document.querySelectorAll("[data-project-library]")];
  if (!libraries.length) return;

  const sectionLabelByCategory = {
    quick: "Quick Side Quests",
    standalone: "Standalone Projects",
    construction: "Under Construction"
  };

  const sectionUrlByCategory = {
    quick: "/quick/",
    standalone: "/projects/",
    construction: "/construction/"
  };

  const projectCatalog = [
    
    
    {
      id: "quick-gopro-ziptie-mount",
      category: "quick",
      type: "single",
      title: "GoPro Mount With Zip-Tie Holes",
      hero: "/assets/images/Misc%20Quick/goproclip%20mount.png",
      alt: "GoPro mount with tie-down holes for secondary retention",
      problem: "Adhesive-only camera mounts were high risk for expensive gear in vibration-heavy conditions.",
      solution: "I designed a low-profile mount with dedicated zip-tie retention paths so the camera is mechanically secured even if adhesive performance degrades.",
      tags: ["Retention", "Safety", "3D printing", "Field hardware", "Camera mount"],
      skills: ["Design for reliability", "Stress-aware geometry", "Rapid prototyping", "User testing", "Product refinement"]
    },
    {
      id: "quick-airpods-case-pro-max",
      category: "quick",
      type: "single",
      title: "AirPods Case Pro Max",
      hero: "/assets/images/Airpods%20Case%20Pro%20Max/blender%20render.png",
      alt: "Custom slim AirPods protective case concept",
      problem: "Most available cases were bulky or lacked a reliable closure when dropped.",
      solution: "I built a slim shell with an internal compliant mechanism that keeps the lid closed under impact while preserving daily usability.",
      tags: ["Compliant mechanism", "Consumer product", "Drop resistance", "Rapid design", "3D printing"],
      skills: ["CAD surfacing", "Compliant design", "Iteration loops", "Prototype evaluation", "Product design"]
    },
    {
      id: "quick-phone-case-dual-body",
      category: "quick",
      type: "single",
      title: "3D Printed Phone Case (Dual-Body)",
      hero: "/assets/images/underConstruction.jpg",
      alt: "Dual-material phone case concept with TPU underbody",
      problem: "There were no solid case options for my phone model that balanced impact performance with printability.",
      solution: "I designed a two-part structure with a TPU underbody and rigid outer shell to improve shock absorption compared with a single hard body.",
      tags: ["Consumer hardware", "Impact design", "Dual material", "3D printing", "Custom fit"],
      skills: ["Parametric CAD", "Material selection", "Print validation", "Iterative design", "Product development"]
    },
    
    {
      id: "quick-ball-bearing-lego-hub",
      category: "quick",
      type: "single",
      title: "Ball Bearing Lego Wheel Hub",
      hero: "/assets/images/earlyCad.JPG",
      alt: "CAD concept for Lego wheel hub using skate bearings",
      problem: "Standard hubs were failing at higher RPM and torque during drift chassis testing.",
      solution: "I created a drop-in replacement hub using skateboard bearings to improve durability and rotational stability under load.",
      tags: ["Lego Technic", "High RPM", "Custom part", "3D printing", "Drivetrain"],
      skills: ["Mechanical design", "Tolerance tuning", "Iteration", "Prototype testing", "Design for load paths"]
    },
    {
      id: "quick-ikea-floor-lamp-conversion",
      category: "quick",
      type: "single",
      title: "IKEA PS 2014 Pendant to Floor Lamp Conversion",
      hero: "/assets/images/youngPop1.JPG",
      alt: "IKEA PS 2014 conversion hardware prototype",
      problem: "The pendant form factor did not match my space and I wanted a daily-use floor lamp setup instead.",
      solution: "I built a printable conversion adapter and integrated wiring updates, creating a stable floor lamp configuration from the original pendant unit.",
      tags: ["Home hardware", "Conversion build", "3D printing", "Soldering", "Daily-use design"],
      skills: ["Mechanical adaptation", "Electrical assembly", "CAD modeling", "Hands-on fabrication", "Iteration"]
    },
    {
      id: "quick-cise-award-trophy-model",
      category: "quick",
      type: "single",
      title: "CISE Automotive Innovation Award Trophy Model",
      hero: "/assets/images/CISE/CISE%20transport%20Trophy.jpg",
      alt: "Physical CISE trophy and CAD recreation project",
      problem: "I wanted a permanent, printable version of a temporary trophy with moving functional detail.",
      solution: "I reverse modeled the trophy in CAD and integrated a large print-in-place bearing to preserve the signature motion element.",
      tags: ["Reverse engineering", "CAD modeling", "Commemorative design", "3D printing", "Mechanical detail"],
      skills: ["Fusion 360", "Surface modeling", "Design for print", "Mechanical packaging", "Iteration"]
    },
    {
      id: "quick-lithoplanes",
      category: "quick",
      type: "single",
      title: "LithoPlanes",
      hero: "/assets/images/lithodemo.png",
      alt: "LithoPlanes illuminated product concept",
      problem: "Litholamps needed a broader consumer product direction with better portability and convenience.",
      solution: "I developed a market-ready variant with remote control and rechargeable battery integration for wider adoption.",
      tags: ["Product design", "Lighting", "Consumer hardware", "Rechargeable", "Iteration"],
      skills: ["Mechanical design", "Circuit design", "3D printing", "Product development", "Testing"]
    },
    
    {
      id: "quick-arduino-sonar-gui",
      category: "quick",
      type: "single",
      title: "Arduino Sonar With Python GUI",
      hero: "/assets/images/Arduino%20Ultrasonic%20Radar/ultrasonic%20radar.jpg",
      alt: "Arduino sonar visualization interface",
      problem: "A class project needed live sensor feedback that was easy to read and debug during demonstrations.",
      solution: "I connected an Arduino sonar unit to a Python GUI over serial, enabling a clear real-time display for testing and presentation.",
      tags: ["Arduino", "Sensors", "Serial", "Tkinter", "Course project"],
      skills: ["C++", "Python", "Serial communications", "GUI implementation", "Debug workflow"]
    },
    {
      id: "quick-grad-most-likely-template",
      category: "quick",
      type: "single",
      title: "Grad Most Likely To Template",
      hero: "/assets/images/Most Likely To.png",
      alt: "Web template for moderated graduation voting",
      problem: "Schools needed a simple, moderated, and interactive way to run class voting without complex setup.",
      solution: "I built a reusable web template with moderation-oriented structure so institutions can host and manage submissions quickly. View the repo: https://github.com/mcneds/Grad-Most-Likely-To-Template",
      tags: ["Web app", "Education", "Moderation", "Template", "Interactive forms"],
      skills: ["HTML", "CSS", "JavaScript", "API development", "Online moderation workflows"]
    },
    {
      id: "quick-steganography-tool",
      category: "quick",
      type: "single",
      title: "Steganography Tool (Web)",
      hero: "/assets/images/underConstruction.jpg",
      heroIframe: "https://mcneds.github.io/steganography/",
      heroAspect: "4 / 3",
      alt: "Web-based steganography interface",
      problem: "I wanted a browser-based way to hide files in images with flexible unlock options beyond a single password model.",
      solution: "I rebuilt an earlier high-school concept into a web tool that supports keys, files, or passphrases for extraction workflows.",
      tags: ["Web application", "Steganography", "Client tooling", "Algorithms", "Security concepts"],
      skills: ["JavaScript", "Algorithm design", "UI implementation", "File handling", "Front-end architecture"]
    },
    {
      id: "quick-trigen",
      category: "quick",
      type: "single",
      title: "Trigen: Whole-Number Triangle Generator",
      hero: "/assets/images/earlyCad.JPG",
      alt: "Trigen whole-number triangle workflow",
      problem: "Constraint-based building systems need whole-number dimensions, but selecting valid triangle combinations manually is slow.",
      solution: "I created a heuristic-based visual generator for whole-number triangles to speed design in systems like Lego Technic and Minecraft grids.",
      tags: ["Math tool", "Discrete systems", "Geometry", "Heuristics", "Builder workflow"],
      skills: ["Python", "Algorithm design", "Tkinter", "Visualization", "Constraint modeling"]
    },
    {
      id: "quick-album-poster-generator",
      category: "quick",
      type: "single",
      title: "Album Poster Generator",
      hero: "/assets/images/youngPop2.JPG",
      alt: "Generated album poster concept artwork",
      problem: "Making stylized album posters by hand was repetitive and slow for rapid experimentation.",
      solution: "I built a pipeline that pulls Spotify API data and formats posters with CSS-driven layouts for quick design iteration.",
      tags: ["Creative coding", "Spotify API", "Poster design", "Web app", "Automation"],
      skills: ["JavaScript", "CSS", "API integration", "Graphic design", "Front-end implementation"]
    },
    {
      id: "standalone-leaf-walker-platform",
      category: "standalone",
      type: "detail",
      detailUrl: "/projects/leaf-walker-platform/",
      title: "Leaf Walker: A Better Forestry Platform",
      hero: "/assets/images/leafwalker/leafwalkerWalking.jpg",
      alt: "Leaf Walker forestry platform prototype",
      problem: "How can a new steering system be created to lessen the effect current designs have on the ground, while making pathing through forests more efficient?",
      solution: "An independent virtual pivot steering system and bogey lift mechanism solve these issues, producing an immensely capable platform with a feasible path to real-world implementation.",
      tags: ["Forestry platform", "Virtual pivot steering", "Sustainability", "Ground-impact reduction", "Pathing efficiency"],
      skills: ["Mechanical engineering", "Automotive steering geometry", "Prototype testing", "Iterative design", "Engineering communication"]
    },
    {
      id: "standalone-arduino-line-follower",
      category: "standalone",
      type: "single",
      title: "Arduino Line Follower and Object Avoidance",
      hero: "/assets/images/line follower PID.png",
      heroVideo: "/assets/images/line follower PID.web.mp4",
      alt: "Line follower robot testing setup",
      problem: "The robot needed to track increasingly complex line courses while handling both movable and fixed obstacles.",
      solution: "I integrated infrared sensing, line-following logic, and obstacle response tuning so the platform could complete harder tracks more consistently.",
      tags: ["Arduino", "Line following", "Obstacle handling", "Controls", "Autonomy"],
      skills: ["C++", "Sensor integration", "PID tuning", "Path behavior tuning", "Team execution"]
    },
    {
      id: "standalone-tie-rod-tab",
      category: "standalone",
      type: "detail",
      detailUrl: "/projects/tie-rod-tab/",
      title: "Tie Rod Tab (UBC Baja SAE)",
      hero: "/assets/images/Tie%20Rod%20Tab/on upright with rods.jpg",
      alt: "Tie rod tab CAD model for UBC Baja SAE",
      problem: "The steering linkage mount required a compact tab design with clear manufacturability and load-path confidence.",
      solution: "I designed a tab mount with geometry tuned for fit-up, fabrication practicality, and stable integration into the broader steering package.",
      tags: ["Baja SAE", "Automotive", "Mount design", "Fabrication-ready", "CAD"],
      skills: ["Mechanical design", "GD&T awareness", "CAD workflow", "Design review", "Iteration"]
    },
    
    {
      id: "standalone-solidworks-sketch-exporter",
      category: "standalone",
      type: "single",
      actionUrl: "/projects/solidworks-sketch-viewer/",
      actionLabel: "Open viewer test page",
      actionNewTab: true,
      title: "SOLIDWORKS 3D Sketch Exporter and 2D Previewer",
      hero: "/assets/images/solidworks3DSketchExp.webp",
      alt: "SolidWorks add-in exporter and previewer interface concept",
      problem: "My BeamNG simulation pipeline tooling (WIP) required 3D sketch export, but native workflows were not streamlined for rapid iteration.",
      solution: "I built a custom C# SolidWorks add-in supporting multi-select export, construction filtering, axis remapping, and destination controls. A simple prokection viewer validated results and supported quick checks without leaving the CAD environment.",
      tags: ["SOLIDWORKS", "Add-in", "Automation", "BeamNG pipeline", "Engineering tools"],
      skills: ["C#", "SOLIDWORKS API", "Tool architecture", "Export workflows", "User-focused tooling"]
    },
    {
      id: "standalone-parkour-pathfinding-demo",
      category: "standalone",
      type: "detail",
      detailUrl: "/projects/walk-in-the-parkour-pathfinding/",
      title: "Walk in the Parkour Pathfinding Algorithm Demo",
      hero: "/assets/images/parkourdemo.png",
      heroVideo: "/assets/images/parkour/Minecraft Procedural Parkour.mp4",
      alt: "Voxel parkour pathfinding demonstration",
      problem: "Using simple randwalks or A* for platforming paths in a voxel environment led to unenjoyable or boring routes that didn't respect player engagement constraints.",
      solution: "I simulated player jump constraints in sampled environments and used that state to generate procedural platforming paths in an efficient way. The resulting algorithm produced more interesting routes that respected jump feasibility and engagement considerations.",
      tags: ["Path finding", "Voxel systems", "Procedural generation", "Game tooling", "Simulation"],
      skills: ["Algorithm design", "C++", "Java", "Python", "Systems simulation"]
    },
    {
      id: "standalone-gopro-insta360-adapter",
      category: "standalone",
      type: "single",
      title: "GoPro to Insta360 Adapter",
      hero: "/assets/images/Misc%20Quick/tabor 1_Screenshot.jpg",
      alt: "GoPro to Insta360 3D printed adapter",
      problem: "I already had a large GoPro hardware stack, but wanted to run an Insta360 workflow without rebuilding my whole mounting ecosystem.",
      solution: "I created a compact adapter geometry that snaps into the existing GoPro hardware set, so camera transitions are quick and existing gear remains useful.",
      tags: ["Adapter", "Rapid build", "3D printing", "Camera hardware", "Reuse"],
      skills: ["CAD", "Mechanical packaging", "Fit testing", "Iterative prototyping", "Design for compatibility"]
    },
    
    {
      id: "standalone-elliptical-arch-bridge",
      category: "standalone",
      type: "detail",
      detailUrl: "/projects/standalone-elliptical-arch-bridge/",
      title: "Elliptical Arch Popsicle Bridge",
      hero: "/assets/images/Elliptical%20Arch%20Bridge/project pictures/final/finished photos/Snapchat-1075044333.jpg",
      alt: "Popsicle-stick bridge project concept",
      problem: "The 100-stick no-modification constraint created a tight optimization problem for load path and shape selection.",
      solution: "I developed an elliptical arch layout and iterated the structure as a first-year term project to balance stiffness and material limits.",
      tags: ["Structural design", "Bridge project", "Constraint challenge", "Iteration", "Education"],
      skills: ["Engineering design", "FEA-informed thinking", "Modeling", "Project planning", "Research"]
    },
    {
      id: "standalone-drinkbot",
      category: "standalone",
      type: "single",
      title: "DrinkBot: Automatic Dog Water Refiller",
      hero: "/assets/images/drinkBot/DRINKBOT%20poster.png",
      alt: "DrinkBot hardware and electronics project",
      problem: "The refill system needed reliable sensing and waterproof-aware design while remaining understandable for users.",
      solution: "I combined strain-gage signal handling, enclosure considerations, and custom LCD behavior to produce a practical automatic refill prototype.",
      tags: ["Embedded system", "Arduino", "Sensors", "Waterproofing", "Team project"],
      skills: ["C++", "Circuit design", "Noise reduction", "System integration", "Prototype validation"]
    },
    {
      id: "standalone-parametric-shop-desk",
      category: "standalone",
      type: "single",
      title: "Fully Parametric Shop Desk",
      hero: "/assets/images/underConstruction.jpg",
      alt: "Parametric desk model for plywood and dimensional lumber builds",
      problem: "Small and large spaces needed different desk footprints, but one-off designs were time-consuming to adjust.",
      solution: "I built a parameter-driven desk model so dimensions can be regenerated quickly for different spaces while preserving structural logic.",
      tags: ["Woodworking", "Parametric design", "Fabrication", "Shop tooling", "Scalable layout"],
      skills: ["Autodesk Fusion 360", "Design constraints", "Build planning", "Structural thinking", "Documentation"]
    },
    
    {
      id: "standalone-lego-drift-chassis",
      category: "standalone",
      type: "single",
      title: "Lego Technic Drift Chassis",
      hero: "/assets/images/drift%20chassis.png",
      alt: "Lego Technic drift chassis",
      problem: "High-RPM drift use exposed weaknesses in stock hub durability and overall suspension tuning.",
      solution: "I iterated drivetrain, suspension geometry, and custom hub components, building a platform that taught core vehicle dynamics concepts.",
      tags: ["Lego Technic", "Drivetrain", "Suspension geometry", "Vehicle dynamics", "Iteration"],
      skills: ["Mechanical engineering", "Automotive packaging", "3D printing", "Test-driven iteration", "Design refinement"]
    },
    {
      id: "standalone-lego-rock-crawler",
      category: "standalone",
      type: "single",
      title: "Rock Crawler Model",
      hero: "/assets/images/earlyTechnic.JPG",
      alt: "Lego rock crawler competition build",
      problem: "Competition crawling required extreme articulation, steep-angle performance, and precise control under high load.",
      solution: "I engineered a high-flex crawler with portal reduction, individual wheel control, and validated performance metrics across slope and obstacle tests.",
      tags: ["Competition build", "Crawling", "Articulation", "Portal axles", "Performance testing"],
      skills: ["Mechanical design", "Vehicle setup", "Testing protocols", "Control strategy", "Iteration"]
    },
    {
      id: "standalone-lego-defender-90",
      category: "standalone",
      type: "single",
      title: "Lego Technic Land Rover Defender 90 Model",
      hero: "/assets/images/Defender%2090/defender90.PNG",
      alt: "Lego Technic Defender 90 model",
      problem: "The model goal was realistic suspension and drivetrain behavior within Lego Technic constraints.",
      solution: "I built and tuned a full drivetrain and suspension implementation that balanced realism, reliability, and clean packaging.",
      tags: ["Lego Technic", "Vehicle model", "Suspension", "Drivetrain", "Mechanical systems"],
      skills: ["Mechanical engineering", "Packaging", "Iterative design", "Modeling", "System integration"]
    },
    {
      id: "construction-timberline-trail-system",
      category: "construction",
      type: "single",
      title: "Timberline Trail System",
      hero: "/assets/images/testing.jpg",
      alt: "Timberline trail system field work",
      problem: "Local trail usage needed ongoing routing, upkeep, and build decisions that respected terrain and long-term sustainability.",
      solution: "I contribute to planning and building a local mountain bike trail system with sustainable design choices and maintenance-focused execution.",
      tags: ["Trail building", "Sustainability", "Mountain biking", "Land stewardship", "Operations"],
      skills: ["Project management", "Path finding", "Skilled labor", "Team leadership", "Environmental awareness"]
    },
    {
      id: "construction-litholamps-pg",
      category: "construction",
      type: "single",
      title: "Litholamps",
      hero: "/assets/images/lithodemo.png",
      alt: "Litholamps project concept",
      problem: "Turning custom lit prints into a consistent, scalable product required stronger process standardization across design and deployment.",
      solution: "I continue refining CAD, electronics, and web tooling workflows to make Litholamps more repeatable for production and customer delivery.",
      tags: ["Lighting product", "Productization", "E-commerce", "3D printing", "Automation"],
      skills: ["Fusion 360", "JavaScript", "Python", "Process design", "Project leadership"]
    },
    {
      id: "construction-modulus-drawer-system",
      category: "construction",
      type: "detail",
      detailUrl: "/construction/modulus-drawer-system/",
      title: "Modulus Drawers",
      hero: "/assets/images/modulus%20drawers/modulus_drawer_logo-removebg.png",
      alt: "Modulus drawer system concept branding",
      problem: "Storage modules were growing ad hoc, so dimensions, labeling, and attachment methods were inconsistent, which made scaling and maintenance harder over time.",
      solution: "I am formalizing a parameterized module standard with shared interfaces and naming rules so additions remain compatible and easier to fabricate.",
      tags: ["Modular system", "Workshop tooling", "Scalability", "Standardization", "In progress"],
      skills: ["Parametric design", "Configuration planning", "Process design", "Fabrication workflow", "Versioned iteration"]
    },
    {
      id: "standalone-minecraft-servers",
      category: "standalone",
      type: "single",
      title: "Minecraft Server Operations",
      hero: "/assets/images/underConstruction.jpg",
      alt: "Minecraft server operation and moderation",
      problem: "Running community servers required reliable hosting and clear moderation during complex player disputes.",
      solution: "I managed local and VPS deployments while handling moderation and conflict resolution to keep the community stable and active.",
      tags: ["Server management", "Community operations", "Moderation", "VPS", "Live service"],
      skills: ["Oracle Cloud", "Linux server ops", "Conflict resolution", "Team leadership", "Plugin development"]
    }
  ];

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderLinkedText = (value) => {
    const normalized = String(value || "")
      .replace(/<a\b[^>]*href=(["'])(https?:\/\/[^"'<>\s]+)\1[^>]*>[\s\S]*?<\/a>/gi, "$2")
      .replace(/<\/?a\b[^>]*>/gi, "")
      .replace(/&lt;a\b[^&]*href=&quot;(https?:\/\/[^&\s]+)&quot;[^&]*&gt;[\s\S]*?&lt;\/a&gt;/gi, "$1")
      .replace(/&lt;a\b[^&]*href=&#39;(https?:\/\/[^&\s]+)&#39;[^&]*&gt;[\s\S]*?&lt;\/a&gt;/gi, "$1")
      .replace(/&lt;\/?a\b[^&]*&gt;/gi, "");
    return escapeHtml(normalized)
      .replace(/(https?:\/\/[^\s<"']+)/g, (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      )
      .replace(/\n/g, "<br>");
  };

  const renderPills = (items) =>
    items.map((item) => `<span class="projectPill">${escapeHtml(item)}</span>`).join("");

  const indexedCatalog = projectCatalog.map((entry) => {
    const combined = [
      entry.title,
      entry.problem,
      entry.solution,
      entry.tags.join(" "),
      entry.skills.join(" "),
      sectionLabelByCategory[entry.category] || ""
    ].join(" ");
    return { ...entry, searchText: normalize(combined) };
  });

  const renderEntry = (entry) => {
    const badge = entry.type === "detail" ? "Detailed" : "Single entry";
    const typeLabel = entry.type === "detail" ? "Detailed project page" : "Single-entry snapshot";
    const previewTags = entry.tags.slice(0, 3);
    const previewSkills = entry.skills.slice(0, 3);
    const heroStyle = entry.heroAspect ? ` style="aspect-ratio: ${escapeHtml(entry.heroAspect)};"` : "";
    const heroMarkup = entry.heroVideo
      ? `<video
          src="${escapeHtml(entry.heroVideo)}"
          poster="${escapeHtml(entry.hero)}"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          aria-label="${escapeHtml(entry.alt)}"
          onerror="this.outerHTML='&lt;img src=&quot;${escapeHtml(entry.hero)}&quot; alt=&quot;${escapeHtml(entry.alt)}&quot;&gt;'"
        ></video>`
      : entry.heroIframe
      ? `<div class="projectEntryIframeViewport">
          <iframe
            src="${escapeHtml(entry.heroIframe)}"
            title="${escapeHtml(entry.alt)}"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>`
      : `<img src="${escapeHtml(entry.hero)}" alt="${escapeHtml(entry.alt)}">`;
    const detailLink = entry.type === "detail" && entry.detailUrl
      ? {
          href: entry.detailUrl,
          label: "Open full project page",
          newTab: false
        }
      : null;
    const actionLink = !detailLink && entry.actionUrl
      ? {
          href: entry.actionUrl,
          label: entry.actionLabel || "Open project page",
          newTab: Boolean(entry.actionNewTab)
        }
      : null;
    const ctaLink = detailLink || actionLink;
    const linkMarkup = ctaLink
      ? `<a class="projectEntryLink" href="${escapeHtml(ctaLink.href)}"${ctaLink.newTab ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(ctaLink.label)}</a>`
      : "";

    return `
      <article id="project-entry-${escapeHtml(entry.id)}" class="projectEntry${entry.type === "detail" ? " projectEntry--detail" : ""}" data-project-entry data-entry-id="${escapeHtml(entry.id)}">
        <div class="projectEntryHead">
          <div>
            <h2 class="projectEntryTitle">${escapeHtml(entry.title)}</h2>
            <p class="projectEntryType">${escapeHtml(typeLabel)}</p>
          </div>
          <span class="projectEntryBadge">${escapeHtml(badge)}</span>
        </div>
        <figure class="projectEntryHero"${heroStyle}>
          ${heroMarkup}
        </figure>
        <div class="projectEntryBody">
          <section class="projectEntryPanel">
            <h3>Problem Definition</h3>
            <p>${escapeHtml(entry.problem)}</p>
          </section>
          <section class="projectEntryPanel">
            <h3>Problem Solution</h3>
            <p>${renderLinkedText(entry.solution)}</p>
          </section>
        </div>
        <div class="projectEntryMeta">
          <details class="projectMetaDetails">
            <summary>
              <span>Tags</span>
              <span class="projectMetaPreview">${renderPills(previewTags)}</span>
            </summary>
            <div class="projectPills">${renderPills(entry.tags)}</div>
          </details>
          <details class="projectMetaDetails">
            <summary>
              <span>Skills</span>
              <span class="projectMetaPreview">${renderPills(previewSkills)}</span>
            </summary>
            <div class="projectPills">${renderPills(entry.skills)}</div>
          </details>
        </div>
        ${linkMarkup}
      </article>
    `;
  };

  const linkForEntry = (entry) => {
    if (entry.type === "detail" && entry.detailUrl) return entry.detailUrl;
    if (entry.actionUrl) return entry.actionUrl;
    const sectionUrl = sectionUrlByCategory[entry.category] || "/";
    return `${sectionUrl}#project-entry-${entry.id}`;
  };

  libraries.forEach((library) => {
    const category = library.dataset.projectCategory || "";
    const categoryEntries = indexedCatalog.filter((entry) => entry.category === category);
    if (!categoryEntries.length) return;

    const list = library.querySelector("[data-project-entry-list]");
    const input = library.querySelector("[data-project-search]");
    const clearButton = library.querySelector("[data-project-search-clear]");
    const meta = library.querySelector("[data-project-search-meta]");
    const emptyState = library.querySelector("[data-project-search-empty]");
    const crossWrap = library.querySelector("[data-project-cross-wrap]");
    const crossList = library.querySelector("[data-project-cross-results]");
    if (!list || !input) return;

    list.innerHTML = categoryEntries.map((entry) => renderEntry(entry)).join("");
    const entryById = new Map(categoryEntries.map((entry) => [entry.id, entry]));
    const cardById = new Map(
      [...list.querySelectorAll("[data-project-entry]")].map((el) => [el.dataset.entryId || "", el])
    );

    const applyFilter = () => {
      const queryRaw = input.value.trim();
      const query = normalize(queryRaw);
      let visibleCount = 0;

      cardById.forEach((card, id) => {
        const entry = entryById.get(id);
        if (!entry) return;
        const matches = !query || entry.searchText.includes(query);
        card.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      const globalMatches = query
        ? indexedCatalog.filter((entry) => entry.searchText.includes(query))
        : [];
      const crossMatches = globalMatches.filter((entry) => entry.category !== category).slice(0, 6);

      if (meta) {
        if (!query) {
          const sectionLabel = sectionLabelByCategory[category] || "this section";
          meta.textContent = `Showing ${visibleCount} of ${categoryEntries.length} entries in ${sectionLabel}.`;
        } else {
          meta.textContent = `${visibleCount} in this section, ${globalMatches.length} across all projects.`;
        }
      }

      if (emptyState) {
        emptyState.hidden = !(query && visibleCount === 0);
      }

      if (crossWrap && crossList) {
        if (query && crossMatches.length) {
          crossList.innerHTML = crossMatches
            .map((entry) => {
              const href = linkForEntry(entry);
              const sectionLabel = sectionLabelByCategory[entry.category] || "Other";
              return `
                <li>
                  <a href="${escapeHtml(href)}">
                    <span>${escapeHtml(entry.title)}</span>
                    <span class="projectCrossSection">(${escapeHtml(sectionLabel)})</span>
                  </a>
                </li>
              `;
            })
            .join("");
          crossWrap.hidden = false;
        } else {
          crossWrap.hidden = true;
          crossList.innerHTML = "";
        }
      }
    };

    input.addEventListener("input", applyFilter);
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        input.value = "";
        input.focus();
        applyFilter();
      });
    }

    applyFilter();
  });

  // Keep project meta sections visible when summaries are hidden by CSS.
  document.querySelectorAll(".projectMetaDetails").forEach((detailsEl) => {
    detailsEl.open = true;
  });
})();

(() => {
  const root = document.querySelector("[data-resume-library]");
  if (!root) return;

  // Add new resume variants here as they become publication-ready.
  const resumeCatalog = [
    {
      id: "coop-1page",
      label: "Co-op Resume (1 Page)",
      audience: "Primary public version",
      file: "/assets/resumes/coop resume 1page.pdf"
    }
  ];

  const list = root.querySelector("[data-resume-list]");
  const title = root.querySelector("[data-resume-title]");
  const meta = root.querySelector("[data-resume-meta]");
  const preview = root.querySelector("[data-resume-preview]");
  const openLink = root.querySelector("[data-resume-open]");
  const downloadLink = root.querySelector("[data-resume-download]");
  if (!list || !title || !meta || !preview || !openLink || !downloadLink || !resumeCatalog.length) return;

  const encodePath = (path) => encodeURI(path);

  list.innerHTML = resumeCatalog
    .map((entry, index) => `
      <li>
        <button type="button" class="resumeListButton${index === 0 ? " isActive" : ""}" data-resume-id="${entry.id}">
          <span class="resumeListLabel">${entry.label}</span>
          <span class="resumeListSub">${entry.audience}</span>
        </button>
      </li>
    `)
    .join("");

  const buttons = [...list.querySelectorAll(".resumeListButton")];

  const applyResume = (id) => {
    const entry = resumeCatalog.find((item) => item.id === id) || resumeCatalog[0];
    const fileUrl = encodePath(entry.file);
    title.textContent = entry.label;
    meta.textContent = entry.audience;
    preview.src = `${fileUrl}#view=FitH`;
    openLink.href = fileUrl;
    downloadLink.href = fileUrl;
    downloadLink.setAttribute("download", entry.file.split("/").pop() || "resume.pdf");

    buttons.forEach((button) => {
      button.classList.toggle("isActive", button.dataset.resumeId === entry.id);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      applyResume(button.dataset.resumeId || "");
    });
  });

  applyResume(resumeCatalog[0].id);
})();

(() => {
  // Show tag/skill sections on standalone detail pages even when no project library exists.
  document.querySelectorAll(".projectMetaDetails").forEach((detailsEl) => {
    detailsEl.open = true;
  });
})();

(() => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-contact-status]");
  const submitButton = form.querySelector("[data-contact-submit]");
  const startedAtInput = form.querySelector("[data-contact-started-at]");
  const replyToInput = form.querySelector("[data-contact-replyto]");
  const honeypot = form.querySelector('input[name="website"]');
  if (!status || !submitButton || !startedAtInput) return;

  const submitUrl = "https://formsubmit.co/ajax/aidenkuemmerle@gmail.com";
  const cooldownMs = 90000;
  const minFillMs = 3500;
  const cooldownKey = "contact_form_last_submit_at";
  startedAtInput.value = String(Date.now());

  const setStatus = (message, mode = "") => {
    status.textContent = message;
    status.classList.remove("isError", "isSuccess");
    if (mode) status.classList.add(mode);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const now = Date.now();
    const lastSubmit = Number(localStorage.getItem(cooldownKey) || "0");
    if (lastSubmit && now - lastSubmit < cooldownMs) {
      const seconds = Math.ceil((cooldownMs - (now - lastSubmit)) / 1000);
      setStatus(`Please wait ${seconds}s before sending another message.`, "isError");
      return;
    }

    const startedAt = Number(startedAtInput.value || now);
    if (now - startedAt < minFillMs) {
      setStatus("Please take a moment to fill the form, then try again.", "isError");
      return;
    }

    if (honeypot && honeypot.value.trim()) {
      // Silently accept bot submissions to avoid revealing the trap.
      setStatus("Message sent. Thanks, I will get back to you soon.", "isSuccess");
      form.reset();
      startedAtInput.value = String(Date.now());
      return;
    }

    const emailField = form.querySelector('input[name="email"]');
    if (replyToInput && emailField instanceof HTMLInputElement) {
      replyToInput.value = emailField.value.trim();
    }

    const data = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    setStatus("Sending message...");

    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      localStorage.setItem(cooldownKey, String(Date.now()));
      form.reset();
      startedAtInput.value = String(Date.now());
      setStatus("Message sent. Check your inbox for FormSubmit verification if this is your first submission.", "isSuccess");
    } catch (error) {
      setStatus("Message failed to send. Please try again or email me directly at aidenkuemmerle@gmail.com.", "isError");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send message";
    }
  });
})();
