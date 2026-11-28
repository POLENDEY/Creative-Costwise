import pptxgen from "pptxgenjs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const shot = (name) => path.join(dir, "shots", `${name}.png`);

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pres.layout = "WIDE";
pres.title = "Creative Costwise — how the system works";
pres.subject = "Client walkthrough of the Admin workspace and the Crafter workspace";
pres.author = "Creative Costwise";

const rose = "B3185F";
const ink = "2C2430";
const muted = "6B5A64";
const cream = "F7F4F6";
const white = "FFFFFF";
const blush = "FDE8F0";
const line = "E7DCE3";
const soft = "FFF7FA";

const slides = [];

function footer(slide, section) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 7.22, w: 13.333, h: 0.28, fill: { color: cream },
  });
  slide.addText(section, {
    x: 0.42, y: 7.24, w: 8, h: 0.22,
    fontFace: "Calibri", fontSize: 11, color: muted, margin: 0,
  });
  slide.addText(String(slides.length), {
    x: 11.6, y: 7.24, w: 1.3, h: 0.22,
    fontFace: "Calibri", fontSize: 11, color: muted, align: "right", margin: 0,
  });
}

function newSlide(section) {
  const slide = pres.addSlide();
  slide.background = { color: cream };
  slides.push(slide);
  footer(slide, section);
  return slide;
}

function kicker(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0.42, y: 0.22, w: 10, h: 0.24,
    fontFace: "Calibri", fontSize: 11, color: rose, bold: true,
    margin: 0, charSpacing: 1.2,
  });
}

function title(slide, text, y = 0.44) {
  slide.addText(text, {
    x: 0.42, y, w: 12.4, h: 0.46,
    fontFace: "Georgia", fontSize: 26, color: ink, margin: 0,
  });
}

function body(slide, text, x, y, w, h, size = 15) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: "Calibri", fontSize: size, color: ink, margin: 0,
  });
}

function card(slide, x, y, w, h) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: white },
    line: { color: line },
    rectRadius: 0.08,
  });
}

function pin(slide, n, x, y) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: 0.32, h: 0.32,
    fill: { color: rose },
    line: { color: white, width: 1.25 },
  });
  slide.addText(String(n), {
    x, y, w: 0.32, h: 0.32,
    fontFace: "Calibri", fontSize: 12, bold: true, color: white,
    align: "center", valign: "middle", margin: 0,
  });
}

function shotSlide(section, kickerText, heading, image, notes, pins = []) {
  const slide = newSlide(section);
  kicker(slide, kickerText);
  title(slide, heading);
  card(slide, 0.38, 1.12, 8.28, 5.85);
  slide.addImage({
    path: shot(image),
    x: 0.5, y: 1.24, w: 8.04, h: 5.03,
  });
  pins.forEach(([n, x, y]) => pin(slide, n, x, y));
  card(slide, 8.82, 1.12, 4.1, 5.85);
  notes.forEach((note, index) => {
    const y = 1.28 + index * 1.12;
    pin(slide, index + 1, 8.98, y);
    slide.addText(note, {
      x: 9.38, y, w: 3.35, h: 1.02,
      fontFace: "Calibri", fontSize: 13, color: ink, margin: 0, valign: "top",
    });
  });
  return slide;
}

function proseSlide(section, kickerText, heading, paragraphs) {
  const slide = newSlide(section);
  kicker(slide, kickerText);
  title(slide, heading);
  paragraphs.forEach((text, index) => {
    const y = 1.15 + index * 1.35;
    card(slide, 0.42, y, 12.48, 1.22);
    slide.addText(text, {
      x: 0.64, y: y + 0.16, w: 12.05, h: 0.92,
      fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
    });
  });
  return slide;
}

