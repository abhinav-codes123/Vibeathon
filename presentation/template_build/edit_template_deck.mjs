import { readFile } from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspace = "/Users/mac/Desktop/Codex_Projects/Vibeathon";
const sourcePptx = path.join(
  workspace,
  "presentation/template_build/template-starter.pptx",
);
const outputPptx = path.join(
  workspace,
  "presentation/FlowDine_AI_Official_Template_Submission.pptx",
);

const presentation = await PresentationFile.importPptx(
  await FileBlob.load(sourcePptx),
);

const slideSpecs = [
  {
    slideIndex: 0,
    slideId: "sl/fou8ng",
    titleId: "sh/lsfe907q",
    bodyId: "sh/yp4vy5oz",
    imageId: "im/8jexkvi9",
    imagePath: "public/og.png",
    titleOld: "Vibeathon 6.0 (Vibecoding Hackathon) – July 2026",
    titleNew: "Vibeathon 6.0 (Vibecoding Hackathon) – July 2026",
    imageAlt: "FlowDine AI live restaurant digital twin interface",
    notes: `FlowDine AI is a live restaurant digital twin built for Vibeathon 6.0. Instead of creating another food delivery interface, we built an operating layer for the restaurant itself. It connects what guests see, what the kitchen accepts, what waiters must do next, and what managers need to know now. The core promise is simple: faster service, fewer broken promises, and one truthful operational view.

[Sources]
- Visual: FlowDine AI repository asset public/og.png
- Product scope: local FlowDine AI implementation and Vibeathon 6.0 problem statement`,
  },
  {
    slideIndex: 1,
    slideId: "sl/qsnzm0",
    titleId: "sh/s7610fa1",
    bodyId: "sh/hg3u9onq",
    badgeId: "sh/gfud0jm5",
    imageId: "im/vqh8r6t8",
    imagePath: "presentation/assets/flowdine-kitchen.png",
    titleOld: "CURRENT PROBLEM",
    titleNew: "CURRENT PROBLEM",
    bodyOld:
      "Problem Overview Who Is Affected Current Challenges\nLimitations of Existing Solutions Real-World Impact",
    bodyNew:
      "Stockouts after choice\nHidden table waits\nDelayed kitchen updates\nManual order & stock\nNo live manager view",
    imageAlt: "FlowDine AI kitchen display showing live order operations",
    notes: `Restaurants lose trust and time when operations are disconnected. Guests can select a dish that has already run out. Kitchen status reaches the floor late. Orders, tables, bills, and ingredients are tracked in separate places or manually. The manager sees reports after the shift instead of bottlenecks during it. These are not delivery problems; they are live coordination problems inside the restaurant.

[Sources]
- Visual: local FlowDine AI product hero screenshot
- Problem framing: Vibeathon 6.0 Smart Restaurant Management System brief`,
  },
  {
    slideIndex: 2,
    slideId: "sl/8776a6",
    titleId: "sh/0jilsvit",
    bodyId: "sh/x0vih07e",
    badgeId: "sh/fi9kzqh8",
    imageId: "im/gz21ozmx",
    imagePath: "presentation/assets/flowdine-menu.png",
    titleOld: "Proposed Solution",
    titleNew: "Proposed Solution",
    bodyOld:
      "Solution Overview How It Works\nKey Features Innovative Solution Unique Value / Benefits",
    bodyNew:
      "One live digital twin\nRecipe-aware availability\nConnected role workflows\nQueue, table & billing\nForecasts + AI copilot",
    imageAlt: "FlowDine AI customer menu with live availability",
    notes: `FlowDine AI makes the restaurant behave like one connected system. Customers get a truthful digital menu, reservations, queue visibility, ordering, tracking, and billing. Kitchen and waiters receive role-specific workflows. Managers get live tables, inventory, revenue, delays, forecasts, and an AI copilot. The signature feature is recipe-aware availability: the menu changes from real ingredient stock, not from a manual toggle.

[Sources]
- Visual: local FlowDine AI product hero screenshot
- Feature scope: local FlowDine AI implementation`,
  },
  {
    slideIndex: 3,
    slideId: "sl/baopge",
    titleId: "sh/25o3qdk7",
    bodyId: "sh/jqxw3yxw",
    badgeId: "sh/cvqlw729",
    imageId: "im/srelc3ax",
    imagePath: "presentation/assets/flowdine-manager-intelligence.png",
    titleOld: "TECHNICAL APPROACH",
    titleNew: "TECHNICAL APPROACH",
    bodyOld:
      "Technologies Used Tools & Frameworks System Architecture Methodology / Workflow How the Idea Works",
    bodyNew:
      "Next.js + React + TS\nServer role permissions\nRecipe-order engine\nD1 state + audit log\nGemini + local fallback",
    imageAlt: "FlowDine AI intelligence dashboard with forecast and copilot",
    notes: `The production-shaped build uses Next.js, React, and TypeScript. Server-side permission checks protect manager, kitchen, waiter, and customer actions. A deterministic recipe and order engine calculates portions and inventory changes. Shared D1 state uses optimistic concurrency and an audit log so simultaneous updates are safer and traceable. Gemini can enrich operational insights, while a deterministic local fallback keeps the demo working without an external model.

[Sources]
- Visual: local FlowDine AI product hero screenshot
- Architecture details: local FlowDine AI source code`,
  },
  {
    slideIndex: 4,
    slideId: "sl/ic9u3u",
    titleId: "sh/y9cfqlgv",
    bodyId: "sh/o3axkbyt",
    badgeId: "sh/rmhs7a1c",
    imageId: "im/c7qdc3ep",
    imagePath: "presentation/assets/flowdine-manager.png",
    titleOld: "Use Cases & Impact",
    titleNew: "Use Cases & Impact",
    bodyOld:
      "Key Use Cases\nTarget Users / Beneficiaries Real-World Applications Expected Impact Measurable Outcomes",
    bodyNew:
      "Guests: truthful menu\nKitchen: safer tickets\nWaiters: next action\nManagers: live control\nFewer broken promises",
    imageAlt: "FlowDine AI manager command center",
    notes: `Every role receives one clear next action. Guests avoid unavailable-order frustration and can split bills with paise-safe totals. Kitchen tickets retain item notes and allergen context. Waiters see service tasks and table state instead of chasing verbal updates. Managers see occupancy, kitchen load, delayed orders, low stock, and top dishes in one command center. The result is less waiting, better coordination, and fewer promises the restaurant cannot keep.

[Sources]
- Visual: local FlowDine AI product hero screenshot
- Role workflows and billing behavior: local FlowDine AI implementation`,
  },
  {
    slideIndex: 5,
    slideId: "sl/vuw5dz",
    titleId: "sh/jihonmhg",
    bodyId: "sh/e1wrml0r",
    badgeId: "sh/ih8nuh0v",
    imageId: "im/1oze9oj6",
    imagePath: "presentation/assets/flowdine-home.png",
    titleOld: "Future Scope & Conclusion",
    titleNew: "Future Scope & Conclusion",
    bodyOld:
      "Future Enhancements Integration Opportunities Scalability & Expansion Future Impact Conclusion",
    bodyNew:
      "Email / Google auth\nMulti-tenant onboarding\nRealtime + payments\nMulti-location analytics\nLive demo today",
    imageAlt: "FlowDine AI role-based restaurant operations home screen",
    notes: `The current demo proves the end-to-end restaurant workflow with a role switcher. The next production step is real email or Google authentication, restaurant onboarding, and tenant isolation. From there we can add push-based realtime updates, payment integrations, and multi-location benchmarking. Even today, FlowDine AI demonstrates the central innovation: one living operational model that keeps menu, kitchen, staff, inventory, tables, and management aligned.

[Sources]
- Visual: local FlowDine AI product hero screenshot
- Current-versus-future boundary: local FlowDine AI implementation review`,
  },
];

