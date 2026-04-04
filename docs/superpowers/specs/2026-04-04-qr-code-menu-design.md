# QR Code Menu Node + Menu Preview Update

## Overview

Add a QR code node type to the menu layout editor so printed menus can include a scannable link to the online menu preview. Update the public menu preview page to be menu-specific (showing dishes linked to a specific menu).

## Changes

### 1. Install `qrcode` package

Install `qrcode` in the `app` package — it generates SVG strings client-side.

### 2. New node type: `qrcode`

- Add `'qrcode'` to the `NodeType` union in `types.ts`
- QR code nodes are draggable/resizable like other nodes
- The QR code encodes the URL `{window.location.origin}/:orgId/menu-preview/:menuId`
- Rendered as inline SVG in both the editor preview and print view

### 3. "Add QR Code" toolbar button

- Add a third button in `PrintLayoutEditor.tsx` alongside "Add Node" and "Add Image"
- Creates a node with `{ nodeType: 'qrcode', width: 120, height: 120, template: '' }`

### 4. Render QR code in PrintNode

- In the print renderer, when `nodeType === 'qrcode'`, generate an SVG string using the `qrcode` package and render it inline
- In the editor preview, same rendering

### 5. Update PublicMenuPreviewPage route

- Route changes from `/:orgId/menu-preview` to `/:orgId/menu-preview/:menuId`
- Page fetches `/api/menus/:menuId` which returns linked dishes
- Renders those dishes (grouped by section) instead of fetching all available items from `/api/public/menu-items`

### 6. Update App.tsx router

- Update the route definition for menu-preview to include `:menuId` param