// 1 Cover
{
  const slide = newSlide("Creative Costwise");
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: rose },
  });
  slide.addText("TEACHING GUIDE", {
    x: 0.7, y: 1.55, w: 10, h: 0.28,
    fontFace: "Calibri", fontSize: 14, color: rose, bold: true, margin: 0, charSpacing: 1.4,
  });
  slide.addText("Creative Costwise", {
    x: 0.7, y: 1.95, w: 11, h: 0.72,
    fontFace: "Georgia", fontSize: 46, color: ink, margin: 0,
  });
  slide.addText("Read this deck from start to finish.\nIt is the lesson for the Admin page and the Crafter page.", {
    x: 0.7, y: 2.85, w: 10, h: 0.85,
    fontFace: "Calibri", fontSize: 20, color: muted, margin: 0,
  });
  card(slide, 0.7, 4.0, 11.4, 1.7);
  slide.addText("How to use it", {
    x: 0.95, y: 4.15, w: 10, h: 0.32,
    fontFace: "Georgia", fontSize: 16, color: rose, margin: 0,
  });
  slide.addText("Each screenshot is the real screen. The numbered notes tell you what to click and what to type. Sample names and prices are only examples. Follow the same steps with your own words. You do not need a separate walkthrough.", {
    x: 0.95, y: 4.52, w: 10.8, h: 0.95,
    fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
}

{
  const slide = newSlide("How to read this");
  kicker(slide, "Contents");
  title(slide, "What you will be able to do");
  const lessons = [
    ["1", "Sign in", "Use the login the admin created"],
    ["2", "Stock the shelf", "Add a material and your own category"],
    ["3", "Set the printer", "Turn an ink bottle into a cost per sheet"],
    ["4", "Cost one piece", "Materials, print, loss, labor, packaging"],
    ["5", "Name the product group", "Type any product category, such as Notebooks"],
    ["6", "Sell it", "Bundles, discounts, customers, orders"],
    ["7", "Record the money", "Invoices, receipts, and finance"],
    ["8", "Run the plan", "Pay, upload proof, and let the admin approve"],
  ];
  lessons.forEach((item, index) => {
    const col = index < 4 ? 0 : 1;
    const row = index % 4;
    const x = 0.42 + col * 6.45;
    const y = 1.2 + row * 1.4;
    card(slide, x, y, 6.2, 1.25);
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.22, y: y + 0.36, w: 0.5, h: 0.5, fill: { color: rose },
    });
    slide.addText(item[0], {
      x: x + 0.22, y: y + 0.36, w: 0.5, h: 0.5,
      fontFace: "Calibri", fontSize: 16, bold: true, color: white, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(item[1], { x: x + 0.9, y: y + 0.22, w: 5, h: 0.38, fontFace: "Georgia", fontSize: 18, color: ink, margin: 0 });
    slide.addText(item[2], { x: x + 0.9, y: y + 0.64, w: 5, h: 0.38, fontFace: "Calibri", fontSize: 14, color: muted, margin: 0 });
  });
}

proseSlide("The idea", "Start here", "What this system is for", [
  "Creative Costwise is a private workspace for a small creative business. A crafter uses it to know what one finished piece costs, then choose a price they can explain.",
  "There is no public sign-up. The admin creates each crafter login after a plan is purchased. The crafter then keeps their own materials, prices, customers, orders, and money.",
  "Two people, two pages. The admin looks after accounts, payments, and shared resources. The crafter looks after one shop.",
]);

proseSlide("The idea", "Two doors", "Admin workspace and Crafter workspace", [
  "Admin signs in and lands on Crafter accounts. The top bar has five jobs: Crafter accounts, Renewal payments, Purchase requests, Inventory, and Resources.",
  "A crafter signs in and lands on Overview. The left menu is their shop: materials, printing, costing, prices, bundles, promotions, digital files, customers, orders, documents, finance, the guide, and plans.",
  "An admin who opens a shop page is sent back to Crafter accounts. A crafter who opens an admin page is sent back to Overview. Each person only sees their own tools.",
]);

{
  const slide = newSlide("The idea");
  kicker(slide, "The path");
  title(slide, "From the shelf to the sale");
  const steps = [
    ["1", "Materials", "What one sheet or piece costs"],
    ["2", "Print hub", "What one printed sheet costs"],
    ["3", "Costing", "Add labor, loss, and packaging"],
    ["4", "Price", "Retail, bulk, promo, loyal"],
    ["5", "Order", "A customer, a due date, a total"],
    ["6", "Finance", "Money in, once it is delivered"],
  ];
  steps.forEach((step, index) => {
    const x = 0.42 + index * 2.14;
    card(slide, x, 1.4, 2.0, 3.5);
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.72, y: 1.65, w: 0.52, h: 0.52, fill: { color: rose },
    });
    slide.addText(step[0], {
      x: x + 0.72, y: 1.65, w: 0.52, h: 0.52,
      fontFace: "Calibri", fontSize: 16, bold: true, color: white, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(step[1], {
      x: x + 0.12, y: 2.4, w: 1.76, h: 0.7,
      fontFace: "Georgia", fontSize: 16, color: ink, align: "center", margin: 0,
    });
    slide.addText(step[2], {
      x: x + 0.12, y: 3.15, w: 1.76, h: 1.2,
      fontFace: "Calibri", fontSize: 13, color: muted, align: "center", margin: 0,
    });
    if (index < steps.length - 1) {
      slide.addShape(pres.shapes.RIGHT_ARROW, {
        x: x + 1.9, y: 2.85, w: 0.28, h: 0.16, fill: { color: rose },
      });
    }
  });
  body(slide, "Each step uses the number from the step before it. Nothing is typed twice if it already lives on the shelf or in Print hub.", 0.5, 5.2, 12.3, 0.7, 16);
}

proseSlide("The idea", "Money", "How every peso is calculated", [
  "Amounts are kept in centavos. ₱1.00 is 100. That stops ₱10.10 plus ₱10.20 from turning into ₱20.299999.",
  "When a result has a fraction of a centavo, the system rounds half up. 0.5 of a centavo becomes the next centavo. Less than half stays down.",
  "The shop chooses Philippine peso or US dollar in Settings. The system does not convert one currency into the other. Every cost and price on that shop uses the chosen currency.",
]);

shotSlide(
  "Sign in",
  "The front door",
  "Sign in",
  "login",
  [
    "The left side is the promise: materials, printing, and labor stay together, so a price is a decision you can explain.",
    "The crafter types the email and password the admin gave them. There is no “create account” and no “forgot password” on this page.",
    "The eye beside the password shows or hides it. A new login must replace the temporary password before the shop opens.",
    "The line under the button says to ask the toolkit admin. There is no self-service reset on this page.",
  ],
  [[1, 1.35, 3.55], [2, 5.55, 3.45], [3, 6.55, 3.9], [4, 5.4, 5.0]],
);

{
  const slide = newSlide("Crafter workspace");
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 6.9, fill: { color: "2C2430" } });
  slide.addText("PART ONE", {
    x: 0.7, y: 2.3, w: 10, h: 0.3,
    fontFace: "Calibri", fontSize: 14, color: "F4A4C0", bold: true, margin: 0, charSpacing: 1.4,
  });
  slide.addText("The crafter’s shop", {
    x: 0.7, y: 2.7, w: 11, h: 0.7,
    fontFace: "Georgia", fontSize: 42, color: white, margin: 0,
  });
  slide.addText("One menu. Every module below is a page in that menu.", {
    x: 0.7, y: 3.55, w: 10, h: 0.4,
    fontFace: "Calibri", fontSize: 18, color: "F7D5E2", margin: 0,
  });
}

shotSlide(
  "Crafter · Overview",
  "Overview",
  "The shop at a glance",
  "dashboard",
  [
    "The left menu is the whole shop. The pink row is the page you are on.",
    "Four counts: materials on the shelf, printers ready, saved cost estimates, and saved prices.",
    "Money this month: revenue, expenses, and revenue minus expenses. Here the shop is short by ₱972.",
    "Recent cost estimates, plus a getting-started list. One of ten steps is done, so the bar says 10%.",
  ],
  [[1, 0.55, 3.2], [2, 2.7, 3.3], [3, 2.3, 4.35], [4, 6.7, 5.3]],
);

proseSlide("Crafter · Overview", "Getting started", "The ten-step checklist", [
  "The list is a guide, not a lock. The crafter can open any page even if a step is still open. Ticking a step only records that they have done it.",
  "The steps, in order: personalize the toolkit, read the guide, add materials, set up Print hub, cost a product, save a price, add a customer, create an order, make an invoice or receipt, review sales and finance.",
  "The moon and gear at the top right switch light or dark mode and open Shop settings. The bell holds notices. The green dot means the workspace loaded normally.",
]);

shotSlide(
  "Crafter · Materials",
  "Materials",
  "The supply shelf",
  "materials",
  [
    "Each supply is one row: name, how many pieces are in a pack, the pack price, how many are on the shelf, and an optional low-stock alert.",
    "The pie shows the value of stock by category. Paper is ₱1,020, which is 65% of the shelf.",
    "₱1,577 is the shelf value at pack cost. 10 materials are saved. 0 are at or under their low-stock alert.",
    "Starred categories are the ones the crafter wants in front. Up to five can be starred.",
  ],
  [[1, 3.2, 2.2], [2, 2.4, 3.5], [3, 6.9, 2.7], [4, 6.9, 5.2]],
);

