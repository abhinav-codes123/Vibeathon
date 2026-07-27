import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/mac/Desktop/Codex_Projects/Vibeathon";
const OUT = path.join(ROOT, "presentation");
const ASSETS = path.join(OUT, "assets");
const RENDERED = path.join(OUT, "build", "rendered");
const FINAL = path.join(OUT, "FlowDine_AI_Pitch_Deck.pptx");

const W = 1280;
const H = 720;

const C = {
  ivory: "#F6F0E4",
  paper: "#FFFDF8",
  charcoal: "#20241F",
  charcoal2: "#30342E",
  emerald: "#18372D",
  emerald2: "#2E6B50",
  emeraldSoft: "#DCE8DF",
  saffron: "#D1832E",
  saffron2: "#E6A34E",
  saffronSoft: "#F4E2C7",
  muted: "#6E7068",
  line: "#D8D0C2",
  red: "#A44E43",
  redSoft: "#F2DDD8",
  white: "#FFFFFF",
};

const FONT_DISPLAY = "Georgia";
const FONT_BODY = "Aptos";
const LIVE_URL = "https://flowdine-ai.abhinavchaudhary484.chatgpt.site";

async function bytes(file) {
  const data = await fs.readFile(file);
  return new Uint8Array(data);
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? "none",
    line: opts.line ?? { style: "solid", fill: "none", width: 0 },
    borderRadius: opts.borderRadius,
  });
  shape.text = text;
  shape.text.style = {
    typeface: opts.typeface ?? FONT_BODY,
    fontSize: opts.fontSize ?? 18,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    color: opts.color ?? C.charcoal,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
    wrap: "square",
    lineSpacing: opts.lineSpacing,
    insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return shape;
}

function addRect(slide, x, y, w, h, opts = {}) {
  const geometry = opts.geometry ?? "roundRect";
  return slide.shapes.add({
    geometry,
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? C.paper,
    line: opts.line ?? { style: "solid", fill: C.line, width: 1 },
    ...(geometry === "rect" || geometry === "textbox" || geometry === "roundRect"
      ? { borderRadius: opts.radius ?? 18 }
      : {}),
    shadow: opts.shadow,
  });
}

