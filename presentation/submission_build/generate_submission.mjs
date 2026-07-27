import { readFile } from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/mac/Desktop/Codex_Projects/Vibeathon";
const TEMPLATE =
  "/Users/mac/Downloads/Vibeathon_6.0_Vibecoding_Hackathon_July_2026_Idea_Submission_Template.pptx";
const STARTER = path.join(
  ROOT,
  "presentation/submission_build/template-starter.pptx",
);
const OUTPUT = path.join(
  ROOT,
  "presentation/FlowDine_AI_Vibeathon_Official_Submission.pptx",
);

const C = {
  black: "#000000",
  white: "#FFFFFF",
  ivory: "#F7F2E8",
  charcoal: "#203329",
  saffron: "#E8A248",
  emerald: "#2E7D5B",
  muted: "#D9D2C5",
  critical: "#B24A45",
};

const notes = [
  `FlowDine AI is a Live Restaurant Digital Twin. It is not another food-delivery clone; it is the operating layer inside the restaurant. It connects the guest, kitchen, waiter, manager, tables, orders, recipes, and ingredients so every role acts from one current restaurant state.

[Sources]
- Product scope: local FlowDine AI repository and Vibeathon 6.0 problem statement
- Visual: fresh local browser capture, presentation/assets/screenshots/home-1440x900.png`,
  `The root problem is not a lack of software. It is that restaurant information arrives late and lives in separate places. A guest can choose a dish after its key ingredient is already low. The kitchen may know a ticket is delayed while the waiter and customer do not. Tables, queues, bills, and stock are updated through separate tools or verbal communication. The result is modified orders, waiting, staff confusion, and managers reacting after the bottleneck has already affected service.

[Sources]
- Problem framing: Vibeathon 6.0 Smart Restaurant Management System brief
- Visual: verified local KDS capture, presentation/assets/flowdine-kitchen.png`,
  `FlowDine AI creates one shared operating state for the entire restaurant. A guest sees live dish availability, places an order, and tracks progress. The kitchen receives a ticket with notes and allergens. When the order is accepted, the recipe engine reduces ingredient stock and recalculates available portions. The waiter receives the next service action, billing is generated, and the manager sees the same event in the command center. That is our differentiator: the menu is not manually toggled. If stock supports four servings, guests see “Only 4 left,” and every accepted order updates that number automatically.

[Sources]
- Feature behavior: local domain engine, routes, and FEATURE_CHECKLIST.md
- Visual: fresh 1440 by 900 menu capture showing limited-stock messaging`,
  `The interface and API layer use Next.js 16, React 19, and TypeScript. Staff access is protected through Supabase authentication code and membership-based role checks. The deterministic domain engine owns ordering, recipe consumption, queues, reservations, billing, and availability. Shared operational state is stored in Cloudflare D1 with optimistic version checks and an audit trail. Gemini can enrich management insights, but a local fallback keeps the demo functional and keeps deterministic operational signals authoritative.

[Sources]
- package.json, db/schema.ts, lib/auth.ts, lib/authz.ts
- docs/ARCHITECTURE.md and deployment configuration`,
  `Each role gets one useful next action. Guests know what can actually be ordered. Kitchen teams see ticket age, special instructions, and allergens. Waiters see ready dishes and prioritized service requests. Managers see orders, tables, inventory risk, forecasts, and operational attention points together. We are not claiming invented percentage improvements. The system is designed to reduce unavailable-item surprises and coordination delay, and it can measure preparation time, delayed orders, table turnover, stockouts, order value, and queue waiting time.

[Sources]
- Role workflows: local application routes and FEATURE_CHECKLIST.md
- Visuals: verified customer, kitchen, waiter, and manager captures`,
  `The current live demo proves the connected single-restaurant workflow. The next production steps are verifying external authentication providers, isolating operational data per restaurant, and adding payments, supplier workflows, and notifications. From there, the same model can support multiple branches and predictive operations. FlowDine AI gives customers certainty, staff coordination, and managers real-time control through one intelligent restaurant operating system. Thank you — we are ready to show the live demo.

[Sources]
- Current-versus-future boundary: AUTHENTICATION.md and RELEASE_READINESS.md
- Live demo: https://flowdine-ai.abhinavchaudhary484.chatgpt.site`,
];