{
  const slide = newSlide("Crafter · Materials");
  kicker(slide, "Materials formula");
  title(slide, "Cost of one piece");
  card(slide, 0.42, 1.15, 12.48, 1.35);
  slide.addText("Cost of one piece  =  price of the pack  ÷  pieces in the pack", {
    x: 0.7, y: 1.45, w: 12, h: 0.7,
    fontFace: "Georgia", fontSize: 24, color: rose, margin: 0,
  });
  const examples = [
    ["Sticker paper", "₱250 for a pack of 40 sheets", "₱6.25 per sheet"],
    ["Matte laminate", "₱18.00 for one sheet", "₱18.00 per sheet"],
    ["On the shelf", "Pack cost of what is still here", "₱1,577.00 in this shop"],
  ];
  examples.forEach((row, index) => {
    const y = 2.75 + index * 1.25;
    card(slide, 0.42, y, 12.48, 1.1);
    slide.addText(row[0], { x: 0.7, y: y + 0.28, w: 2.6, h: 0.5, fontFace: "Georgia", fontSize: 18, color: ink, margin: 0 });
    slide.addText(row[1], { x: 3.4, y: y + 0.3, w: 5.4, h: 0.5, fontFace: "Calibri", fontSize: 16, color: muted, margin: 0 });
    slide.addText(row[2], { x: 8.8, y: y + 0.28, w: 3.7, h: 0.5, fontFace: "Calibri", fontSize: 18, color: rose, bold: true, align: "right", margin: 0 });
  });
}

shotSlide(
  "Crafter · Your categories",
  "Lesson · your own material category",
  "Type a category. That creates it.",
  "material-category",
  [
    "Open Materials, then Add a material. Category is a typing box, not a locked menu. The hint says “e.g. Paper”.",
    "Type any name you want, up to 60 characters. Bookmarks, Wax seals, or a name in your own language all work.",
    "If you have used a name before, it may appear as a suggestion. You can still type a brand-new one.",
    "Press Save material. That shop now has the category. It shows on the shelf, in the filter, and in the stock pie.",
  ],
  [[1, 2.15, 2.05]],
);

{
  const slide = newSlide("Crafter · Your categories");
  kicker(slide, "Material categories");
  title(slide, "There is no fixed category list");
  const rules = [
    ["You invent the name", "Paper, Packaging, and Trim in the sample shop were typed by that crafter. They are not built into the system."],
    ["One shop, one list", "Another crafter does not see your categories. The admin does not have to approve the name."],
    ["No separate add button", "You do not open a category manager first. Saving the material is what adds the category."],
    ["Pin the ones you use", "On the shelf you can star up to five categories so they sit at the front of the filter."],
  ];
  rules.forEach((rule, index) => {
    const y = 1.18 + index * 1.4;
    card(slide, 0.42, y, 12.48, 1.25);
    slide.addText(rule[0], { x: 0.7, y: y + 0.16, w: 11.8, h: 0.36, fontFace: "Georgia", fontSize: 18, color: rose, margin: 0 });
    slide.addText(rule[1], { x: 0.7, y: y + 0.58, w: 11.8, h: 0.48, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0 });
  });
}

proseSlide("Crafter · Materials", "Stock and suppliers", "How the shelf stays current", [
  "Search finds a material by name. Sort runs A to Z, or Z to A. The filter lists All, plus every category this shop has typed.",
  "Update stock sets a new total on hand. The system records the old number, the new number, and the time. A low-stock row is one that has fallen to its alert number or below.",
  "Order from a supplier ticks the supplies to buy. Rows already at their alert start ticked. Saving the order does not add stock yet. Stock goes up when the delivery is received.",
]);

shotSlide(
  "Crafter · Print hub",
  "Print hub",
  "What one printed sheet costs",
  "print-hub",
  [
    "A printer is saved once: ink price, and how many pages the manufacturer says that ink prints.",
    "Color base cost on this Epson is ₱0.10 a sheet. Black base cost is ₱0.06 a sheet.",
    "Those two numbers are the starting point. Product costing then scales them for paper size, quality, and how heavy the color is.",
    "Printer purchases, such as the ₱450 color ink bottle, are recorded here and can become an expense in Finance.",
  ],
  [[1, 2.6, 2.6], [2, 2.3, 4.3], [3, 1.6, 2.15], [4, 2.4, 5.5]],
);

{
  const slide = newSlide("Crafter · Print hub");
  kicker(slide, "Print formula");
  title(slide, "From an ink bottle to one sheet");
  card(slide, 0.42, 1.12, 12.48, 1.15);
  slide.addText("Base cost per sheet  =  ink price  ÷  pages that ink prints", {
    x: 0.66, y: 1.42, w: 12, h: 0.55,
    fontFace: "Georgia", fontSize: 22, color: rose, margin: 0,
  });
  body(slide, "Color ink at ₱450 that prints about 4,500 pages is ₱0.10 a sheet. That matches the Epson card.", 0.66, 2.45, 12, 0.4, 16);

  const cols = [
    ["Paper size", "A5 is × 0.5\nA4 and Letter are × 1\nLegal is × 1.2\nA3 is × 2"],
    ["Quality", "Draft is × 0.6\nStandard is × 1\nBest is × 1.5"],
    ["Coverage", "Black and white × 0.4\nLight color × 0.8\nNormal color × 1\nPhoto-heavy × 1.8"],
  ];
  cols.forEach((col, index) => {
    const x = 0.42 + index * 4.2;
    card(slide, x, 3.05, 4.0, 2.55);
    slide.addText(col[0], { x: x + 0.22, y: 3.2, w: 3.5, h: 0.4, fontFace: "Georgia", fontSize: 18, color: ink, margin: 0 });
    slide.addText(col[1], { x: x + 0.22, y: 3.7, w: 3.5, h: 1.7, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0 });
  });
  body(slide, "Black and white uses the black base cost. Every color choice uses the color base cost.", 0.5, 5.75, 12.3, 0.4, 15);
}

