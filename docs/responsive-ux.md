# Responsive UX strategy

Lead Flow uses the existing Tailwind breakpoints without extensions:

- Base styles target phones, including the 360 px and 390 px audit widths.
- `sm` (640 px) switches filter drawers to wrapping toolbars and restores compact desktop-sized controls.
- `md` (768 px) switches data-card lists to tables and the single-stage pipeline to the horizontally scrollable drag-and-drop board.
- `lg` (1024 px) switches the navigation drawer to the persistent, collapsible sidebar.
- `xl` progressively restores secondary table columns and multi-column detail layouts.

Shared patterns are implemented in `PageHeader`, `ResponsiveFilterPanel`, `Table`, `Dialog`, `AlertDialog`, and the dashboard shell. Mobile filtering keeps search visible and places secondary controls in a focus-managed bottom sheet with an active-filter count. Tables expose keyboard-focusable scroll regions, while information-dense lists use cards below `md` without duplicating their page implementation.

Touch controls use larger base sizes and return to compact sizing from `sm` upward. Dialog actions remain sticky above the mobile viewport edge and all overlays disable motion when reduced motion is requested. Pipeline cards retain pointer and keyboard drag sensors at tablet sizes, use an internal horizontal scroller to avoid page-scroll conflicts, and always provide menu-based stage movement. Phones use a single-stage view with the same non-drag action menu.