function findTextShape(slide, oldText) {
  const shape = slide.shapes.items.find((item) => item.text?.toString() === oldText);
  if (!shape?.text) throw new Error(`Text shape not found: ${oldText}`);
  return shape;
}

function replaceText(slide, oldText, newText) {
  const shape = findTextShape(slide, oldText);
  if (oldText !== newText) shape.text = newText;
}

async function replaceImage(slide, relativePath, alt) {
  const image = [...slide.images.items].sort(
    (a, b) =>
      b.frame.width * b.frame.height - a.frame.width * a.frame.height,
  )[0];
  if (!image?.replace) throw new Error(`Hero image not found on slide ${slide.index + 1}`);

  const oldGeometry = image.geometry;
  const oldBorderRadius = image.borderRadius;
  const oldRotation = image.rotation;
  const oldFlipHorizontal = image.flipHorizontal;
  const oldFlipVertical = image.flipVertical;
  const oldLockAspectRatio = image.lockAspectRatio;
  const replacementBytes = new Uint8Array(
    await readFile(path.join(workspace, relativePath)),
  );

  image.replace({
    blob: replacementBytes,
    contentType: "image/png",
    alt,
    fit: "contain",
  });
  image.frame = {
    left: 785,
    top: 190,
    width: 410,
    height: 430,
  };
  image.geometry = oldGeometry;
  image.borderRadius = oldBorderRadius;
  image.rotation = oldRotation;
  image.flipHorizontal = oldFlipHorizontal;
  image.flipVertical = oldFlipVertical;
  image.lockAspectRatio = oldLockAspectRatio;
}

