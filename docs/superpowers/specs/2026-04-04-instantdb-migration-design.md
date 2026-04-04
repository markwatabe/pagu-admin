# InstantDB Migration: Master Data to InstantDB

## Overview

Migrate all data currently stored as JSON files in `master-data/` into InstantDB, then delete the folder and all file-based server routes. The schema is being redesigned to be cleaner and more flexible.

## Current State

- `master-data/` contains: recipes (11), purchasable_ingredients (88), dishes (3), menus (2), skus (57), config (1 CSV), design-tokens.json
- Server reads all data from disk via `repoPath`-based routes
- Frontend already uses InstantDB for some entities (menuItems, reviews, events, orgs) but recipes/ingredients/dishes/SKUs/menus are served via REST from JSON files
- InstantDB schema has `recipes` (just `name`) and `measuredIngredients` entities that are incomplete

## New Schema

### Master Data

**component**
- Fields: `name` (string), `type` (string, optional — e.g. "sauce", "protein", "nut"), `allergen` (bool, optional)
- Links: has many `recipes`, has many `skus`, linked by many `dishes`
- Replaces: `purchasable_ingredients/*.json` and the identity portion of `recipes/*.json`

**recipe**
- Fields: `name` (string), `ingredients` (json: `[{qty: number, unit: string, componentId: string}]`), `instructions` (json: `string[]`), `equipment` (json: `string[]`)
- Links: belongs to one `component`
- Replaces: the recipe data (ingredients/instructions/equipment) from `recipes/*.json`

**sku**
- Fields: `name` (string), `url` (string, optional), `asin` (string, optional), `brand` (string, optional), `quantity` (number, optional), `unit` (string, optional), `dimensions` (string, optional), `upc` (string, optional), `manufacturer` (string, optional), `prices` (json: `[{price, date, rating, reviewCount, isPrime, availability, delivery}]`)
- Links: belongs to one `component`
- Replaces: `skus/*.json`

**dish**
- Fields: `name` (string), `description` (string, optional), `price` (number, optional), `section` (string, optional), `available` (bool, optional), `instructions` (json: `string[]`, optional)
- Links: links to many `components`, linked by many `menus`
- Replaces: `dishes/*.json` and `menuItems` entity

**menu**
- Fields: `name` (string), `layout` (json — full page/node rendering payload)
- Links: links to many `dishes`
- Replaces: `menus/*.json`

### Execution Data (attributes TBD, create entities with minimal fields)

**componentInstance**
- Links: belongs to one `component`, optionally one `sku`, optionally one `productionRecord`

**productionRecord**
- Links: belongs to one `componentInstance`

**dishInstance**
- Links: belongs to one `dish`, has many `componentInstances`

**orgs** (existing entity, updated)
- Add field: `designTokens` (json — the design token payload from design-tokens.json)

### Entities to Remove
- `measuredIngredients` — replaced by JSON on recipe
- `menuItems` — replaced by dishes

### Links Summary

```
component <-many-- recipe
component <-many-- sku
component <-many->  dish  (many-to-many)
dish      <-many->  menu  (many-to-many)
componentInstance --> component
componentInstance --> sku (optional)
componentInstance --> productionRecord (optional)
dishInstance --> dish
dishInstance <-many-- componentInstance
```

## Migration Plan

### Data Mapping

1. Each `purchasable_ingredients/*.json` becomes a **component** (no recipe link)
2. Each `recipes/*.json` becomes a **component** + a **recipe** linked to it
   - Component gets: `name`, `ingredient_type` -> `type`
   - Recipe gets: `ingredients` (transformed to `[{qty, unit, componentId}]`), `instructions`, `equipment`
   - `componentId` in recipe ingredients references the component's InstantDB ID (requires mapping old string IDs to new UUIDs)
3. Each `skus/*.json` becomes a **sku**. SKUs need to be linked to their matching component (by matching the SKU to the purchasable ingredient it represents — this mapping comes from the CSV or manual matching)
4. Each `dishes/*.json` becomes a **dish**, linked to components via the `components` array
5. Each `menus/*.json` becomes a **menu** with the full layout in `layout` field

### What Gets Deleted

**Server files to remove/rewrite:**
- `server/src/lib/recipes.ts` — entire file (reads from disk)
- `server/src/lib/git.ts` — entire file (git commits for file changes)
- `server/src/lib/agent-tools.ts` — rewrite to use InstantDB instead of file system
- `server/src/routes/recipes.ts` — rewrite to query InstantDB
- `server/src/routes/dishes.ts` — rewrite to query InstantDB
- `server/src/routes/menus.ts` — rewrite to query InstantDB
- `server/src/routes/skus.ts` — rewrite to query InstantDB
- `server/src/routes/files.ts` — rewrite (currently reads menus from disk)
- `server/src/routes/designTokens.ts` — rewrite to read/write design tokens from org entity
- `server/src/index.ts` — remove `repoPath` concept

**Frontend files to update:**
- `app/src/pages/RecipePage.tsx` — switch from REST fetch to InstantDB queries
- Any other pages that fetch from `/api/recipes`, `/api/dishes`, `/api/menus`, `/api/skus`

**Delete:**
- `master-data/` directory entirely

### Resolved Decisions

- **Design tokens:** Move to a `designTokens` (json) field on the `orgs` entity
- **SKU-to-component mapping:** Match by name during migration
- **Existing menuItems in InstantDB:** Delete as part of migration cleanup
