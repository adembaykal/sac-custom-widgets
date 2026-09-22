# Hierarchy Pulse

Hierarchy Pulse is a technical prototype and reference example for visualizing a native SAP BW hierarchy in an SAP Analytics Cloud Custom Widget.

The widget reads the hierarchy directly from the SAC data binding and reconstructs the hierarchy from the native parent child relationships supplied by BW. It is designed for **BW Live** scenarios.

## Status

**Version:** 1.0.0  
**Release status:** Golden Build / release candidate validated against the current BW Live test scenario

Hierarchy Pulse is a technical prototype and reference implementation. It is not an SAP product and does not represent an SAP product commitment.

## What it demonstrates

Hierarchy Pulse demonstrates how an SAC Custom Widget can consume and visualize a native BW hierarchy using binding information such as:

- `id`
- `label`
- `parentId`
- `isNode`
- `isCollapsed`

Hierarchy levels are **not inferred from labels or member names**. Structural relationships are derived from the hierarchy information delivered in the binding.

A key BW Live behavior handled by the widget is that `parentId` may be present on one occurrence of a hierarchy member but omitted on repeated rows for other time periods. Hierarchy Pulse therefore builds one canonical hierarchy relationship map from the complete binding before applying period values.

## Supported scenario

Hierarchy Pulse is intentionally focused on:

- SAP Analytics Cloud Custom Widgets
- SAP BW Live data
- native BW hierarchies
- period aligned year over year variance analysis

It does **not** target acquired models or planning models.

## Data binding

The widget defines one binding named `hierarchyData` with three feeds:

| Feed | Type | Purpose |
| --- | --- | --- |
| `measures` | Main Structure Member | KPI measure, one or more measures supported |
| `time` | Dimension | Calendar Year, Calendar Year/Month, or Day for period aligned comparison |
| `hierarchy` | Dimension | Native BW hierarchy dimension |

The current BW reference scenario uses:

- Hierarchy dimension: Product
- BW metadata ID: `ZSH_PR`
- Hierarchy: Germany

## Interaction

The current 1.0.0 build includes:

- native parent child hierarchy reconstruction
- sibling sorting by absolute variance without changing hierarchy relationships
- branch selection and inspector
- direct branch and direct product contribution tables
- favorable and adverse variance semantics
- KPI direction modes: Auto, Higher is better, Lower is better, Neutral
- smooth expand and collapse transitions
- animation on/off control
- replay
- reset
- zoom, pan and fit
- native currency or unit display from the binding
- SAC filter context awareness

## Inspector behavior

The inspector distinguishes between structural hierarchy nodes and leaf members.

When the selected node has direct hierarchy node children, the table is shown as **Branches**.

When the selected node has direct leaf members, the table is shown as **Products**.

Examples from the reference hierarchy:

```text
Germany
└── IT Division
    ├── Home
    │   ├── PC
    │   ├── Software Tools
    │   ├── Mouse
    │   ├── Keyboards
    │   └── Printers
    └── Business
        ├── Software
        │   ├── MS Office
        │   │   └── WORD_SH
        │   ├── OS
        │   └── Other
        ├── Monitors
        ├── Mobile
        └── Printers
```

Leaf members remain inspector details and are not forced into the main tree as large cards.

## KPI direction

Available modes:

- **Auto**
- **Higher is better**
- **Lower is better**
- **Neutral**

Auto uses available measure metadata and description signals. Arrow direction remains mathematical:

- `▲` increase
- `▼` decrease

Color expresses business evaluation where a direction can be determined.

## Installation

The repository contains the two files required by the SAC widget package:

- `hierarchy-pulse.json`
- `main.js`

Create a ZIP with those two files at the ZIP root, then import that ZIP as the Custom Widget package into SAP Analytics Cloud.

Example on macOS or Linux:

```bash
zip hierarchy-pulse.zip hierarchy-pulse.json main.js
```

Example in PowerShell:

```powershell
Compress-Archive -Path hierarchy-pulse.json,main.js -DestinationPath hierarchy-pulse.zip -Force
```

Then:

1. Import the ZIP as a Custom Widget package into SAP Analytics Cloud.
2. Add Hierarchy Pulse to a story.
3. Bind a KPI measure, a supported time dimension, and the BW hierarchy dimension.
4. For deep product inspection, expose the required hierarchy depth in the SAC binding and keep parent levels included.

Exact administration labels can vary by SAC release and tenant configuration.

## Repository layout

```text
hierarchy-pulse/
├── README.md
├── CHANGELOG.md
├── .gitignore
├── hierarchy-pulse.json
├── main.js
└── docs/
    ├── ARCHITECTURE.md
    ├── TEST-CHECKLIST.md
```

## Development principles

The 1.0 implementation follows a deliberately conservative approach:

- BW `parentId` relationships are authoritative.
- No hierarchy level is derived from a label or member name.
- Existing SAC and BW query context remains authoritative for the data supplied to the widget.
- Aggregate or result rows must not be mixed into normal hierarchy member aggregation.
- UI state such as selection, collapse state and viewport should not be changed by animation toggles or replay.
- Changes after 1.0 should be localized and regression tested against the BW Live hierarchy scenario.

## Known boundaries

- BW Live only
- no acquired model support
- no planning model support
- behavior depends on the hierarchy depth and rows exposed by the SAC binding
- this repository contains no backend service and no external runtime dependency

## Release package

The SAC import package consists only of:

- `hierarchy-pulse.json`
- `main.js`

Create the ZIP as described in the Installation section, with both files at the ZIP root.

## Disclaimer

Hierarchy Pulse is an independent technical prototype and reference example. It is not an official SAP product, not an SAP supported deliverable, and does not imply future product functionality or commitments.