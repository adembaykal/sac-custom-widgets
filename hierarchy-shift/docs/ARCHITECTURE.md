# Hierarchy SHIFT Architecture Notes

## Scope

Hierarchy SHIFT is a browser-side SAP Analytics Cloud Custom Widget prototype. It has no backend service and performs no SAP BW writeback.

## Input

The `hierarchyData` binding receives:

- KPI measure data
- time dimension context
- SAP BW hierarchy dimension data

The widget uses the current result set delivered by SAC. It does not independently query SAP BW.

## Hierarchy reconstruction

SHIFT builds a hierarchy model from the complete current binding rather than relying on one individual result row to contain all structural metadata.

The implementation maintains indexed structures for parent, children, depth, and root traversal so interaction does not repeatedly scan the full node collection.

## Baseline and scenario

The SAP BW hierarchy delivered by SAC is treated as the baseline.

Scenario moves are local browser-side structural changes. The current scenario parent map and local scenario KPI deltas are maintained separately from the baseline parent map.

There is no BW hierarchy update and no master data writeback.

## KPI impact

For a moved branch, SHIFT transfers the branch scenario value from the old ancestor chain to the new ancestor chain. Shared ancestors naturally cancel.

This model is most intuitive for additive KPIs. Non-additive KPI semantics require additional validation.

## Rendering

Two views share the same scenario state:

- Graphical View
- Compact View

Navigation support includes Search, Focus on subtree, Level Limit, Collapse, Graphical pan, edge auto-scroll during drag, and windowed Compact rendering for larger visible row sets.

## Scenario persistence

Saved scenarios are stored locally in browser storage with an in-memory fallback. JSON export/import provides a portable representation.

Since version 0.8.4, the active transient working scenario is intentionally not restored on a normal SAC story refresh. Refresh starts from the newly loaded SAP BW baseline. A saved scenario changes the hierarchy only after explicit Load.

## Excel export

The widget creates a client-side `.xlsx` file without an external runtime dependency.

- `Current View` represents the current visible Compact hierarchy context.
- `Scenario Analysis` contains baseline and scenario structure / KPI comparison.

## Prototype boundary

This architecture is intentionally optimized for learning, experimentation, and focused controller what-if analysis. It is not positioned as an enterprise hierarchy management platform.