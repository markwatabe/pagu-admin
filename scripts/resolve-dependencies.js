#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INGREDIENTS_DIR = path.join(__dirname, "..", "ingredients");

function loadAllIngredients() {
  const files = fs
    .readdirSync(INGREDIENTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const ingredients = {};
  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.join(INGREDIENTS_DIR, file), "utf8")
    );
    ingredients[data.id] = data;
  }
  return ingredients;
}

function collectReferencedIds(ingredients) {
  const refs = new Map(); // id -> Set of files that reference it
  for (const [id, data] of Object.entries(ingredients)) {
    if (!data.ingredients) continue;
    for (const entry of data.ingredients) {
      const refId = entry[2];
      if (!refs.has(refId)) refs.set(refId, new Set());
      refs.get(refId).add(id);
    }
  }
  return refs;
}

function inferType(id) {
  const lower = id.toLowerCase();
  if (lower.includes("flour")) return "dry";
  if (lower.includes("sugar")) return "dry";
  if (lower.includes("salt")) return "dry";
  if (lower.includes("baking")) return "dry";
  if (lower.includes("oil")) return "oil";
  if (lower.includes("butter")) return "dairy";
  if (lower.includes("egg")) return "dairy";
  if (lower.includes("chocolate")) return "dry";
  if (lower.includes("sesame_seed")) return "dry";
  if (lower.includes("miso")) return "paste";
  return "other";
}

function formatName(id) {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function run() {
  const ingredients = loadAllIngredients();
  const refs = collectReferencedIds(ingredients);
  const existingIds = new Set(Object.keys(ingredients));

  const missing = [];
  for (const [refId, referencedBy] of refs) {
    if (!existingIds.has(refId)) {
      missing.push({ id: refId, referencedBy: [...referencedBy] });
    }
  }

  if (missing.length === 0) {
    console.log("All ingredient dependencies are resolved.");
    return;
  }

  console.log(`Found ${missing.length} missing ingredient(s):\n`);

  for (const { id, referencedBy } of missing) {
    console.log(`  ${id}`);
    console.log(`    referenced by: ${referencedBy.join(", ")}`);

    const newIngredient = {
      id,
      production_type: "purchasable",
      type: inferType(id),
      name: formatName(id),
      unit: "gram",
    };

    const filePath = path.join(INGREDIENTS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newIngredient, null, 4) + "\n");
    console.log(`    -> created ${id}.json`);
  }

  console.log(`\nCreated ${missing.length} file(s).`);
}

run();
