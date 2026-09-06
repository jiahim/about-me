# Admin UI architecture

Last verified: 2026-09-05

## Ownership boundaries

- `apps/admin/src/components/ui/` owns the checked-in shadcn/Radix primitives. Business components import primitives from this directory and do not recreate focus traps, overlays, menus, tabs, selects, or confirmation dialogs.
- `apps/admin/src/components/shell/` owns the global header, workspace mode switch, overflow actions, and theme selection.
- `apps/admin/src/components/settings/forms/` owns one typed form per configuration group. Domain mutations remain in `apps/admin/src/lib/settings/`.
- `apps/admin/src/components/settings-preview/` owns preview controls and rendering. The iframe protocol and origin checks remain in `apps/admin/src/lib/settings-preview/`; the public projection and message parsers remain in `@jiahim/site-schema`.
- Article components keep editing and Git state in `AdminApp`; their presentation composes the shared primitives without moving the existing API contracts.

## Primitive and variant rules

`Button` is the only general action surface. Use `default` for the single primary action, `secondary` for a selected local mode, `outline` for neutral actions, `ghost` for low-emphasis/icon actions, `destructive` for confirmed destructive actions, and `link` only for navigation. Icon-only buttons require an accessible name.

Use `Dialog` for bounded decisions and forms, `AlertDialog` for destructive confirmation, `Sheet` for edge panels and full-screen narrow layouts, `Tabs` for mutually exclusive views, and `Select` for controlled enumerations. `Card`, `Badge`, `Field`, `Input`, `Textarea`, `Checkbox`, and `Switch` provide the visual and accessible form language. Sonner is mounted once at the root.

## Tokens and themes

All primitives consume semantic variables from `apps/admin/src/app/globals.css`: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `warning`, `border`, `input`, and `ring`. Warm paper and forest green are brand choices expressed through these tokens. Components must not introduce a second generic button or dialog class system.

Theme selection is `system | light | dark`, persisted by `next-themes`. The root layout suppresses only the expected class hydration difference. New color values need both light and dark token definitions and must meet readable contrast in their actual surface context.

## Layout and responsive contracts

- The global top bar keeps Save and the next workflow action visible; secondary actions may move into the overflow menu.
- Article mode preserves one article list, one editor, and one preview. At compact widths the existing source/preview switch and article drawer change visibility without duplicating state.
- Settings mode preserves sidebar, form, and inspector. The form/preview separator is keyboard operable (Arrow Left/Right), has a named separator role, and uses stable DOM ownership so typing never loses focus during resize or preview refresh.
- The settings preview defaults to focused-module mode. It supports full page, responsive/1280/768/390 widths, fit/75/100/125 zoom, two-axis scrolling, and a full-screen Sheet.

## Preview security contract

The iframe is a complete real VitePress page, not copied markup. It uses `sandbox="allow-scripts allow-same-origin"`, `referrerPolicy="strict-origin"`, and an exact `frame-src` origin. Development allows loopback or RFC 1918 HTTP LAN addresses; production requires HTTPS.

The VitePress bridge activates only in development with the preview query, a session ID, an allow-listed referrer origin, and exact `event.source`. Messages are schema parsed and versioned. The projection is render-only: repository paths and environment values are never sent. Analytics is absent from serve configuration, Giscus does not mount in preview mode, and the production build scans for bridge markers.

## Change and review checklist

1. Add or update a behavior test before changing an interaction.
2. Keep domain and network callbacks stable while migrating presentation.
3. Check keyboard activation, focus entry/return, Escape, accessible names, narrow widths, and dark mode in the rendered product.
4. Run the Admin test suite, typecheck, both production builds when cross-layer behavior changes, the legacy-class scan, and the production preview-leak scan.
5. Record real-product UAT observations separately; automated checks do not replace rendered verification.