function repositionHero(slide) {
  const image = [...slide.images.items].sort(
    (a, b) =>
      b.frame.width * b.frame.height - a.frame.width * a.frame.height,
  )[0];
  image.frame = {
    left: 785,
    top: 190,
    width: 410,
    height: 430,
  };
}

for (const spec of slideSpecs) {
  const slide = presentation.slides.items[spec.slideIndex];
  replaceText(slide, spec.titleOld, spec.titleNew);

  if (spec.bodyId === "sh/yp4vy5oz") {
    const titlePageBody = findTextShape(
      slide,
      "TITLE PAGE\n\nTeam Name: [Enter Team Name]\nTeam Leader Name: [Enter Team Leader Full Name] College Name: [Enter College Name]\nYear & Department: [Example: 2nd Year – CSE]\nProblem Statement / Project Title: [Enter Your Problem Statement or Project Title]",
    );
    titlePageBody.text =
      "FLOWDINE AI — LIVE RESTAURANT DIGITAL TWIN\n\nTeam: FlowDine AI\nLeader: [Add Your Name]\nCollege: [Add College Name]\nYear & Department: [Add Year & Department]\nProject: Smart Restaurant Management System";
    titlePageBody.text.fontSize = 29;
    titlePageBody.text.alignment = "left";
    titlePageBody.position = {
      left: 34,
      top: 170,
      width: 700,
      height: 430,
    };
  } else {
    replaceText(slide, spec.bodyOld, spec.bodyNew);
    replaceText(slide, "Team Name\n/ Logo", "FlowDine\nAI");
    const body = findTextShape(slide, spec.bodyNew);
    body.text.fontSize = 34;
    body.text.alignment = "left";
    const bodyPositions = [
      undefined,
      { left: 150, top: 300, width: 535, height: 340 },
      { left: 150, top: 368, width: 535, height: 262 },
      { left: 195, top: 280, width: 500, height: 300 },
      { left: 225, top: 280, width: 470, height: 300 },
      { left: 220, top: 240, width: 475, height: 300 },
    ];
    body.position = bodyPositions[spec.slideIndex];
  }

  if (spec.slideIndex === 0) {
    await replaceImage(slide, spec.imagePath, spec.imageAlt);
  } else {
    repositionHero(slide);
  }

  slide.speakerNotes.textFrame.setText(spec.notes);
  slide.speakerNotes.setVisible(true);
}

const exported = await PresentationFile.exportPptx(presentation);
await exported.save(outputPptx);

console.log(outputPptx);