const slideData = [
  {
    oldBody:
      "TITLE PAGE\n\nTeam Name: [Enter Team Name]\nTeam Leader Name: [Enter Team Leader Full Name] College Name: [Enter College Name]\nYear & Department: [Example: 2nd Year – CSE]\nProblem Statement / Project Title: [Enter Your Problem Statement or Project Title]",
    body:
      "FLOWDINE AI\n\nTeam: [TEAM NAME]\nLeader: [TEAM LEADER]\nCollege: [COLLEGE]\nYear & Department: [YEAR — DEPARTMENT]\nProject: Smart Restaurant Management System",
  },
  {
    oldBody:
      "Problem Overview Who Is Affected Current Challenges\nLimitations of Existing Solutions Real-World Impact",
    body:
      "Dishes change after guests choose\nKitchen updates reach staff late\nTables, queues & bills are fragmented\nStock and menu availability drift\nManagers spot bottlenecks too late",
  },
  {
    oldBody:
      "Solution Overview How It Works\nKey Features Innovative Solution Unique Value / Benefits",
    body:
      "One shared restaurant state\nRecipe-aware live availability\nGuest → kitchen → waiter flow\nTables, queue, billing & inventory\nForecasts + operations copilot",
  },
  {
    oldBody:
      "Technologies Used Tools & Frameworks System Architecture Methodology / Workflow How the Idea Works",
    body:
      "Next.js 16 + React 19 + TypeScript\nSupabase Auth + membership roles\nD1 versioned state + audit trail\nRecipe, order, queue & billing engine\nGemini adapter + local fallback",
  },
  {
    oldBody:
      "Key Use Cases\nTarget Users / Beneficiaries Real-World Applications Expected Impact Measurable Outcomes",
    body:
      "Guest: know what is available\nKitchen: safer, timed tickets\nWaiter: prioritized service\nManager: live control\nMeasures waits, delays & stockouts",
  },
  {
    oldBody:
      "Future Enhancements Integration Opportunities Scalability & Expansion Future Impact Conclusion",
    body:
      "Verify production auth\nTenant-isolated onboarding\nPayments, suppliers, notifications\nPredictive multi-location operations\nOne intelligent restaurant OS",
  },
];

async function fileBytes(relativePath) {
  return new Uint8Array(await readFile(path.join(ROOT, relativePath)));
}

function findTextShape(slide, exactText) {
  const shape = slide.shapes.items.find(
    (item) => item.text?.toString() === exactText,
  );
  if (!shape?.text) {
    throw new Error(`Text shape not found on slide ${slide.index + 1}: ${exactText}`);
  }
  return shape;
}

function hideInheritedHero(slide) {
  const hero = [...slide.images.items].sort(
    (a, b) =>
      b.frame.width * b.frame.height - a.frame.width * a.frame.height,
  )[0];
  if (!hero) throw new Error(`No inherited hero image on slide ${slide.index + 1}`);
  hero.frame = { left: 1278, top: 718, width: 1, height: 1 };
}

function alignInheritedBulletMarkers(slide, bodyTop, markerOffset, lineGap) {
  const markers = slide.images.items
    .filter(
      (image) =>
        image.frame.width >= 8 &&
        image.frame.width <= 15 &&
        image.frame.height >= 8 &&
        image.frame.height <= 15,
    )
    .sort((a, b) => a.frame.top - b.frame.top);
  if (markers.length !== 5) {
    throw new Error(
      `Expected five inherited bullet markers on slide ${slide.index + 1}; found ${markers.length}`,
    );
  }
  markers.forEach((marker, markerIndex) => {
    marker.frame = {
      left: marker.frame.left,
      top: bodyTop + markerOffset + markerIndex * lineGap,
      width: marker.frame.width,
      height: marker.frame.height,
    };
  });
}

