# Hierarchy SHIFT

Hierarchy SHIFT is a controller-focused **what-if prototype** for SAP Analytics Cloud that works with **SAP BW Live hierarchy data**.

It lets users locally restructure the hierarchy delivered to the custom widget, explore the resulting KPI impact, compare scenarios, and export the current analysis without changing the productive SAP BW hierarchy.

> **Prototype only. No SAP BW writeback.** Hierarchy SHIFT is a community learning asset and technical reference, not an enterprise hierarchy-maintenance solution.


## Status

**Version:** 0.8.4  
**Release status:** Community prototype

Hierarchy SHIFT is an independent technical prototype and reference implementation. It is not an SAP product, not an SAP supported deliverable, and does not represent an SAP product commitment.

## Main purpose

The primary reason for publishing Hierarchy SHIFT is to make the implementation available for learning and experimentation with SAP BW Live hierarchies in SAC Custom Widgets.

The controller scenario is deliberately simple:

1. Read the hierarchy and KPI context delivered by SAC from SAP BW Live.
2. Restructure one or more hierarchy nodes locally inside SHIFT.
3. Explore the resulting KPI impact.
4. Compare, save, load, and export local scenarios.
5. Keep the source SAP BW hierarchy unchanged.

## What it demonstrates

Hierarchy SHIFT demonstrates how a custom widget can work with hierarchy information supplied through the SAC data binding, including hierarchy member IDs, labels, parent relationships, structural nodes, and KPI values.

The widget reconstructs a usable hierarchy from the complete current binding. This is important for BW Live result sets where structural information such as `parentId` may not be present on every repeated result row.

## Features

The current 0.8.4 build includes:

- Graphical hierarchy view
- Compact hierarchy view
- horizontal and vertical graphical layouts
- drag and drop hierarchy restructuring
- multi-select and grouped moves
- `Ctrl` / `Cmd` multi-selection
- Compact View checkboxes
- hierarchy search within the loaded result set
- Focus on subtree
- Show to level X
- Expand all / Collapse all
- Zoom, Fit, and background pan
- edge auto-scroll while dragging in Compact and Graphical views
- live move preview
- cumulative scenario KPI impact
- Before vs Scenario impact
- Changed Only view
- Scenario Summary
- Move History
- Undo and Reset
- Reset branch
- local scenario save / load
- scenario name and description
- JSON scenario import / export
- Scenario A vs Scenario B comparison
- Excel export
  - Current View
  - Scenario Analysis
- Technical Mode for troubleshooting hierarchy data
- Dark Mode
- adjustable UI scale
- sticky Compact View context and table header
- keyboard navigation in Compact View
- no SAP BW writeback

## Important behavior in 0.8.4

A normal SAC story refresh always starts from the newly loaded **SAP BW baseline hierarchy**.

The transient working scenario is intentionally not restored automatically after refresh. Saved SHIFT scenarios remain available locally and are applied only after an explicit **Load** action.

## Data binding

The widget defines one binding named `hierarchyData` with three feeds:

| Feed | Type | Purpose |
| --- | --- | --- |
| `measures` | Main Structure Member | KPI measure |
| `time` | Dimension | Current SAC time context |
| `hierarchy` | Dimension | SAP BW hierarchy dimension |

SHIFT follows the current SAC data and filter context delivered to the widget.

## Installation

A ready-to-import SAC Custom Widget package is included:

- `hierarchy-shift.zip`

The ZIP contains the two required widget files at its root:

- `hierarchy-shift.json`
- `main.js`

Import `hierarchy-shift.zip` into SAP Analytics Cloud as a Custom Widget package, add it to a story, and bind the KPI, time dimension, and BW hierarchy dimension.

Exact administration labels can vary by SAC release and tenant configuration.

## Excel export

The Excel export contains two worksheets:

### Current View

Represents the current Compact hierarchy context shown by SHIFT.

### Scenario Analysis

Adds the baseline vs scenario structure and KPI comparison, including baseline parent, scenario parent, baseline KPI, scenario KPI, delta, and unit.

## Technical Mode

Technical Mode is intended for testing and troubleshooting. For the selected hierarchy member it exposes information such as:

- label
- technical member ID
- BW baseline parent
- current scenario parent
- baseline and current hierarchy level
- branch / leaf state
- loaded child count
- value source
- direct KPI value where available
- baseline KPI
- scenario delta
- scenario KPI

## Known boundaries

Hierarchy SHIFT is intentionally a prototype.

- It is designed around SAP BW Live hierarchy data delivered to an SAC Custom Widget.
- It is not a hierarchy maintenance tool.
- It does not write hierarchy changes back to SAP BW.
- It does not change SAP BW master data.
- It is not a replacement for BW hierarchy modeling.
- It is not an SAC Planning simulation engine.
- It was not designed to render enormous enterprise hierarchies with tens of thousands of visible nodes at once.
- Search operates on hierarchy members already delivered to the widget.
- Focus, Level Limit, Collapse, and Compact View are the intended ways to work with larger structures.
- KPI impact logic is most intuitive for additive measures. Complex calculated key figures, ratios, exception aggregation, averages, or other non-additive semantics may require additional validation.
- Local scenario storage is browser-local. JSON export/import can be used to share or archive scenarios.
- Behavior depends on the hierarchy members, depth, and rows exposed by the current SAC data binding.

## Repository layout

```text
hierarchy-shift/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── hierarchy-shift.json
├── main.js
├── hierarchy-shift.zip
└── docs/
    ├── ARCHITECTURE.md
    ├── TEST-CHECKLIST.md
    └── BUGFIX-TEST-v0.8.4.txt
```

## Community use

Download it. Take it apart. Break it. Extend it. Replace pieces of it. Build something different on top of it.

That is the point of publishing the source.

**From the community, for the community.**

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

Hierarchy SHIFT is an independent community prototype and learning asset. It is not an official SAP product, not an SAP supported component, and does not imply current or future SAP product functionality, availability, or commitments.

SAP, SAP Analytics Cloud, SAP BW, and related product names are trademarks or registered trademarks of SAP SE or its affiliates.