function addLine(slide, x, y, w, h, color = C.line, width = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function addEyebrow(slide, text, x = 70, y = 42, color = C.saffron) {
  return addText(slide, text.toUpperCase(), x, y, 560, 24, {
    fontSize: 13,
    bold: true,
    color,
    name: `eyebrow-${text}`,
  });
}

function addTitle(slide, text, opts = {}) {
  return addText(slide, text, opts.x ?? 70, opts.y ?? 74, opts.w ?? 1140, opts.h ?? 62, {
    fontSize: opts.fontSize ?? 40,
    bold: opts.bold ?? false,
    typeface: opts.typeface ?? FONT_DISPLAY,
    color: opts.color ?? C.charcoal,
    name: opts.name ?? "slide-title",
    autoFit: "shrinkText",
  });
}

function addFooter(slide, number, dark = false) {
  const color = dark ? "#B8C1BA" : "#8C8B82";
  addLine(slide, 70, 682, 1140, 0, dark ? "#365448" : C.line, 1);
  addText(slide, "FLOWDINE AI  /  VIBEATHON 6.0", 70, 690, 360, 16, {
    fontSize: 10,
    bold: true,
    color,
  });
  addText(slide, String(number).padStart(2, "0"), 1160, 690, 50, 16, {
    fontSize: 10,
    bold: true,
    color,
    align: "right",
  });
}

async function addImage(slide, file, x, y, w, h, opts = {}) {
  if (opts.frame !== false) {
    addRect(slide, x - 4, y - 4, w + 8, h + 8, {
      fill: opts.frameFill ?? C.paper,
      line: { style: "solid", fill: opts.frameLine ?? C.line, width: 1 },
      radius: opts.radius ?? 18,
      shadow: opts.shadow ?? "shadow-md",
    });
  }
  return slide.images.add({
    blob: await bytes(file),
    contentType: "image/png",
    alt: opts.alt ?? "FlowDine product screenshot",
    fit: opts.fit ?? "cover",
    crop: opts.crop,
    geometry: opts.geometry ?? "roundRect",
    borderRadius: opts.radius ?? 16,
    position: { left: x, top: y, width: w, height: h },
  });
}

function addNotes(slide, text, sources) {
  const sourceBlock = sources.map((source) => `- ${source}`).join("\n");
  slide.speakerNotes.textFrame.setText(`${text}\n\n[Sources]\n${sourceBlock}`);
  slide.speakerNotes.setVisible(true);
}

function addMetric(slide, label, value, x, y, w, accent = C.emerald) {
  addText(slide, value, x, y, w, 42, {
    fontSize: 30,
    typeface: FONT_DISPLAY,
    color: accent,
  });
  addText(slide, label.toUpperCase(), x, y + 44, w, 20, {
    fontSize: 11,
    bold: true,
    color: C.muted,
  });
}

function addStatusRow(slide, y, level, promise, status, statusColor, detail) {
  addLine(slide, 76, y + 70, 1128, 0, C.line, 1);
  addText(slide, level, 78, y, 145, 34, {
    fontSize: 25,
    typeface: FONT_DISPLAY,
    color: C.charcoal,
  });
  addText(slide, promise, 250, y + 2, 610, 30, {
    fontSize: 19,
    bold: true,
    color: C.charcoal,
  });
  addText(slide, detail, 250, y + 34, 700, 28, {
    fontSize: 14,
    color: C.muted,
  });
  addRect(slide, 1000, y + 4, 174, 38, {
    fill: statusColor,
    line: { style: "solid", fill: statusColor, width: 0 },
    radius: 19,
  });
  addText(slide, status, 1000, y + 12, 174, 18, {
    fontSize: 12,
    bold: true,
    color: C.white,
    align: "center",
  });
}

async function main() {
  await fs.mkdir(RENDERED, { recursive: true });

  const deck = Presentation.create({
    slideSize: { width: W, height: H },
  });

  // Slide 1 - Title
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    slide.images.add({
      blob: await bytes(path.join(ROOT, "public", "og.png")),
      contentType: "image/png",
      alt: "FlowDine AI live restaurant digital twin illustration",
      fit: "cover",
      position: { left: 0, top: 0, width: W, height: H },
    });
    addRect(slide, 24, 528, 552, 112, {
      fill: C.ivory,
      line: { style: "solid", fill: C.saffron, width: 1 },
      radius: 14,
    });
    addText(slide, "Live Restaurant Digital Twin", 88, 566, 460, 28, {
      fontSize: 24,
      bold: true,
      color: C.emerald,
    });
    addText(slide, "for faster, smarter dining", 88, 600, 460, 24, {
      fontSize: 18,
      color: C.charcoal2,
    });
    addText(slide, "VIBEATHON 6.0  /  SMART RESTAURANT MANAGEMENT", 68, 670, 535, 18, {
      fontSize: 11,
      bold: true,
      color: C.emerald,
    });
    addText(slide, "TEAM NAME: ____________________", 930, 670, 280, 18, {
      fontSize: 11,
      bold: true,
      color: C.ivory,
      align: "right",
    });
    addNotes(
      slide,
      "FlowDine AI is not another food delivery app. It is a live operating layer for the restaurant itself. Our core idea is simple: every table, ticket, ingredient, and staff action should run from the same shared truth. In the next few minutes, we will show how that digital twin removes unavailable-order frustration, helps teams act sooner, and gives managers a real-time view of the dining room.",
      [
        "FlowDine AI live project and generated social card: public/og.png",
        "VibeAthon 6.0 problem statement: Vibeathon_6.0_PS.pdf, pages 1-4",
      ],
    );
  }

  // Slide 2 - Problem
  {
    const slide = deck.slides.add();
    slide.background.fill = C.emerald;
    addEyebrow(slide, "The operating problem", 70, 44, C.saffron2);
    addTitle(slide, "Restaurants are serving guests with fragmented truth.", {
      x: 70,
      y: 82,
      w: 660,
      h: 110,
      fontSize: 44,
      color: C.ivory,
    });
    addText(slide, "One service. Five blind spots.", 70, 222, 520, 38, {
      fontSize: 25,
      bold: true,
      color: C.saffron2,
    });
    const problems = [
      ["01", "Dish availability", "Guests discover stockouts after choosing."],
      ["02", "Waiting time", "Tables and orders move without a shared promise."],
      ["03", "Communication", "Kitchen, floor, and guest updates arrive late."],
      ["04", "Manual operations", "Orders, billing, and stock are reconciled by hand."],
      ["05", "Manager visibility", "Bottlenecks appear only after service suffers."],
    ];
    problems.forEach((item, i) => {
      const y = 112 + i * 104;
      addText(slide, item[0], 760, y, 58, 32, {
        fontSize: 20,
        bold: true,
        color: C.saffron2,
      });
      addText(slide, item[1], 840, y, 360, 30, {
        fontSize: 23,
        typeface: FONT_DISPLAY,
        color: C.ivory,
      });
      addText(slide, item[2], 840, y + 38, 360, 42, {
        fontSize: 16,
        color: "#C9D2CB",
      });
      if (i < problems.length - 1) addLine(slide, 760, y + 88, 440, 0, "#355347", 1);
    });
    addText(slide, "The cost is not only time. It is broken trust at the table.", 70, 560, 560, 72, {
      fontSize: 28,
      typeface: FONT_DISPLAY,
      italic: true,
      color: C.ivory,
    });
    addFooter(slide, 2, true);
    addNotes(
      slide,
      "The brief identifies the same pattern restaurants face every day: guests do not know what is available, queues and orders feel unpredictable, staff communication is delayed, and managers cannot see the operation as it changes. These are not separate inconveniences. They all come from fragmented systems and manual handoffs. When the menu, kitchen, floor, and inventory disagree, the guest experiences the failure first.",
      ["VibeAthon 6.0 problem statement: Vibeathon_6.0_PS.pdf, page 1"],
    );
  }

  // Slide 3 - Insight
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "The product insight");
    addTitle(slide, "The missing product is not another ordering app.", {
      x: 70,
      y: 78,
      w: 530,
      h: 98,
      fontSize: 42,
    });
    addText(slide, "It is one live operating layer that makes every role act from the same restaurant state.", 70, 196, 500, 96, {
      fontSize: 23,
      color: C.charcoal2,
      lineSpacing: 1.12,
    });
    addText(slide, "MENU  ≠  STOCK", 72, 338, 260, 28, {
      fontSize: 16,
      bold: true,
      color: C.red,
    });
    addText(slide, "KITCHEN  ≠  FLOOR", 72, 390, 300, 28, {
      fontSize: 16,
      bold: true,
      color: C.red,
    });
    addText(slide, "MANAGER  ≠  LIVE STATE", 72, 442, 330, 28, {
      fontSize: 16,
      bold: true,
      color: C.red,
    });
    addLine(slide, 72, 496, 420, 0, C.saffron, 3);
    addText(slide, "FlowDine replaces those gaps with one continuously synchronized truth.", 72, 518, 450, 72, {
      fontSize: 24,
      typeface: FONT_DISPLAY,
      color: C.emerald,
    });
    await addImage(slide, path.join(ASSETS, "flowdine-home.png"), 615, 188, 585, 329, {
      alt: "FlowDine live service home screen",
      shadow: "shadow-lg",
    });
    addText(slide, "REAL PRODUCT  /  LIVE DEPLOYMENT", 784, 540, 416, 20, {
      fontSize: 11,
      bold: true,
      color: C.emerald,
      align: "right",
    });
    addFooter(slide, 3);
    addNotes(
      slide,
      "Most restaurant products optimize one isolated touchpoint: ordering, billing, or inventory. Our insight was that local optimization still leaves the dining room disconnected. FlowDine models the restaurant as one living system. The guest sees availability from stock, the kitchen sees the accepted ticket, the waiter sees service priorities, and the manager sees the resulting risk and revenue signals. The value comes from the connection, not from any single screen.",
      [
        `FlowDine AI live deployment: ${LIVE_URL}`,
        "Product positioning and architecture: README.md",
      ],
    );
  }

  // Slide 4 - Solution
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "The solution");
    addTitle(slide, "One digital twin. Four focused experiences. One inventory truth.");
    addText(slide, "Every action updates the shared operating state used by the next role.", 70, 132, 760, 30, {
      fontSize: 18,
      color: C.muted,
    });

    addRect(slide, 456, 238, 368, 184, {
      fill: C.emerald,
      line: { style: "solid", fill: C.emerald, width: 0 },
      radius: 30,
      shadow: "shadow-lg",
      name: "digital-twin-core",
    });
    addText(slide, "LIVE RESTAURANT", 498, 275, 284, 22, {
      fontSize: 13,
      bold: true,
      color: C.saffron2,
      align: "center",
    });
    addText(slide, "Digital Twin", 482, 307, 316, 54, {
      fontSize: 38,
      typeface: FONT_DISPLAY,
      color: C.ivory,
      align: "center",
    });
    addText(slide, "orders • tables • stock • demand", 490, 374, 300, 22, {
      fontSize: 14,
      color: "#C8D3CB",
      align: "center",
    });

    const nodes = [
      { x: 86, y: 218, title: "Customer", sub: "Discover • order • track", fill: C.paper },
      { x: 86, y: 440, title: "Kitchen", sub: "Prioritize • prepare • pass", fill: C.paper },
      { x: 936, y: 218, title: "Waiter", sub: "Serve • resolve • turn tables", fill: C.paper },
      { x: 936, y: 440, title: "Manager", sub: "Monitor • decide • improve", fill: C.paper },
      { x: 488, y: 500, title: "Inventory", sub: "Recipe-linked availability", fill: C.saffronSoft },
    ];
    const nodeShapes = nodes.map((node) => {
      const shape = addRect(slide, node.x, node.y, 258, 104, {
        fill: node.fill,
        line: { style: "solid", fill: C.line, width: 1 },
        radius: 18,
        shadow: "shadow-sm",
      });
      addText(slide, node.title, node.x + 22, node.y + 22, 214, 30, {
        fontSize: 24,
        typeface: FONT_DISPLAY,
        color: C.emerald,
        align: "center",
      });
      addText(slide, node.sub, node.x + 14, node.y + 60, 230, 20, {
        fontSize: 13,
        color: C.muted,
        align: "center",
      });
      return shape;
    });
    const core = slide.shapes.items.find((shape) => shape.name === "digital-twin-core");
    nodeShapes.slice(0, 4).forEach((node) => {
      const onLeft = node.position.left < 400;
      slide.shapes.connect(node, core, {
        kind: "elbow",
        fromSide: onLeft ? "right" : "left",
        toSide: onLeft ? "left" : "right",
        line: { style: "solid", fill: C.saffron, width: 2 },
        tail: { type: "arrow", width: "sm", length: "sm" },
      });
    });
    slide.shapes.connect(core, nodeShapes[4], {
      kind: "straight",
      fromSide: "bottom",
      toSide: "top",
      line: { style: "solid", fill: C.saffron, width: 2 },
      tail: { type: "arrow", width: "sm", length: "sm" },
    });
    addFooter(slide, 4);
    addNotes(
      slide,
      "FlowDine gives each role a focused workspace while keeping the underlying truth shared. Customers get confidence before ordering. Kitchen staff get prioritized tickets with notes and allergens. Waiters get the next service action and a live table map. Managers get revenue, demand, stock, and bottleneck signals. Inventory is not a separate afterthought; it participates in every accepted order and continuously reshapes what the menu can promise.",
      ["FlowDine AI product surfaces and shared-state architecture: README.md and docs/ARCHITECTURE.md"],
    );
  }

  // Slide 5 - Core Workflow
  {
    const slide = deck.slides.add();
    slide.background.fill = C.emerald;
    addEyebrow(slide, "The end-to-end proof", 70, 42, C.saffron2);
    addTitle(slide, "One order moves the entire restaurant forward.", {
      x: 70,
      y: 78,
      w: 1000,
      h: 58,
      color: C.ivory,
    });
    addText(slide, "No re-entry. No manual stock toggle. No invisible handoff.", 70, 142, 760, 28, {
      fontSize: 18,
      color: "#C9D3CC",
    });

    const steps = [
      ["01", "Scan / browse", "Live menu"],
      ["02", "Place order", "Notes + table"],
      ["03", "Kitchen accepts", "Ticket created"],
      ["04", "Stock reserved", "Portions recalc"],
      ["05", "Waiter serves", "Table advances"],
      ["06", "Bill closes", "Totals verified"],
      ["07", "Manager sees", "Metrics update"],
    ];
    const circles = [];
    steps.forEach((step, i) => {
      const x = 68 + i * 171;
      const circle = addRect(slide, x + 42, 256, 72, 72, {
        geometry: "ellipse",
        fill: i === 3 ? C.saffron : C.ivory,
        line: { style: "solid", fill: i === 3 ? C.saffron : "#B8C7BE", width: 2 },
        radius: 36,
      });
      circles.push(circle);
      addText(slide, step[0], x + 42, 278, 72, 24, {
        fontSize: 16,
        bold: true,
        color: i === 3 ? C.white : C.emerald,
        align: "center",
      });
      addText(slide, step[1], x, 358, 156, 32, {
        fontSize: 19,
        typeface: FONT_DISPLAY,
        color: C.ivory,
        align: "center",
      });
      addText(slide, step[2], x, 402, 156, 26, {
        fontSize: 13,
        color: "#B9C5BD",
        align: "center",
      });
    });
    for (let i = 0; i < circles.length - 1; i += 1) {
      slide.shapes.connect(circles[i], circles[i + 1], {
        kind: "straight",
        fromSide: "right",
        toSide: "left",
        line: { style: "solid", fill: C.saffron2, width: 2 },
        tail: { type: "arrow", width: "sm", length: "sm" },
      });
    }
    addRect(slide, 132, 508, 1016, 96, {
      fill: "#21463A",
      line: { style: "solid", fill: "#3C5B50", width: 1 },
      radius: 18,
    });
    addText(slide, "1 accepted order", 168, 535, 220, 36, {
      fontSize: 27,
      typeface: FONT_DISPLAY,
      color: C.saffron2,
    });
    addText(slide, "updates 4 role views + the inventory ledger + the audit trail", 412, 538, 690, 34, {
      fontSize: 20,
      color: C.ivory,
    });
    addFooter(slide, 5, true);
    addNotes(
      slide,
      "This is the workflow judges can experience in the live product. A guest places a table order with notes. The server checks permissions and inventory, reserves the recipe ingredients, and creates the kitchen ticket. Kitchen and waiter roles advance the same order state. Billing uses paise-safe totals, and the manager view reacts to the same event. The important proof is that each step changes what the next role sees.",
      [
        "FlowDine AI order lifecycle: README.md",
        "Server-authoritative domain transitions: lib/domain.ts",
      ],
    );
  }

  // Slide 6 - Availability Engine
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "Signature innovation");
    addTitle(slide, "Availability is calculated - never manually guessed.");
    addText(slide, "The limiting recipe ingredient becomes the truthful menu promise.", 70, 132, 780, 28, {
      fontSize: 18,
      color: C.muted,
    });
    await addImage(slide, path.join(ASSETS, "flowdine-menu.png"), 70, 192, 620, 398, {
      alt: "Inventory-aware FlowDine guest menu",
      crop: { left: 0.18, top: 0.06, right: 0.01, bottom: 0.12 },
      shadow: "shadow-lg",
    });
    addText(slide, "LIVE MENU", 92, 208, 140, 30, {
      fontSize: 11,
      bold: true,
      color: C.emerald,
      fill: C.ivory,
      borderRadius: 12,
      align: "center",
      valign: "middle",
      insets: { top: 0, right: 8, bottom: 0, left: 8 },
    });

    addText(slide, "Illustrative low-stock case", 752, 202, 410, 26, {
      fontSize: 14,
      bold: true,
      color: C.saffron,
    });
    addText(slide, "Ember Paneer Tikka", 752, 240, 410, 42, {
      fontSize: 31,
      typeface: FONT_DISPLAY,
      color: C.charcoal,
    });
    const ingredients = [
      ["Paneer", "720g ÷ 180g", "4 portions", 0.38, C.red],
      ["Greek yogurt", "245ml ÷ 35ml", "7 portions", 0.62, C.saffron],
    ];
    ingredients.forEach((item, i) => {
      const y = 308 + i * 92;
      addText(slide, item[0], 752, y, 170, 24, {
        fontSize: 17,
        bold: true,
        color: C.charcoal,
      });
      addText(slide, item[1], 932, y + 2, 150, 20, {
        fontSize: 14,
        color: C.muted,
      });
      addText(slide, item[2], 1080, y + 2, 110, 20, {
        fontSize: 14,
        bold: true,
        color: item[4],
        align: "right",
      });
      addRect(slide, 752, y + 38, 438, 10, {
        geometry: "rect",
        fill: C.line,
        line: { style: "solid", fill: C.line, width: 0 },
        radius: 5,
      });
      addRect(slide, 752, y + 38, 438 * item[3], 10, {
        geometry: "rect",
        fill: item[4],
        line: { style: "solid", fill: item[4], width: 0 },
        radius: 5,
      });
    });
    addLine(slide, 752, 498, 438, 0, C.line, 1);
    addText(slide, "MIN(4, 7)", 752, 522, 170, 34, {
      fontSize: 23,
      bold: true,
      color: C.emerald,
    });
    addRect(slide, 932, 510, 258, 58, {
      fill: C.saffronSoft,
      line: { style: "solid", fill: C.saffron, width: 1 },
      radius: 14,
    });
    addText(slide, "ONLY 4 LEFT", 932, 528, 258, 22, {
      fontSize: 18,
      bold: true,
      color: C.red,
      align: "center",
    });
    addText(slide, "At zero, ordering is blocked automatically.", 752, 592, 438, 26, {
      fontSize: 17,
      bold: true,
      color: C.charcoal2,
    });
    addFooter(slide, 6);
    addNotes(
      slide,
      "This is our signature innovation. A dish is not marked available because someone remembered to toggle it. FlowDine divides usable ingredient stock by each recipe requirement and takes the minimum. In this low-stock example, paneer supports four portions while yogurt supports seven, so the menu can truthfully promise only four. When an order is accepted, inventory is reserved immediately. When the limiting ingredient reaches zero, the dish becomes unavailable automatically.",
      [
        "Recipe-linked availability implementation: lib/domain.ts and lib/seed.ts",
        `Real guest-menu screenshot captured from ${LIVE_URL}/menu`,
      ],
    );
  }

  // Slide 7 - Role Experiences
  {
    const slide = deck.slides.add();
    slide.background.fill = C.charcoal;
    addEyebrow(slide, "Role-based experience", 70, 34, C.saffron2);
    addTitle(slide, "The same truth, designed for the next decision.", {
      x: 70,
      y: 66,
      w: 1020,
      h: 56,
      color: C.ivory,
      fontSize: 38,
    });

    const frames = [
      { file: "flowdine-menu.png", x: 70, y: 146, label: "CUSTOMER", sub: "Live menu + ordering" },
      { file: "flowdine-kitchen.png", x: 654, y: 146, label: "KITCHEN", sub: "Prioritized ticket flow" },
      { file: "flowdine-waiter.png", x: 70, y: 414, label: "WAITER", sub: "Tasks + table service" },
      { file: "flowdine-manager.png", x: 654, y: 414, label: "MANAGER", sub: "Command center" },
    ];
    for (const frame of frames) {
      await addImage(slide, path.join(ASSETS, frame.file), frame.x, frame.y, 556, 224, {
        alt: `${frame.label} FlowDine interface`,
        crop: { left: 0.03, top: 0.05, right: 0.02, bottom: 0.16 },
        frameFill: "#26302A",
        frameLine: "#445148",
        shadow: "shadow-lg",
      });
      addRect(slide, frame.x + 16, frame.y + 16, 184, 52, {
        fill: C.emerald,
        line: { style: "solid", fill: C.saffron, width: 1 },
        radius: 12,
      });
      addText(slide, frame.label, frame.x + 30, frame.y + 25, 154, 18, {
        fontSize: 12,
        bold: true,
        color: C.saffron2,
      });
      addText(slide, frame.sub, frame.x + 30, frame.y + 44, 154, 15, {
        fontSize: 11,
        color: C.ivory,
      });
    }
    addFooter(slide, 7, true);
    addNotes(
      slide,
      "The interface changes with the role, but the operating state does not. Guests browse live availability and order with confidence. Kitchen staff see ticket age, promise risk, notes, and allergens. Waiters see ready dishes, guest requests, and table turns. Managers see revenue, demand, inventory, and bottlenecks. This focus keeps each screen calm and actionable while preserving one end-to-end workflow behind the scenes.",
      [
        `Real role screenshots captured from ${LIVE_URL}/menu, /kitchen, /staff, and /dashboard`,
        "FlowDine role permission matrix: lib/domain.ts and docs/ARCHITECTURE.md",
      ],
    );
  }

  // Slide 8 - Intelligent Operations
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "Intelligent operations");
    addTitle(slide, "AI advises. Deterministic signals stay in control.");
    addText(slide, "The manager gets prioritized action, not another dashboard to interpret.", 70, 132, 790, 28, {
      fontSize: 18,
      color: C.muted,
    });

    const intelligence = [
      ["PREDICT", "Demand forecast", "Weighted recent service history"],
      ["PROTECT", "Stockout watch", "Recipe-aware inventory risk"],
      ["PRIORITIZE", "Bottleneck detection", "Late tickets and service pressure"],
      ["RECOMMEND", "Smart suggestions", "Available, popular, load-safe dishes"],
    ];
    intelligence.forEach((item, i) => {
      const y = 202 + i * 96;
      addText(slide, item[0], 70, y, 125, 22, {
        fontSize: 12,
        bold: true,
        color: i === 2 ? C.red : C.saffron,
      });
      addText(slide, item[1], 70, y + 28, 328, 27, {
        fontSize: 22,
        typeface: FONT_DISPLAY,
        color: C.charcoal,
      });
      addText(slide, item[2], 70, y + 61, 340, 22, {
        fontSize: 14,
        color: C.muted,
      });
      if (i < intelligence.length - 1) addLine(slide, 70, y + 88, 340, 0, C.line, 1);
    });
    await addImage(slide, path.join(ASSETS, "flowdine-manager-intelligence.png"), 450, 186, 760, 422, {
      alt: "FlowDine operations copilot, stock risks, and demand forecast",
      crop: { left: 0.17, top: 0.08, right: 0.01, bottom: 0.08 },
      shadow: "shadow-lg",
    });
    addRect(slide, 710, 582, 476, 58, {
      fill: C.emerald,
      line: { style: "solid", fill: C.emerald, width: 0 },
      radius: 14,
    });
    addText(slide, "Gemini when configured • evidence-based fallback without a key", 732, 599, 432, 24, {
      fontSize: 14,
      bold: true,
      color: C.ivory,
      align: "center",
    });
    addFooter(slide, 8);
    addNotes(
      slide,
      "FlowDine turns operational data into the next best action. It forecasts demand, surfaces stock risks, detects late tickets, and recommends dishes that are actually available and manageable for the kitchen. The AI copilot can use Gemini when configured, but it is deliberately advisory. Inventory, billing, permissions, and forecast calculations remain deterministic. If the AI key is missing or the call fails, managers still receive evidence-based local guidance.",
      [
        "Intelligence and safety design: README.md, docs/ARCHITECTURE.md, and app/api/copilot/route.ts",
        `Real manager intelligence screenshot captured from ${LIVE_URL}/dashboard`,
      ],
    );
  }

  // Slide 9 - Management Analytics
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "Management command center");
    addTitle(slide, "A manager can read the whole service in seconds.");
    await addImage(slide, path.join(ASSETS, "flowdine-manager.png"), 70, 152, 750, 440, {
      alt: "FlowDine manager dashboard with revenue and digital twin metrics",
      crop: { left: 0.14, top: 0.06, right: 0.01, bottom: 0.04 },
      shadow: "shadow-lg",
    });

    addMetric(slide, "Revenue today", "₹35,680", 865, 160, 155, C.emerald);
    addMetric(slide, "Active orders", "5", 1040, 160, 140, C.saffron);
    addMetric(slide, "Table occupancy", "50%", 865, 242, 155, C.emerald);
    addMetric(slide, "Delayed tickets", "5", 1040, 242, 140, C.red);
    addMetric(slide, "Low-stock ingredients", "9", 865, 324, 155, C.red);
    addMetric(slide, "Average order", "₹469", 1040, 324, 140, C.saffron);

    addText(slide, "LIVE SERVICE MIX", 864, 417, 320, 20, {
      fontSize: 12,
      bold: true,
      color: C.saffron,
    });
    slide.charts.add("bar", {
      position: { left: 856, top: 446, width: 350, height: 158 },
      categories: ["Garlic Naan", "Prawn Moilee", "Butter chkn."],
      series: [{ name: "Items", values: [2, 2, 1], fill: C.emerald2 }],
      hasLegend: false,
      barOptions: { direction: "bar", grouping: "clustered", gapWidth: 55 },
      chartFill: C.ivory,
      chartLine: { style: "solid", fill: C.ivory, width: 0 },
      plotAreaFill: C.ivory,
      plotAreaLine: { style: "solid", fill: C.ivory, width: 0 },
      xAxis: { visible: false },
      yAxis: {
        visible: true,
        textStyle: { fontSize: 12, fill: C.charcoal },
        majorGridlines: { style: "solid", fill: C.line, width: 1 },
      },
      dataLabels: {
        showValue: true,
        position: "outEnd",
        textStyle: { fontSize: 12, fill: C.charcoal, bold: true },
      },
    });
    addText(slide, "Current seeded tickets • item quantities", 864, 610, 340, 18, {
      fontSize: 11,
      color: C.muted,
    });
    addFooter(slide, 9);
    addNotes(
      slide,
      "The command center is designed for a five-second scan. Revenue, active orders, occupancy, average order value, delayed tickets, and stock risk appear together because they influence one another. The revenue rhythm shows the service pattern, while the digital twin shows table, ticket, and inventory pressure. The service-mix chart uses quantities in the seeded live tickets, so the demo remains explainable rather than presenting invented historical sales.",
      [
        `Real manager dashboard captured from ${LIVE_URL}/dashboard`,
        "Seeded service metrics and ticket items: lib/seed.ts",
      ],
    );
  }

  // Slide 10 - Architecture
  {
    const slide = deck.slides.add();
    slide.background.fill = C.emerald;
    addEyebrow(slide, "Technology architecture", 70, 40, C.saffron2);
    addTitle(slide, "Production-shaped today. Production-hardened by design.", {
      x: 70,
      y: 74,
      w: 1060,
      h: 58,
      color: C.ivory,
    });
    addText(slide, "LIVE JUDGE DEPLOYMENT", 70, 158, 270, 20, {
      fontSize: 12,
      bold: true,
      color: C.saffron2,
    });
    const liveNodes = [
      ["Next.js 16 + React 19", "Guest and staff surfaces"],
      ["Route handlers", "Validated API actions"],
      ["TypeScript domain engine", "Inventory, billing, permissions"],
      ["Cloudflare D1", "Shared state + audit log"],
    ];
    const liveShapes = [];
    liveNodes.forEach((node, i) => {
      const x = 70 + i * 296;
      const shape = addRect(slide, x, 198, 256, 116, {
        fill: "#21463A",
        line: { style: "solid", fill: "#48685B", width: 1 },
        radius: 16,
      });
      liveShapes.push(shape);
      addText(slide, node[0], x + 18, 222, 220, 34, {
        fontSize: 19,
        bold: true,
        color: C.ivory,
        align: "center",
      });
      addText(slide, node[1], x + 18, 270, 220, 24, {
        fontSize: 13,
        color: "#C2CEC6",
        align: "center",
      });
    });
    for (let i = 0; i < liveShapes.length - 1; i += 1) {
      slide.shapes.connect(liveShapes[i], liveShapes[i + 1], {
        kind: "straight",
        fromSide: "right",
        toSide: "left",
        line: { style: "solid", fill: C.saffron2, width: 2 },
        tail: { type: "arrow", width: "sm", length: "sm" },
      });
    }
    addRect(slide, 400, 340, 480, 56, {
      fill: C.saffron,
      line: { style: "solid", fill: C.saffron, width: 0 },
      radius: 14,
    });
    addText(slide, "Optional Gemini REST • deterministic fallback", 420, 356, 440, 24, {
      fontSize: 16,
      bold: true,
      color: C.white,
      align: "center",
    });
    addText(slide, "PRODUCTION SAAS HARDENING PATH", 70, 444, 360, 20, {
      fontSize: 12,
      bold: true,
      color: C.saffron2,
    });
    addRect(slide, 70, 480, 1140, 118, {
      fill: C.ivory,
      line: { style: "solid", fill: C.saffron2, width: 1 },
      radius: 20,
    });
    const hardening = [
      ["Supabase Auth", "Email verification + Google OAuth"],
      ["PostgreSQL + RLS", "Tenant-isolated restaurant data"],
      ["Realtime events", "Push updates instead of polling"],
      ["Provider integrations", "Payments + notifications"],
    ];
    hardening.forEach((node, i) => {
      const x = 100 + i * 278;
      addText(slide, node[0], x, 505, 236, 28, {
        fontSize: 21,
        typeface: FONT_DISPLAY,
        color: C.emerald,
        align: "center",
      });
      addText(slide, node[1], x, 545, 236, 34, {
        fontSize: 13,
        color: C.muted,
        align: "center",
      });
      if (i < hardening.length - 1) addLine(slide, x + 252, 504, 0, 70, C.line, 1);
    });
    addText(slide, "LIVE: ChatGPT Sites / Cloudflare • 4-second shared-state sync • strict TypeScript • tested domain logic", 70, 626, 1140, 24, {
      fontSize: 14,
      bold: true,
      color: "#C9D3CC",
      align: "center",
    });
    addFooter(slide, 10, true);
    addNotes(
      slide,
      "The live judge build uses Next.js and React, server route handlers, a pure TypeScript domain engine, and Cloudflare D1 with optimistic versioned writes and an audit log. Gemini is optional and safely falls back to local evidence-based guidance. For production SaaS, the repository includes a normalized Supabase and PostgreSQL migration path. Real identity, membership-backed row security, realtime events, and provider integrations are the next hardening layer, not features we falsely claim as live.",
      [
        "Current architecture and deployment: README.md and docs/ARCHITECTURE.md",
        "Supabase production reference migration: supabase/migrations/202607260001_flowdine.sql",
      ],
    );
  }

  // Slide 11 - User Stories
  {
    const slide = deck.slides.add();
    slide.background.fill = C.ivory;
    addEyebrow(slide, "Hackathon level map");
    addTitle(slide, "The full operating vision is live - with one honest identity gap.", {
      w: 1120,
      fontSize: 38,
    });
    addStatusRow(slide, 158, "Bronze", "Modern role-based product experience", "COMPLETE", C.emerald2, "Responsive guest, kitchen, waiter, and manager interfaces");
    addStatusRow(slide, 242, "Silver", "Digital restaurant workflows + authentication", "PARTIAL", C.saffron, "Workflows complete; email/Google authentication is not runtime-connected");
    addStatusRow(slide, 326, "Gold", "Management dashboard and daily operations", "COMPLETE", C.emerald2, "Orders, tables, inventory, revenue, service flow, and analytics");
    addStatusRow(slide, 410, "Platinum", "Intelligent operational decision support", "COMPLETE", C.emerald2, "Forecasting, recommendations, stock risk, insights, and copilot");
    addStatusRow(slide, 494, "Bonus", "Live restaurant digital twin", "COMPLETE", C.emerald2, "Recipe-linked availability, shared state, audit trail, and bill splitting");
    addRect(slide, 76, 602, 1128, 52, {
      fill: C.redSoft,
      line: { style: "solid", fill: "#D9AAA1", width: 1 },
      radius: 12,
    });
    addText(slide, "Submission truth: demo role switching proves workflows; Supabase Auth is the remaining Silver requirement.", 98, 618, 1084, 22, {
      fontSize: 16,
      bold: true,
      color: C.red,
      align: "center",
    });
    addFooter(slide, 11);
    addNotes(
      slide,
      "Against the official levels, FlowDine completes the modern UX, digital workflows, management dashboard, intelligent operations, and bonus innovation. The only requirement we should not overstate is identity authentication. The public demo has a visible role switcher and the API applies a permission matrix, but email verification and Google OAuth are not connected to runtime identities. We present that gap honestly while demonstrating that the broader operating system is already functional and deployed.",
      [
        "VibeAthon 6.0 ranking and user stories: Vibeathon_6.0_PS.pdf, pages 2-4",
        "Current authentication boundary and feature checklist: README.md and docs/FEATURE_CHECKLIST.md",
      ],
    );
  }

  // Slide 12 - Closing
  {
    const slide = deck.slides.add();
    slide.background.fill = C.charcoal;
    addText(slide, "FLOWDINE AI", 70, 48, 260, 24, {
      fontSize: 14,
      bold: true,
      color: C.saffron2,
    });
    addText(slide, "Let the restaurant\nthink as one.", 70, 120, 700, 170, {
      fontSize: 62,
      typeface: FONT_DISPLAY,
      color: C.ivory,
      lineSpacing: 0.96,
    });
    addText(slide, "FlowDine AI reduces waiting, prevents unavailable-order frustration, improves staff coordination, and gives managers real-time control.", 74, 324, 790, 84, {
      fontSize: 24,
      color: "#CFD6D1",
      lineSpacing: 1.14,
    });
    const outcomes = [
      ["PROMISE", "Only what stock can fulfill"],
      ["COORDINATE", "One state across every role"],
      ["PREDICT", "Demand and stock risk sooner"],
      ["CONTROL", "Act before service breaks"],
    ];
    outcomes.forEach((item, i) => {
      const x = 72 + i * 288;
      addText(slide, item[0], x, 470, 240, 24, {
        fontSize: 13,
        bold: true,
        color: C.saffron2,
      });
      addText(slide, item[1], x, 506, 246, 54, {
        fontSize: 19,
        typeface: FONT_DISPLAY,
        color: C.ivory,
      });
    });
    addRect(slide, 72, 594, 1136, 58, {
      fill: C.saffron,
      line: { style: "solid", fill: C.saffron, width: 0 },
      radius: 14,
    });
    addText(slide, "OPEN THE LIVE RESTAURANT  →", 96, 611, 350, 24, {
      fontSize: 15,
      bold: true,
      color: C.white,
    });
    addText(slide, LIVE_URL.replace("https://", ""), 470, 611, 714, 24, {
      fontSize: 15,
      bold: true,
      color: C.white,
      align: "right",
    });
    addFooter(slide, 12, true);
    addNotes(
      slide,
      "FlowDine AI turns the restaurant from a collection of disconnected tools into one coordinated operating system. Guests receive promises the kitchen and inventory can actually keep. Staff see the next right action. Managers see risk early enough to change the outcome. Our invitation is simple: open the live demo, place an order, and watch that single event move through inventory, kitchen, service, and management. That connected proof is the product.",
      [
        `Live public demo: ${LIVE_URL}`,
        "FlowDine AI end-to-end product summary: README.md",
      ],
    );
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(RENDERED, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(RENDERED, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(RENDERED, "deck-montage.webp"), await deck.export({ format: "webp", montage: true, scale: 1 }));

  const pptx = await PresentationFile.exportPptx(deck);
  const tempPptx = path.join(OUT, "build", "FlowDine_AI_Pitch_Deck.next.pptx");
  await pptx.save(tempPptx);
  await fs.rename(tempPptx, FINAL);
  console.log(`Created ${FINAL}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