async function addScreenshot(slide, relativePath, alt, position, fit = "cover") {
  return slide.images.add({
    blob: await fileBytes(relativePath),
    contentType: "image/jpeg",
    alt,
    fit,
    geometry: "roundRect",
    borderRadius: 12,
    position,
  });
}

function addText(slide, text, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: options.fill ?? "none",
    line: options.line ?? { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.fontSize = options.fontSize ?? 18;
  shape.text.typeface = options.typeface ?? "Trebuchet MS";
  shape.text.bold = options.bold ?? false;
  shape.text.color = options.color ?? C.white;
  shape.text.alignment = options.alignment ?? "left";
  shape.text.verticalAlignment = options.verticalAlignment ?? "middle";
  shape.text.autoFit = "shrinkText";
  shape.text.insets = options.insets ?? { top: 6, right: 8, bottom: 6, left: 8 };
  return shape;
}

function addArchitecture(slide) {
  const x = 730;
  const w = 490;
  const cards = [
    {
      y: 205,
      fill: C.ivory,
      title: "ROLE INTERFACES",
      detail: "Guest  •  Kitchen  •  Waiter  •  Manager",
      titleColor: C.charcoal,
      detailColor: C.charcoal,
    },
    {
      y: 310,
      fill: C.saffron,
      title: "NEXT.JS APPLICATION + DOMAIN ENGINE",
      detail: "AuthZ  •  Orders  •  Recipes  •  Queue  •  Billing",
      titleColor: C.charcoal,
      detailColor: C.charcoal,
    },
    {
      y: 415,
      fill: C.emerald,
      title: "D1 STATE + SUPABASE AUTH",
      detail: "Version checks  •  Audit trail  •  Membership roles",
      titleColor: C.white,
      detailColor: C.white,
    },
  ];
  for (const card of cards) {
    addText(
      slide,
      `${card.title}\n${card.detail}`,
      { left: x, top: card.y, width: w, height: 78 },
      {
        fill: card.fill,
        line: { style: "solid", fill: C.muted, width: 1 },
        fontSize: 19,
        bold: true,
        color: card.titleColor,
        insets: { top: 11, right: 14, bottom: 8, left: 14 },
      },
    );
  }
  addText(
    slide,
    "↓",
    { left: 945, top: 278, width: 54, height: 32 },
    { fontSize: 24, bold: true, color: C.white, alignment: "center" },
  );
  addText(
    slide,
    "↓",
    { left: 945, top: 383, width: 54, height: 32 },
    { fontSize: 24, bold: true, color: C.white, alignment: "center" },
  );
  addText(
    slide,
    "Deterministic operations remain authoritative",
    { left: x, top: 505, width: w, height: 30 },
    { fontSize: 16, bold: true, color: C.saffron, alignment: "center" },
  );
}

async function addRoleGrid(slide) {
  const frames = [
    {
      label: "CUSTOMER",
      file: "presentation/assets/screenshots/customer-menu-1440x900.png",
      left: 720,
      top: 190,
    },
    {
      label: "KITCHEN",
      file: "presentation/assets/flowdine-kitchen.png",
      left: 975,
      top: 190,
    },
    {
      label: "WAITER",
      file: "presentation/assets/flowdine-waiter.png",
      left: 720,
      top: 365,
    },
    {
      label: "MANAGER",
      file: "presentation/assets/flowdine-manager.png",
      left: 975,
      top: 365,
    },
  ];
  for (const frame of frames) {
    await addScreenshot(
      slide,
      frame.file,
      `${frame.label.toLowerCase()} FlowDine interface`,
      { left: frame.left, top: frame.top, width: 240, height: 150 },
      "cover",
    );
    addText(
      slide,
      frame.label,
      { left: frame.left + 8, top: frame.top + 8, width: 92, height: 26 },
      {
        fill: C.black,
        line: { style: "solid", fill: C.saffron, width: 1 },
        fontSize: 13,
        bold: true,
        color: C.white,
        alignment: "center",
        insets: { top: 3, right: 5, bottom: 3, left: 5 },
      },
    );
  }
}

const sourcePresentation = await PresentationFile.importPptx(
  await FileBlob.load(TEMPLATE),
);
const starterBlob = await PresentationFile.exportPptx(sourcePresentation);
await starterBlob.save(STARTER);

const presentation = await PresentationFile.importPptx(
  await FileBlob.load(STARTER),
);

for (let index = 0; index < slideData.length; index += 1) {
  const slide = presentation.slides.items[index];
  const data = slideData[index];
  const bodyShape = findTextShape(slide, data.oldBody);
  bodyShape.text = data.body;
  bodyShape.text.alignment = "left";
  bodyShape.text.typeface = "Trebuchet MS";

  if (index === 0) {
    bodyShape.text.fontSize = 25;
    bodyShape.position = { left: 34, top: 155, width: 680, height: 455 };
    addText(
      slide,
      "Live Restaurant Digital Twin\nfor Faster, Smarter Dining",
      { left: 410, top: 188, width: 300, height: 76 },
      {
        fontSize: 21,
        bold: true,
        color: C.saffron,
        alignment: "center",
        insets: { top: 3, right: 4, bottom: 3, left: 4 },
      },
    );
  } else {
    findTextShape(slide, "Team Name\n/ Logo").text = "FlowDine\nAI";
    bodyShape.text.fontSize = index === 3 ? 25 : 26;
    const positions = [
      null,
      { left: 150, top: 275, width: 530, height: 370 },
      { left: 150, top: 340, width: 530, height: 310 },
      { left: 195, top: 255, width: 500, height: 365 },
      { left: 225, top: 255, width: 470, height: 365 },
      { left: 220, top: 215, width: 480, height: 365 },
    ];
    bodyShape.position = positions[index];
    alignInheritedBulletMarkers(
      slide,
      positions[index].top,
      index === 1 ? 25 : 9,
      index === 1 ? 46 : index === 3 ? 31 : 32,
    );
  }

  hideInheritedHero(slide);

  if (index === 0) {
    await addScreenshot(
      slide,
      "presentation/assets/screenshots/home-1440x900.png",
      "FlowDine AI connected restaurant operating system home",
      { left: 735, top: 205, width: 490, height: 306 },
      "cover",
    );
  } else if (index === 1) {
    await addScreenshot(
      slide,
      "presentation/assets/flowdine-kitchen.png",
      "FlowDine kitchen display showing a delayed ticket and allergen context",
      { left: 720, top: 205, width: 500, height: 313 },
      "cover",
    );
  } else if (index === 2) {
    await addScreenshot(
      slide,
      "presentation/assets/screenshots/customer-menu-1440x900.png",
      "FlowDine menu showing inventory-derived limited portions",
      { left: 720, top: 205, width: 500, height: 313 },
      "cover",
    );
  } else if (index === 3) {
    addArchitecture(slide);
  } else if (index === 4) {
    await addRoleGrid(slide);
  } else if (index === 5) {
    await addScreenshot(
      slide,
      "presentation/assets/flowdine-manager-intelligence.png",
      "FlowDine manager intelligence with operations copilot and stockout watch",
      { left: 720, top: 188, width: 500, height: 313 },
      "cover",
    );
    addText(
      slide,
      "flowdine-ai.abhinavchaudhary484.chatgpt.site",
      { left: 720, top: 518, width: 500, height: 34 },
      { fontSize: 15, bold: true, color: C.saffron, alignment: "center" },
    );
    addText(
      slide,
      "THANK YOU",
      { left: 720, top: 555, width: 500, height: 34 },
      { fontSize: 20, bold: true, color: C.white, alignment: "center" },
    );
  }

  slide.speakerNotes.textFrame.setText(notes[index]);
  slide.speakerNotes.setVisible(true);
}

const exported = await PresentationFile.exportPptx(presentation);
await exported.save(OUTPUT);
console.log(OUTPUT);
