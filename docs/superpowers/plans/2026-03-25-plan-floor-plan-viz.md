# Floor Plan Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/plan` route that renders a PNG floor plan image as a textured 3D plane with orbit controls using React Three Fiber.

**Architecture:** A new `PlanPage.tsx` page component wraps an R3F `<Canvas>` containing a `<Plane>` mesh textured with the floor plan PNG. OrbitControls from drei provide pan/zoom/rotate. A `FloorPlan` sub-component handles texture loading and plane rendering.

**Tech Stack:** React Three Fiber, @react-three/drei, Three.js

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/src/pages/PlanPage.tsx` | Page component with Canvas, FloorPlan sub-component, OrbitControls |
| Modify | `app/src/App.tsx:27-41` | Add `/plan` route inside AppLayout |
| Add | `app/public/floor-plan.png` | Placeholder floor plan image |

---

### Task 1: Install dependencies

- [ ] **Step 1: Install R3F, drei, and three**

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin/app && pnpm add @react-three/fiber @react-three/drei three && pnpm add -D @types/three
```

- [ ] **Step 2: Verify installation**

Run: `cd /Users/markwatabe/Documents/GitHub/pagu-admin/app && pnpm list @react-three/fiber @react-three/drei three @types/three`

Expected: All four packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/pnpm-lock.yaml
git commit -m "feat: add react-three-fiber, drei, and three dependencies"
```

---

### Task 2: Add placeholder floor plan image

- [ ] **Step 1: Create a placeholder PNG**

We need a floor plan PNG in `app/public/`. Use a simple generated placeholder:

```bash
cd /Users/markwatabe/Documents/GitHub/pagu-admin/app/public && curl -o floor-plan.png "https://placehold.co/1200x800/e2e8f0/475569?text=Floor+Plan"
```

If curl fails (no network), create a minimal 1x1 PNG as a stub — the real image will be swapped in later.

- [ ] **Step 2: Verify file exists**

```bash
ls -la /Users/markwatabe/Documents/GitHub/pagu-admin/app/public/floor-plan.png
```

- [ ] **Step 3: Commit**

```bash
git add app/public/floor-plan.png
git commit -m "feat: add placeholder floor plan image"
```

---

### Task 3: Create PlanPage component

**Files:**
- Create: `app/src/pages/PlanPage.tsx`

- [ ] **Step 1: Create PlanPage.tsx**

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Plane, useTexture } from '@react-three/drei';

function FloorPlan() {
  const texture = useTexture('/floor-plan.png');
  const aspect = texture.image.width / texture.image.height;
  const planeWidth = 10;
  const planeHeight = planeWidth / aspect;

  return (
    <Plane args={[planeWidth, planeHeight]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={texture} />
    </Plane>
  );
}

export function PlanPage() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />
        <FloorPlan />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
```

Key decisions:
- `rotation={[-Math.PI / 2, 0, 0]}` lays the plane flat on the XZ ground plane
- Camera starts at `[0, 10, 10]` — above and slightly in front, looking down at an angle
- `height: calc(100vh - 64px)` accounts for the AppLayout header
- Aspect ratio is derived from the loaded texture so the image isn't stretched

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/markwatabe/Documents/GitHub/pagu-admin/app && pnpm exec tsc --noEmit`

Expected: No errors (or only pre-existing errors unrelated to PlanPage).

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/PlanPage.tsx
git commit -m "feat: create PlanPage with R3F floor plan scene"
```

---

### Task 4: Add /plan route

**Files:**
- Modify: `app/src/App.tsx:1-41`

- [ ] **Step 1: Add import and route**

In `app/src/App.tsx`, add this import after line 18:

```tsx
import { PlanPage } from './pages/PlanPage';
```

Add this route inside the `<Route element={<AppLayout />}>` block, after the `/menu` route (after line 40):

```tsx
            <Route path="/plan" element={<PlanPage />} />
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/markwatabe/Documents/GitHub/pagu-admin/app && pnpm exec tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat: add /plan route to app router"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/markwatabe/Documents/GitHub/pagu-admin/app && pnpm dev`

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173/plan` (after logging in). Confirm:
- Floor plan PNG renders on a flat plane
- Orbit controls work: left-click drag to rotate, right-click drag to pan, scroll to zoom
- No console errors

- [ ] **Step 3: Stop dev server and commit if any fixes were needed**