shotSlide(
  "Crafter · Costing",
  "Product costing",
  "One finished piece, one cost",
  "costing",
  [
    "Saved products sit on the left. Thank-you card is open. Each product can also save a price.",
    "Materials: pick a supply, say how many units this batch uses, and how many finished pieces that batch makes.",
    "This card uses 1 sheet of matte laminate for 4 cards. ₱18 ÷ 4 = ₱4.50 of laminate in each card.",
    "Printing uses the Print hub printer. The line under the boxes shows the multipliers the system is applying.",
  ],
  [[1, 1.7, 2.5], [2, 3.4, 3.3], [3, 7.4, 4.15], [4, 3.2, 5.15]],
);

{
  const slide = newSlide("Crafter · Costing");
  kicker(slide, "A real example from the screen");
  title(slide, "The thank-you card, one print line");
  const rows = [
    ["Start", "Color base cost from Print hub", "₱0.10"],
    ["Paper", "A5, so multiply by 0.5", "₱0.05"],
    ["Quality", "Standard, so multiply by 1", "₱0.05"],
    ["Coverage", "Light color, so multiply by 0.8", "₱0.04 per sheet"],
    ["Share it", "1 sheet makes 4 cards", "₱0.01 per card"],
  ];
  rows.forEach((row, index) => {
    const y = 1.15 + index * 0.95;
    card(slide, 0.42, y, 12.48, 0.85);
    slide.addText(row[0], { x: 0.66, y: y + 0.2, w: 1.8, h: 0.45, fontFace: "Calibri", fontSize: 16, bold: true, color: rose, margin: 0 });
    slide.addText(row[1], { x: 2.6, y: y + 0.2, w: 6.8, h: 0.45, fontFace: "Calibri", fontSize: 18, color: ink, margin: 0 });
    slide.addText(row[2], { x: 9.4, y: y + 0.18, w: 3.2, h: 0.48, fontFace: "Georgia", fontSize: 18, color: ink, align: "right", margin: 0 });
  });
}

{
  const slide = newSlide("Crafter · Costing");
  kicker(slide, "The full costing formula");
  title(slide, "How the production cost is built");
  const lines = [
    ["Direct cost", "Material per piece  +  print per piece"],
    ["Overage", "Direct cost  ×  overage percent"],
    ["Loss", "(Direct cost + overage)  ×  loss percent"],
    ["After fees", "Direct + overage + loss + the operational fee"],
    ["Labor", "That result  ×  labor percent"],
    ["Production cost", "After fees  +  labor  +  packaging"],
  ];
  lines.forEach((lineItem, index) => {
    const col = index < 3 ? 0 : 1;
    const row = index % 3;
    const x = 0.42 + col * 6.45;
    const y = 1.15 + row * 1.55;
    card(slide, x, y, 6.25, 1.4);
    slide.addText(lineItem[0], { x: x + 0.25, y: y + 0.22, w: 5.7, h: 0.4, fontFace: "Georgia", fontSize: 18, color: rose, margin: 0 });
    slide.addText(lineItem[1], { x: x + 0.25, y: y + 0.7, w: 5.7, h: 0.45, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0 });
  });
}

