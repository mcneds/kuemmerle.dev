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
    { id: "ski-mount", label: "Insta360/GoPro mount", detail: "Zip + seal design challenge.", theme: "ski", x: 10, y: 74 },

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

