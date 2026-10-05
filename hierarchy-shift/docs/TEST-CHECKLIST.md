# Hierarchy SHIFT Test Checklist

## Binding

- [ ] Widget loads with a valid SAP BW Live hierarchy binding.
- [ ] KPI values and unit display match the current SAC context.
- [ ] Baseline parent/child relationships render as expected for the test hierarchy.

## Graphical View

- [ ] Horizontal layout renders correctly.
- [ ] Vertical layout renders correctly.
- [ ] Zoom in/out works.
- [ ] Fit works.
- [ ] Background drag-to-pan works.
- [ ] Expand/collapse works.
- [ ] Node drag/drop works.
- [ ] Node drag edge auto-scroll works top, bottom, left, and right.

## Compact View

- [ ] Sticky Context remains visible while scrolling.
- [ ] Sticky table header remains visible while scrolling.
- [ ] Row indentation reflects hierarchy depth.
- [ ] Expand/collapse works.
- [ ] Drag edge auto-scroll works.
- [ ] Scroll position is preserved where expected.

## Navigation

- [ ] Search locates nodes within the loaded hierarchy.
- [ ] Focus on subtree works.
- [ ] Full hierarchy restores the complete scope.
- [ ] Show to level X works.
- [ ] Changed Only works after scenario changes.

## Move logic

- [ ] Valid move updates structure and KPI impact.
- [ ] Root cannot be moved.
- [ ] Cycles are blocked.
- [ ] Source cannot be moved under itself.
- [ ] Current parent is excluded as a target.
- [ ] Move Preview shows expected impact.
- [ ] Move-to Search works.
- [ ] Undo restores the previous scenario state.
- [ ] Reset returns to SAP BW baseline.
- [ ] Reset branch behaves as expected.

## Multi-select

- [ ] Ctrl/Cmd click adds/removes selections.
- [ ] Compact View checkbox selection works.
- [ ] Invalid parent+descendant combinations are rejected.
- [ ] Group move uses one target and grouped KPI preview.
- [ ] Group move appears as one logical History action.
- [ ] Undo reverses the grouped action.

## Scenarios

- [ ] Save Scenario stores name, description, structure and deltas.
- [ ] Refresh does not restore the transient working scenario.
- [ ] Saved scenarios remain available after refresh.
- [ ] Saved scenario affects the hierarchy only after explicit Load.
- [ ] Scenario JSON export/import works.
- [ ] Scenario A vs B comparison works for matching data context.

## Excel

- [ ] Export creates a valid `.xlsx` file.
- [ ] Current View worksheet reflects current SHIFT table context.
- [ ] Scenario Analysis shows baseline/scenario parent and KPI fields.
- [ ] Formatting, number formats, indentation, freeze panes, and highlights render correctly in Excel.

## Technical / UI

- [ ] Technical Mode displays expected selected-node information.
- [ ] Copy Technical Info works.
- [ ] Dark Mode maintains strong contrast.
- [ ] No light text on light backgrounds.
- [ ] No dark text on dark backgrounds.
- [ ] No light-grey text is introduced.
- [ ] UI scale persists locally and affects the intended content areas.

## Regression

- [ ] No SAP BW writeback occurs.
- [ ] No scenario changes survive refresh unless a saved scenario is explicitly loaded.
- [ ] SAC filter changes cause a clean binding reload.