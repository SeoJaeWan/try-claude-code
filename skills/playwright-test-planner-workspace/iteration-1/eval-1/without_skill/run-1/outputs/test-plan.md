# E2E Test Plan: Next.js Default App

## Application Overview

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Styling**: Tailwind CSS v4 with dark mode support (prefers-color-scheme)
- **Pages**: Single page app (home page only)
- **Fonts**: Geist Sans and Geist Mono (Google Fonts)
- **Static Assets**: next.svg, vercel.svg, file.svg, globe.svg, window.svg

## Page: Home (`/`)

### Elements Identified

1. **Next.js Logo** - `<Image>` with alt="Next.js logo", 100x20px, priority loaded
2. **Heading** - `<h1>` with text "To get started, edit the page.tsx file."
3. **Description Paragraph** - Text about finding starting points
4. **Templates Link** - External link to Vercel templates
5. **Learning Link** - External link to Next.js learning center
6. **Deploy Now Button/Link** - External link to Vercel deploy, contains Vercel logomark image
7. **Documentation Button/Link** - External link to Next.js docs

---

## Test Cases

### TC-01: Page Load and Basic Rendering

**Priority**: Critical
**Description**: Verify the home page loads successfully with all key elements visible.

**Steps**:
1. Navigate to `/`
2. Verify page loads with HTTP 200
3. Verify the page title is "Create Next App"
4. Verify the `<html>` element has `lang="en"`

**Expected**: Page loads without errors, title and lang attribute are correct.

---

### TC-02: Next.js Logo Visibility

**Priority**: High
**Description**: Verify the Next.js logo image is displayed.

**Steps**:
1. Navigate to `/`
2. Locate the image with alt text "Next.js logo"
3. Verify the image is visible

**Expected**: The Next.js logo is rendered and visible on the page.

---

### TC-03: Heading Text

**Priority**: High
**Description**: Verify the main heading is displayed correctly.

**Steps**:
1. Navigate to `/`
2. Locate the `<h1>` element
3. Verify it contains "To get started, edit the page.tsx file."

**Expected**: Heading text matches expected content.

---

### TC-04: Description Paragraph

**Priority**: Medium
**Description**: Verify the description paragraph renders with correct text and links.

**Steps**:
1. Navigate to `/`
2. Locate the paragraph text containing "Looking for a starting point"
3. Verify "Templates" link text is present
4. Verify "Learning" link text is present

**Expected**: Description text is visible with both inline links.

---

### TC-05: Templates Link

**Priority**: High
**Description**: Verify the "Templates" link points to the correct Vercel templates URL.

**Steps**:
1. Navigate to `/`
2. Locate the link with text "Templates"
3. Verify its `href` contains `vercel.com/templates`

**Expected**: Link href is correct and includes framework=next.js parameter.

---

### TC-06: Learning Link

**Priority**: High
**Description**: Verify the "Learning" link points to the correct Next.js learn URL.

**Steps**:
1. Navigate to `/`
2. Locate the link with text "Learning"
3. Verify its `href` contains `nextjs.org/learn`

**Expected**: Link href is correct.

---

### TC-07: Deploy Now Button

**Priority**: High
**Description**: Verify the "Deploy Now" call-to-action link.

**Steps**:
1. Navigate to `/`
2. Locate the link with text "Deploy Now"
3. Verify it has `target="_blank"` and `rel="noopener noreferrer"`
4. Verify its `href` contains `vercel.com/new`
5. Verify the Vercel logomark image (alt="Vercel logomark") is visible inside the link

**Expected**: Deploy Now link is present with correct href, opens in new tab, and contains the Vercel logo.

---

### TC-08: Documentation Button

**Priority**: High
**Description**: Verify the "Documentation" link.

**Steps**:
1. Navigate to `/`
2. Locate the link with text "Documentation"
3. Verify it has `target="_blank"` and `rel="noopener noreferrer"`
4. Verify its `href` contains `nextjs.org/docs`

**Expected**: Documentation link is present with correct href and opens in new tab.

---

### TC-09: Responsive Layout - Mobile

**Priority**: Medium
**Description**: Verify the page layout adapts for small screens.

**Steps**:
1. Set viewport to 375x667 (mobile)
2. Navigate to `/`
3. Verify content is centered (items-center on small screens)
4. Verify buttons stack vertically (flex-col)

**Expected**: Page renders in a mobile-friendly layout with centered content and stacked buttons.

---

### TC-10: Responsive Layout - Desktop

**Priority**: Medium
**Description**: Verify the page layout adapts for larger screens.

**Steps**:
1. Set viewport to 1280x720 (desktop)
2. Navigate to `/`
3. Verify content is left-aligned (sm:items-start)
4. Verify buttons are side by side (sm:flex-row)

**Expected**: Page renders with left-aligned content and horizontal button layout.

---

### TC-11: Dark Mode Support

**Priority**: Medium
**Description**: Verify dark mode styles are applied when the system prefers dark color scheme.

**Steps**:
1. Set `prefers-color-scheme: dark` via browser emulation
2. Navigate to `/`
3. Verify background is dark (black/dark tones)
4. Verify the Next.js logo has the `invert` filter applied (dark:invert class)
5. Verify heading text is light colored

**Expected**: Dark mode renders correctly with inverted colors and dark backgrounds.

---

### TC-12: Light Mode (Default)

**Priority**: Medium
**Description**: Verify light mode styles are the default.

**Steps**:
1. Ensure `prefers-color-scheme: light` (default)
2. Navigate to `/`
3. Verify background is light (white/zinc-50 tones)
4. Verify text is dark colored

**Expected**: Light mode renders correctly as the default theme.

---

### TC-13: Static Assets Load

**Priority**: Medium
**Description**: Verify static SVG assets are served correctly.

**Steps**:
1. Navigate to `/next.svg`
2. Verify HTTP 200 response
3. Navigate to `/vercel.svg`
4. Verify HTTP 200 response

**Expected**: SVG files are accessible from the public directory.

---

### TC-14: Font Loading

**Priority**: Low
**Description**: Verify custom Google Fonts (Geist Sans, Geist Mono) are loaded.

**Steps**:
1. Navigate to `/`
2. Verify the `<body>` element has CSS variable classes for Geist fonts
3. Verify font-family is applied

**Expected**: Custom fonts are loaded and applied to the page.

---

### TC-15: No Console Errors

**Priority**: High
**Description**: Verify the page loads without JavaScript console errors.

**Steps**:
1. Open browser console listener
2. Navigate to `/`
3. Wait for page to fully load
4. Check for any console errors

**Expected**: No JavaScript errors in the console.

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 1     |
| High     | 6     |
| Medium   | 6     |
| Low      | 1     |
| **Total**| **15**|

## Notes

- This is a default Next.js starter app with no dynamic functionality, API routes, or user interactions beyond link navigation.
- All external links open in new tabs, so E2E tests should verify `target="_blank"` rather than following the links.
- Dark mode is driven by `prefers-color-scheme` media query, not a toggle, so it must be tested via browser emulation.
- The app has a single route (`/`), so routing tests are not applicable.
