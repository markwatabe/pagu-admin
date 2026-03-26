# Floor Plan Visualization — `/plan` Route

## Overview

A new `/plan` route that renders a PNG floor plan image as a texture on a 3D plane using React Three Fiber, with orbit controls for pan/zoom/rotate.

## Architecture

- **Route:** `/plan` inside `<AppLayout>` (protected, with nav/footer)
- **Page component:** `app/src/pages/PlanPage.tsx`
- **Floor plan image:** `/floor-plan.png` in `app/public/` (hardcoded path for now)

## Dependencies (new)

- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helpers (OrbitControls, useTexture, Plane)
- `three` — Three.js core
- `@types/three` — TypeScript types

## Scene Setup

- `<Canvas>` fills the page content area
- `<Plane>` geometry sized to match floor plan aspect ratio
- PNG loaded via `useTexture` from drei, applied as a `map` on `<meshStandardMaterial>`
- `<OrbitControls>` for orbit/pan/zoom interaction
- Ambient light + directional light for even illumination
- Camera starts positioned above the plane looking down at an angle

## Component Structure

```
PlanPage.tsx
├── <Canvas>
│   ├── <ambientLight>
│   ├── <directionalLight>
│   ├── <FloorPlan />          // Plane mesh with PNG texture
│   └── <OrbitControls />
```

`FloorPlan` is a small internal component that loads the texture and renders the plane.

## Future Extension (Step C)

The flat `<Plane>` mesh serves as a raycast target for placing 3D objects (tables, markers) on the floor plan. This design intentionally supports that path.

## Testing

- Verify route renders without errors
- Verify orbit controls work (pan, zoom, rotate)
- Visual confirmation of PNG rendering on plane