{
  const slide = newSlide("Crafter · Costing");
  kicker(slide, "Four selling prices");
  title(slide, "Same cost. Four markups.");
  card(slide, 0.42, 1.15, 12.48, 1.2);
  slide.addText("Selling price  =  production cost  ×  (1 + markup percent)", {
    x: 0.66, y: 1.28, w: 12, h: 0.45, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0,
  });
  slide.addText("Profit  =  selling price  −  production cost", {
    x: 0.66, y: 1.78, w: 12, h: 0.35, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
  const prices = [
    ["Retail", "The everyday price"],
    ["Bulk", "A lower markup for a larger order"],
    ["Promo", "A sale markup"],
    ["Loyal", "A markup for a returning customer"],
  ];
  prices.forEach((item, index) => {
    const x = 0.42 + index * 3.2;
    card(slide, x, 2.65, 3.05, 2.3);
    slide.addText(item[0], { x: x + 0.2, y: 2.9, w: 2.65, h: 0.5, fontFace: "Georgia", fontSize: 20, color: ink, margin: 0 });
    slide.addText(item[1], { x: x + 0.2, y: 3.5, w: 2.65, h: 0.9, fontFace: "Calibri", fontSize: 15, color: muted, margin: 0 });
  });
  body(slide, "On the price list, the thank-you card costs ₱34.30 to make. Retail is ₱68.50, about double. Bulk is ₱51.45, exactly one and a half times the cost.", 0.5, 5.2, 12.3, 0.8, 16);
}

shotSlide(
  "Crafter · Prices",
  "Price sets",
  "The price stays tied to its costing",
  "prices",
  [
    "Cards and Stickers are names the crafter typed. They are not a built-in product menu.",
    "Thank-you card shows where it came from: the costing tab named Thank-you card.",
    "Production cost ₱34.30, retail ₱68.50, bulk ₱51.45. Open the row to see the rest.",
    "Cost a new product jumps back to the calculator. A price is not typed on its own.",
  ],
  [[1, 2.5, 2.7], [2, 2.6, 3.7], [3, 6.2, 3.7], [4, 6.6, 1.55]],
);

shotSlide(
  "Crafter · Your categories",
  "Lesson · your own product category",
  "The price group is whatever you type",
  "price-category",
  [
    "After the cost is ready, go to step 05, Save a price set. Category sits beside Variation name.",
    "The box says “e.g. Notebooks”. Type Cards, Stickers, Bookmarks, or any other group you want.",
    "Leave it blank and the price is filed under Uncategorized. You can still find it.",
    "Save to price list. Open Price sets. Your word is now a heading, with that product underneath.",
  ],
  [[1, 3.55, 4.85]],
);

{
  const slide = newSlide("Crafter · Your categories");
  kicker(slide, "Two different category boxes");
  title(slide, "A supply category is not a product category");
  card(slide, 0.42, 1.2, 6.15, 4.7);
  slide.addText("On a material", { x: 0.68, y: 1.45, w: 5.6, h: 0.4, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0 });
  slide.addText("This groups supplies on the shelf.\n\nExample: type Paper on sticker paper.\n\nIt answers “what kind of supply is this?”\n\nIt does not, by itself, create a group on the price list.", {
    x: 0.68, y: 2.1, w: 5.5, h: 3.3, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
  card(slide, 6.8, 1.2, 6.1, 4.7);
  slide.addText("On a saved price", { x: 7.05, y: 1.45, w: 5.5, h: 0.4, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0 });
  slide.addText("This groups finished products.\n\nExample: type Notebooks when you save the price.\n\nIt answers “what kind of product is this?”\n\nType the same word again to add another product to that group.", {
    x: 7.05, y: 2.1, w: 5.5, h: 3.3, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
  body(slide, "Practice: add a material in a new category called Bookmarks, cost a bookmark, then save the price with Category set to Bookmarks. Price sets will show a Bookmarks heading.", 0.5, 6.1, 12.3, 0.7, 15);
}

shotSlide(
  "Crafter · Bundles",
  "Bundles",
  "One price for a group of products",
  "bundles",
  [
    "Birthday desk set holds 2 products. Sold one by one they are ₱115.08.",
    "The bundle price is ₱95.08. The customer saves ₱20.00.",
    "A new bundle picks saved products and a quantity, then a single bundle price.",
    "If the bundle price is below the cost of the products inside it, the screen says so. It can still be saved.",
  ],
  [[1, 2.6, 3.15], [2, 6.5, 3.0], [3, 2.8, 4.6], [4, 2.2, 1.7]],
);

{
  const slide = newSlide("Crafter · Bundles");
  kicker(slide, "Bundle formula");
  title(slide, "Birthday desk set, in plain numbers");
  const rows = [
    ["Regular total", "Each product’s regular price × its quantity, added together", "₱115.08"],
    ["Cost total", "Each product’s production cost × its quantity, added together", "Kept with the bundle"],
    ["Savings", "Regular total  −  bundle price", "₱115.08 − ₱95.08 = ₱20.00"],
    ["Profit", "Bundle price  −  cost total", "Shown so a low price is a choice"],
  ];
  rows.forEach((row, index) => {
    const y = 1.2 + index * 1.3;
    card(slide, 0.42, y, 12.48, 1.15);
    slide.addText(row[0], { x: 0.66, y: y + 0.18, w: 2.6, h: 0.35, fontFace: "Georgia", fontSize: 16, color: rose, margin: 0 });
    slide.addText(row[1], { x: 0.66, y: y + 0.58, w: 7.4, h: 0.4, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0 });
    slide.addText(row[2], { x: 8.1, y: y + 0.35, w: 4.5, h: 0.45, fontFace: "Calibri", fontSize: 15, color: ink, align: "right", margin: 0 });
  });
}

shotSlide(
  "Crafter · Promotions",
  "Promotions",
  "A discount you can explain later",
  "promotions",
  [
    "Type the original price and choose Percent or a fixed peso amount.",
    "Percent off must be from 0 to 100. A fixed discount cannot be larger than the price.",
    "A code and a note are optional. Save promotion keeps the sale price, the note, and the code.",
    "10% off a ₱100 item removes ₱10. The sale price is ₱90. The same idea works on any price.",
  ],
  [[1, 2.4, 3.1], [2, 2.4, 3.9], [3, 6.6, 5.3], [4, 2.2, 5.6]],
);

{
  const slide = newSlide("Crafter · Promotions");
  kicker(slide, "Discount formula");
  title(slide, "Percent off, or pesos off");
  card(slide, 0.42, 1.2, 6.2, 4.6);
  slide.addText("Percent", { x: 0.7, y: 1.45, w: 5.5, h: 0.4, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0 });
  slide.addText("Discount  =  original price  ×  percent  ÷  100\n\nSale price  =  original price  −  discount\n\nExample\n₱68.50 at 10% off\nDiscount ₱6.85\nSale price ₱61.65", {
    x: 0.7, y: 2.05, w: 5.5, h: 3.3, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
  card(slide, 6.85, 1.2, 6.05, 4.6);
  slide.addText("Fixed amount", { x: 7.15, y: 1.45, w: 5.4, h: 0.4, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0 });
  slide.addText("Discount  =  the peso amount you type\n\nSale price  =  original price  −  that amount\n\nExample\n₱68.50 with ₱10 off\nSale price ₱58.50\n\nThe screen will not allow ₱70 off a ₱68.50 item.", {
    x: 7.15, y: 2.05, w: 5.4, h: 3.3, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0,
  });
}

shotSlide(
  "Crafter · Digital",
  "Digital products",
  "A price and a link, not a file host",
  "digital",
  [
    "A digital product is a download or template the crafter sells: a checklist, a budget sheet, a sticker file.",
    "The toolkit stores the price and the outside link. It does not host the file.",
    "Open link visits it. Copy link puts it on the clipboard. Edit changes the name, price, or link.",
    "These are ready to quote. Market booth checklist is ₱30. The birthday sticker file is ₱150.",
  ],
  [[1, 2.3, 3.2], [2, 2.1, 1.85], [3, 6.4, 3.2], [4, 2.5, 3.7]],
);

shotSlide(
  "Crafter · Customers",
  "Customers",
  "Save a person once",
  "customers",
  [
    "A customer is a name, phone, email, and address. Notes can sit on the record too.",
    "Search looks through name, phone, and email.",
    "Edit updates that person. The same record is then picked when an order starts, so the address is not retyped.",
    "These names also appear on the order board: Ana, Bea, Carlo, Luis, and the others.",
  ],
  [[1, 2.5, 3.3], [2, 6.3, 2.55], [3, 6.6, 3.3], [4, 2.4, 4.3]],
);

shotSlide(
  "Crafter · Orders",
  "Orders",
  "From inquiry to done",
  "orders",
  [
    "Six columns: Inquiry, Quoted, In production, Ready, Delivered, Done. The number on the column is how many cards are in it.",
    "Each card is one customer order: name, total, and due date. Luis Garcia is quoted at ₱274.40.",
    "The menu on the card moves it to another stage. Cards can also be dragged between columns.",
    "New order starts a blank order. A deposit before production is a recommendation, not a lock.",
  ],
  [[1, 2.2, 2.55], [2, 2.6, 3.3], [3, 3.0, 4.15], [4, 6.5, 1.55]],
);

{
  const slide = newSlide("Crafter · Orders");
  kicker(slide, "Order formula");
  title(slide, "How an order total is built");
  const bits = [
    ["Line total", "Unit price  ×  quantity"],
    ["Products", "Add every line total"],
    ["After discount", "Products  −  order discount"],
    ["Order total", "After discount  +  shipping"],
  ];
  bits.forEach((bit, index) => {
    const y = 1.15 + index * 1.15;
    card(slide, 0.42, y, 7.3, 1.02);
    slide.addText(`${index + 1}   ${bit[0]}`, { x: 0.64, y: y + 0.14, w: 6.8, h: 0.32, fontFace: "Georgia", fontSize: 16, color: rose, margin: 0 });
    slide.addText(bit[1], { x: 0.64, y: y + 0.5, w: 6.8, h: 0.35, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0 });
  });
  card(slide, 7.95, 1.15, 4.95, 4.6);
  slide.addText("Also on the order", { x: 8.2, y: 1.4, w: 4.5, h: 0.4, fontFace: "Georgia", fontSize: 18, color: ink, margin: 0 });
  slide.addText("Payment is Unpaid, Deposit received, or Paid in full.\n\nDelivery is Pickup, Courier, Meetup, or Other.\n\nA due date is optional.\n\nRevenue is not counted in Finance until the order is Delivered.", {
    x: 8.2, y: 2.0, w: 4.45, h: 3.3, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0,
  });
}

shotSlide(
  "Crafter · Documents",
  "Documents",
  "Invoices and receipts",
  "documents",
  [
    "A saved document keeps its own copy of the customer and the prices. Writing an invoice does not create a sale.",
    "INV-SAMPLE-0001 is an invoice for Ana Reyes, total ₱92.96. Open reads that copy.",
    "New invoice starts a blank invoice. A receipt is the same math with a receipt heading.",
    "Revenue still comes only from a delivered order. The document is the paper record.",
  ],
  [[1, 2.3, 2.15], [2, 2.6, 3.35], [3, 6.7, 2.55], [4, 2.2, 1.7]],
);

proseSlide("Crafter · Documents", "Invoices and receipts", "The document total", [
  "Each line is unit price times quantity. The document total is products, minus discount, plus shipping, plus tax.",
  "The tax line can be named, for example VAT. Leave tax at zero and the total does not grow. The same page can show the document as plain text to copy or print.",
  "Because the document keeps its own copy, later edits to the customer book do not rewrite an invoice that was already saved.",
]);

shotSlide(
  "Crafter · Finance",
  "Finance",
  "Money in, money out",
  "finance",
  [
    "Three windows: this week (Monday to today), the last 7 days, or this month. This view is the month.",
    "Rose bars are revenue. Gray bars are expenses. The day number sits under each pair.",
    "Money in is ₱1,288. Money out is ₱2,260. Short by ₱972. That is 1,288 minus 2,260.",
    "Revenue is the sale recorded when an order is delivered. Expenses are restocks and printer supplies.",
  ],
  [[1, 2.3, 2.7], [2, 4.5, 3.6], [3, 2.4, 5.15], [4, 2.1, 1.75]],
);

{
  const slide = newSlide("Crafter · Finance");
  kicker(slide, "Finance formula");
  title(slide, "Profit for the days you are looking at");
  card(slide, 0.42, 1.2, 12.48, 1.7);
  slide.addText("Profit  =  revenue in the window  −  expenses in the window", {
    x: 0.7, y: 1.55, w: 12, h: 0.45, fontFace: "Georgia", fontSize: 22, color: rose, margin: 0,
  });
  slide.addText("This month:  ₱1,288.00  −  ₱2,260.00  =  −₱972.00", {
    x: 0.7, y: 2.15, w: 12, h: 0.4, fontFace: "Calibri", fontSize: 18, color: ink, margin: 0,
  });
  const notes = [
    ["What counts as revenue", "Only orders that have reached Delivered, and only if that delivery date falls inside the window."],
    ["What counts as an expense", "A material restock, or a printer supply such as an ink bottle, on the day it was recorded."],
    ["What the chart does", "Each day adds that day’s revenue and that day’s expenses. The month view never draws more than 31 days."],
  ];
  notes.forEach((note, index) => {
    const y = 3.2 + index * 1.2;
    card(slide, 0.42, y, 12.48, 1.08);
    slide.addText(note[0], { x: 0.66, y: y + 0.12, w: 12, h: 0.32, fontFace: "Georgia", fontSize: 16, color: rose, margin: 0 });
    slide.addText(note[1], { x: 0.66, y: y + 0.5, w: 12, h: 0.4, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0 });
  });
}

shotSlide(
  "Crafter · Guide",
  "Guide and FAQs",
  "The same path, written out",
  "guide",
  [
    "Step 1 is the shelf. Step 2 is Print hub. Step 3 is the real cost of one finished piece.",
    "The simple version is the same chain: materials, printing, loss and overhead, labor, then production cost.",
    "Good questions opens short answers, such as why the calculator uses centavos, and what the operational fee is for.",
    "Each step has a link straight into that page, so the guide is also a map.",
  ],
  [[1, 2.6, 3.5], [2, 3.4, 4.7], [3, 2.6, 5.6], [4, 2.5, 4.15]],
);

proseSlide("Crafter · Guide and settings", "The quiet pages", "Guide, settings, and the top-right controls", [
  "Guide & FAQs is the in-app explanation, written in the same plain voice as the screens. The checklist step “Read the welcome guide” points here. It also offers a jump back to the calculator.",
  "Shop settings holds the currency (peso or dollar, with no conversion), the accent color, and light or dark mode. Below that is the business name and contact details that print on later invoices and receipts.",
  "A logo can be added for the shop. The password can be changed here. These pages stay open even after a plan ends.",
]);

shotSlide(
  "Crafter · Plans",
  "Plans and pricing",
  "One toolkit, three ways to pay",
  "pricing",
  [
    "The banner is the plan this crafter is on, the price, and the date access runs to.",
    "Monthly is ₱299. Quarterly is ₱799 every 3 months, about ₱266 a month, 11% less than paying monthly.",
    "Annual is ₱2,799 a year, about ₱233 a month, 22% less than paying monthly. The badge says Best value.",
    "Every plan opens the same eight tools. The only difference is how long access lasts.",
  ],
  [[1, 2.4, 2.55], [2, 2.5, 3.6], [3, 6.3, 3.5], [4, 3.6, 5.2]],
);

{
  const slide = newSlide("Crafter · Plans");
  kicker(slide, "How a plan’s end date is chosen");
  title(slide, "The clock starts when the admin approves payment");
  const rows = [
    ["Monthly", "1 month", "₱299", "Same day next month"],
    ["Quarterly", "3 months", "₱799", "Same day, three months on"],
    ["Annual", "12 months", "₱2,799", "Same day next year"],
  ];
  rows.forEach((row, index) => {
    const y = 1.2 + index * 1.15;
    card(slide, 0.42, y, 12.48, 1.02);
    row.forEach((cell, cellIndex) => {
      slide.addText(cell, {
        x: 0.66 + cellIndex * 3.05, y: y + 0.28, w: 2.9, h: 0.45,
        fontFace: cellIndex === 0 ? "Georgia" : "Calibri",
        fontSize: 16, color: cellIndex === 0 ? rose : ink, margin: 0,
      });
    });
  });
  body(slide, "If the start date is the 31st and the next month is shorter, the end date lands on the last day of that month. January 31 plus one month is February 28, or February 29 in a leap year.", 0.5, 4.8, 12.3, 1.1, 16);
}

shotSlide(
  "Crafter · Plans",
  "When a plan ends",
  "The work is kept. The tools pause.",
  "plan-locked",
  [
    "Opening a locked tool shows this card instead of the calculator. Nothing already saved is deleted.",
    "The message names the tool and the day the plan ended. This sample monthly plan ended on November 12, 2026.",
    "See plans & pricing goes to the payment page. Back to overview returns to the pages that stay open.",
    "Sign out leaves the account. The admin is the person who approves a new term and unlocks the tools.",
  ],
  [[1, 4.6, 2.4], [2, 4.3, 4.15], [3, 3.6, 5.15], [4, 6.3, 5.15]],
);

{
  const slide = newSlide("Crafter · Plans");
  kicker(slide, "What stays open");
  title(slide, "A paused plan does not close the whole shop");
  card(slide, 0.42, 1.2, 6.15, 5.5);
  slide.addText("Stays open", { x: 0.68, y: 1.42, w: 5.5, h: 0.4, fontFace: "Georgia", fontSize: 20, color: "1F7A4D", margin: 0 });
  slide.addText("Overview\nMaterials and the supply shelf\nPrint hub\nCustomers\nGuide and FAQs\nPlans and pricing\nShop settings", {
    x: 0.68, y: 2.0, w: 5.5, h: 4.2, fontFace: "Calibri", fontSize: 18, color: ink, margin: 0,
  });
  card(slide, 6.8, 1.2, 6.1, 5.5);
  slide.addText("Locks until renewal", { x: 7.05, y: 1.42, w: 5.5, h: 0.4, fontFace: "Georgia", fontSize: 20, color: rose, margin: 0 });
  slide.addText("Product costing\nPrice sets\nBundles\nPromotions\nDigital products\nOrders\nDocuments\nFinance", {
    x: 7.05, y: 2.0, w: 5.5, h: 4.2, fontFace: "Calibri", fontSize: 18, color: ink, margin: 0,
  });
}

{
  const slide = newSlide("Admin workspace");
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 6.9, fill: { color: rose } });
  slide.addText("PART TWO", {
    x: 0.7, y: 2.3, w: 10, h: 0.3,
    fontFace: "Calibri", fontSize: 14, color: "FDE8F0", bold: true, margin: 0, charSpacing: 1.4,
  });
  slide.addText("The admin’s desk", {
    x: 0.7, y: 2.7, w: 11, h: 0.7,
    fontFace: "Georgia", fontSize: 42, color: white, margin: 0,
  });
  slide.addText("Accounts, payments, purchase requests, stock, and shared links.", {
    x: 0.7, y: 3.55, w: 10, h: 0.4,
    fontFace: "Calibri", fontSize: 18, color: "FDE8F0", margin: 0,
  });
}

shotSlide(
  "Admin · Accounts",
  "Crafter accounts",
  "Prices, emails, and new logins",
  "admin-users",
  [
    "These three prices are what every crafter sees on Plans. Save prices updates the live plans page.",
    "Send renewal emails now writes only to crafters whose plan has already ended. An active plan is never emailed.",
    "Create login asks for a name, an email, and a plan. The end date shown is three months out for Quarterly.",
    "The new person must change the temporary password on first sign-in.",
  ],
  [[1, 2.5, 2.7], [2, 2.3, 4.0], [3, 2.4, 5.3], [4, 6.5, 5.5]],
);

proseSlide("Admin · Accounts", "Renewal emails", "Who gets a letter, and who does not", [
  "An email goes out only after a plan has ended. It includes the plans, the current prices, and a link to upload a payment proof. Each ended plan is emailed once.",
  "The letter stops if the plan is renewed, or if a payment proof is already waiting for review. Sending again by hand uses the same rule. It does not mail everyone.",
  "The mailbox is the admin’s own mailbox. If mail is not connected yet, the button stays off and the page says so. A daily check can also send these letters.",
]);

shotSlide(
  "Admin · Payments",
  "Renewal payments",
  "How a crafter pays, and how you check it",
  "admin-payments",
  [
    "The admin types the account name, GCash, Maya, bank details, and instructions. Crafters see this on their plans page. Nothing is charged automatically.",
    "The QR image is the code they scan. Replace image or Delete QR changes it. A square picture works best.",
    "The numbers on this screenshot are samples. They should be replaced with the real account before anyone is asked to pay.",
    "Below this form, each uploaded proof can be approved or sent back. Approving starts the new term. Rejecting leaves the plan as it is.",
  ],
  [[1, 2.3, 3.6], [2, 6.5, 3.3], [3, 2.4, 5.0], [4, 2.2, 1.85]],
);

proseSlide("Admin · Payments", "The payment path", "From screenshot to a new end date", [
  "The crafter picks Monthly, Quarterly, or Annual, pays the admin directly, and uploads a screenshot of the receipt.",
  "Both people get an email: the admin is asked to review, and the crafter is told the proof was received. The plan does not change yet.",
  "Approve starts the new term from that day, using the plan length: 1, 3, or 12 months. Reject asks the crafter to send a clearer screenshot. Saved shop data is untouched either way.",
]);

shotSlide(
  "Admin · Requests",
  "Purchase requests",
  "A product sent to the admin for a decision",
  "admin-orders",
  [
    "Filters: All, Needs review, Approved, Changes requested, Declined. This sample has 17 requests.",
    "Each request names the crafter, the date, the product, the quantity, and the total.",
    "Thank-you card shows selling price ₱110, and the production cost of the requested quantity, ₱56.",
    "The admin can open the cost breakdown, then approve, ask for changes, or decline, and write a reply the crafter can read.",
  ],
  [[1, 2.2, 2.7], [2, 2.3, 3.5], [3, 2.5, 4.5], [4, 2.6, 5.4]],
);

shotSlide(
  "Admin · Inventory",
  "Inventory",
  "Stock that exists only after approval",
  "admin-inventory",
  [
    "Approving a purchase request adds the product here, with the quantity that was approved.",
    "Loyalty card: 20 received, retail ₱12, production cost ₱5, 20 still on hand.",
    "Save stock sets a new on-hand quantity. The admin types the new total. The system does not guess it.",
    "A crafter’s own customer sale does not reduce this admin stock. The two shelves are separate.",
  ],
  [[1, 2.2, 1.85], [2, 2.4, 3.2], [3, 2.6, 4.7], [4, 6.6, 2.4]],
);

shotSlide(
  "Admin · Resources",
  "Resources",
  "Links the crafter can open",
  "admin-resources",
  [
    "Provider links are the master list, the community, the terms, and the privacy page.",
    "Leave a field blank when that page is not ready. The toolkit will not invent a link.",
    "Add a template with a name, a category, and the outside link. Crafters open these from their guide area.",
    "Save links publishes whatever is filled in. A blank box simply stays unpublished.",
  ],
  [[1, 2.4, 3.0], [2, 2.2, 2.05], [3, 2.4, 5.2], [4, 6.4, 4.3]],
);

shotSlide(
  "Crafter · Settings",
  "Lesson · make the shop yours",
  "The name that prints on documents",
  "settings-business",
  [
    "Open the gear, Settings. Business name, email, phone, and address can appear on later invoices and receipts.",
    "Payment details here are the crafter’s own GCash or bank, for their customers. This is not the admin’s plan payment.",
    "Save changes stores it on this shop only. The currency and colors are on the section above this one.",
    "A logo can be added below. JPEG, PNG, or WebP up to 2 MB. The system stores it as a small image.",
  ],
  [[1, 2.4, 2.3], [2, 2.3, 4.2]],
);

shotSlide(
  "Crafter · Plans",
  "Lesson · pay and send proof",
  "Nothing is charged on this page",
  "plan-pay",
  [
    "Plans & pricing, then Pay & renew. Scan the QR or use the GCash, Maya, or bank details the admin saved.",
    "Choose the plan and how you paid. Send the exact amount shown, such as ₱299 for Monthly.",
    "A reference number and a note are optional. The screenshot of the receipt is the proof. JPEG, PNG, or WebP, up to 10 MB.",
    "Send payment proof tells the admin. The plan does not change until the admin approves that screenshot.",
  ],
  [[1, 2.2, 2.6], [2, 5.6, 2.5], [3, 5.5, 4.3], [4, 6.6, 4.9]],
);

{
  const slide = newSlide("Practice");
  kicker(slide, "Do this once, in order");
  title(slide, "A first hour in the shop");
  const steps = [
    "Sign in with the email and temporary password from the admin, then set your own password.",
    "Settings: choose peso or dollar, type the business name, and save.",
    "Materials: Add a material. Type a new Category, such as Bookmarks. Save.",
    "Print hub: add the printer with the ink price and the page yield from the bottle.",
    "Product costing: add that material, add a print line, and read the cost per piece.",
    "Save a price set. Type the same or a new Category, such as Bookmarks. Open Price sets and see the heading.",
    "Customers: save one person. Orders: start an order for them and move it to Delivered.",
    "Finance: that delivery is now revenue. Documents: make the invoice. It does not create a second sale.",
  ];
  steps.forEach((step, index) => {
    const y = 1.15 + index * 0.68;
    slide.addShape(pres.shapes.OVAL, {
      x: 0.48, y: y + 0.05, w: 0.38, h: 0.38, fill: { color: rose },
    });
    slide.addText(String(index + 1), {
      x: 0.48, y: y + 0.05, w: 0.38, h: 0.38,
      fontFace: "Calibri", fontSize: 13, bold: true, color: white, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(step, {
      x: 1.05, y, w: 11.7, h: 0.55,
      fontFace: "Calibri", fontSize: 15, color: ink, margin: 0, valign: "middle",
    });
  });
}

{
  const slide = newSlide("The whole system");
  kicker(slide, "One story");
  title(slide, "What happens for one thank-you card");
  const story = [
    ["Admin", "Creates the crafter login and sets the plan price."],
    ["Crafter", "Adds laminate to the shelf and the Epson printer to Print hub."],
    ["Crafter", "Costs the card: materials, print, loss, labor, packaging."],
    ["Crafter", "Saves retail and bulk under a category they type, such as Cards or Notebooks."],
    ["Crafter", "Picks the customer, builds the order, and moves it to Delivered."],
    ["Finance", "That delivered total becomes revenue. A restock becomes an expense."],
    ["Admin", "When the plan ends, the crafter uploads proof. Approval starts the next term."],
  ];
  story.forEach((item, index) => {
    const y = 1.08 + index * 0.78;
    slide.addShape(pres.shapes.OVAL, {
      x: 0.48, y: y + 0.08, w: 0.36, h: 0.36, fill: { color: index === 6 || index === 0 ? rose : "2C2430" },
    });
    slide.addText(String(index + 1), {
      x: 0.48, y: y + 0.08, w: 0.36, h: 0.36,
      fontFace: "Calibri", fontSize: 12, bold: true, color: white, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(item[0], { x: 1.05, y, w: 1.7, h: 0.55, fontFace: "Georgia", fontSize: 14, color: rose, margin: 0, valign: "middle" });
    slide.addText(item[1], { x: 2.8, y, w: 9.8, h: 0.55, fontFace: "Calibri", fontSize: 16, color: ink, margin: 0, valign: "middle" });
  });
}

{
  const slide = newSlide("The whole system");
  kicker(slide, "Keep these four");
  title(slide, "The short version");
  const points = [
    ["Cost before price", "The selling price is the production cost plus a markup. Retail, bulk, promo, and loyal are four markups on the same cost."],
    ["Delivered means revenue", "An order becomes income only when it is delivered. Supplies and ink become expenses when they are recorded."],
    ["Admin unlocks the term", "There is no automatic card charge. The crafter pays the admin, uploads proof, and the admin’s approval sets the new end date."],
    ["Saved work stays", "An ended or paused plan locks the selling tools. Materials, customers, and everything already typed remain in the shop."],
  ];
  points.forEach((point, index) => {
    const y = 1.15 + index * 1.4;
    card(slide, 0.42, y, 12.48, 1.25);
    slide.addText(point[0], { x: 0.7, y: y + 0.16, w: 12, h: 0.36, fontFace: "Georgia", fontSize: 18, color: rose, margin: 0 });
    slide.addText(point[1], { x: 0.7, y: y + 0.58, w: 11.9, h: 0.5, fontFace: "Calibri", fontSize: 15, color: ink, margin: 0 });
  });
}

await pres.writeFile({ fileName: path.join(dir, "Creative-Costwise-Client-Presentation.pptx") });
console.log(`slides ${slides.length}`);
