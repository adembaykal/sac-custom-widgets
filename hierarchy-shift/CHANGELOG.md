# Changelog

## 0.8.4

Focused high-priority bugfix release.

### Fixed

- Normal SAC story refresh now starts from the fresh SAP BW hierarchy baseline instead of silently restoring the last transient working scenario.
- Saved SHIFT scenarios remain available but are applied only after an explicit Load action.
- Graphical View node drag-and-drop now auto-scrolls at the top, bottom, left, and right workspace edges.
- Compact View edge auto-scroll remains supported.

### Technical

- Disabled automatic application of the legacy transient `scenarioBookmarkState`.
- `supportsBookmark` is disabled for the transient working scenario in the manifest.
- Existing hierarchy reconstruction and scenario KPI calculation logic remains unchanged in this bugfix release.

## 0.8.3

- Refined header and product messaging.
- Clear controller-focused what-if prototype positioning.
- Clear SAP BW Live / SAP Analytics Cloud context and No BW Writeback statement.

## 0.8.2

- Added adjustable UI scaling from 85% to 120%.
- Added Compact, Default, and Large presets.
- Kept top action toolbar intentionally compact.

## 0.8.1

- Readability pass with larger hierarchy labels, KPI values, rows, graphical nodes, controls, and side-panel content.

## 0.8.0

- Added multi-select and grouped hierarchy moves.
- Added `Ctrl` / `Cmd` selection and Compact View checkboxes.
- Added grouped move preview and grouped Undo / History behavior.

## 0.7.0

- Added sticky Compact View hierarchy context.
- Added clear prototype / No BW Writeback positioning and Info dialog.
- Added hierarchy-focused animated branding.
- Added Dark Mode with strict high-contrast rules.

## 0.6.x

- Added formatted Excel export with Current View and Scenario Analysis worksheets.
- Added scenario naming and descriptions.
- Added Scenario A vs Scenario B comparison.
- Added move preview, move validation, history, keyboard navigation, and Technical Mode.

## 0.5.x

- Added Search, Focus on subtree, Show to level X, Move-to Search, Changed Only, Scenario Summary, branch reset, descendant counts, indexed hierarchy traversal, and windowed Compact rendering.
- Added Compact View drag edge auto-scroll.

## 0.4.x

- Added refined empty-state animation and branding.
- Added Graphical View background pan.
- Added robust reset behavior and cumulative scenario KPI deltas.

## 0.3.x

- Added local Scenario Manager with save, load, delete, JSON import/export, and scenario context state.

## 0.2.x

- Added Compact View, hierarchy branch styling, scroll preservation, and collapse fixes.

## 0.1.x

- Initial SAP BW Live hierarchy structural what-if prototype.