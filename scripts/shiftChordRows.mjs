import fs from "fs";

const PATH = "data/overlayMap.om108.json";
const HEIGHT = 710;

const DY = {
  maj: 2 / HEIGHT,
  min: 14 / HEIGHT,
  "7": 3 / HEIGHT
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const map = JSON.parse(fs.readFileSync(PATH, "utf8"));
const elements = Array.isArray(map.elements) ? map.elements : [];

for (const control of elements) {
  if (!control?.id || !Array.isArray(control.bbox)) continue;
  if (!control.id.startsWith("chord_")) continue;

  let dy = 0;
  if (control.id.includes("_maj")) dy = DY.maj;
  else if (control.id.includes("_min")) dy = DY.min;
  else if (control.id.includes("_7") || control.id.includes("_7th")) dy = DY["7"];
  else continue;

  control.bbox[1] = clamp01(control.bbox[1] + dy);
}

fs.writeFileSync(PATH, JSON.stringify(map, null, 2));
console.log("Done. Updated chord row Y offsets.");
