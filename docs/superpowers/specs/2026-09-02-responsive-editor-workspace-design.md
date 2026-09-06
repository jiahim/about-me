# Responsive Editorial Workspace Design

**Date:** 2026-09-02

**Status:** Approved

**Scope:** `apps/admin` article workspace below 980px

## Goal

Make the complete article workflow available on compact and narrow screens without duplicating editor, preview, or article-list state and without changing the desktop three-column workbench.

## Interaction model

At viewport widths of 980px and below, the article workspace exposes a compact toolbar with an “编辑 / 预览” segmented control. “编辑” is the default. The selected pane occupies the content column while the other pane remains mounted but is visually hidden, so editor and preview state are preserved.

Between 761px and 980px, the article sidebar remains docked. Below 760px, the toolbar also exposes an “文章” button. It opens the existing `ArticleSidebar` as a left drawer above the current pane. The drawer closes when the user clicks the backdrop, presses Escape, starts a new article, or successfully chooses an article.

The drawer is no wider than `20rem` and leaves a `2.5rem` edge on small screens. The backdrop and drawer animate in 160–200ms; `prefers-reduced-motion` disables these transitions. The desktop sidebar collapse preference remains unchanged and does not determine whether the narrow-screen drawer can open.

## Component boundaries

- `AdminApp` owns two transient UI states: the selected compact pane and whether the article drawer is open.
- `ResponsiveWorkspaceControls` renders only the compact workspace controls and their accessible state. It receives callbacks and contains no article data.
- `ArticleSidebar` remains the single article-list implementation. `AdminApp` wraps its existing callbacks so a successful navigation intent also closes the drawer and returns the compact pane to the editor.
- CSS media queries control when the toolbar, pane switching, docked sidebar, drawer, and backdrop participate in layout.

## Accessibility

- The compact toolbar is labelled “窄屏工作区”.
- “编辑 / 预览” use `aria-pressed`; “文章” uses `aria-expanded` and `aria-controls`.
- Escape closes the drawer.
- The backdrop is a real button labelled “关闭文章列表”.
- The drawer remains an `aside` labelled “文章列表”; no duplicate navigation is rendered.
- All controls retain at least a 44px touch target below 760px and visible keyboard focus.

## Responsive contract

- `> 980px`: toolbar hidden; sidebar, source, and preview use the existing desktop grid.
- `761–980px`: toolbar spans the grid; sidebar remains docked; only the selected source/preview pane is shown.
- `<= 760px`: toolbar spans one column; selected source/preview pane fills the workspace; sidebar becomes a fixed drawer with a backdrop.
- No supported viewport may introduce horizontal page overflow.

## Verification

Automated tests cover the control contract, pane switching state, drawer open/close behavior, article-selection close behavior, and CSS breakpoint rules. Browser UAT covers 1098×801, 980×801, 760×801, and 560×801, including keyboard Escape, backdrop dismissal, article selection, transitions, and horizontal overflow.
