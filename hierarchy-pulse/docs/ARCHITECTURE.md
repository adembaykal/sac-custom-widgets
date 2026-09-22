# Architecture

## Purpose

Hierarchy Pulse is a client side SAP Analytics Cloud Custom Widget for a native SAP BW hierarchy. It consumes the SAC binding result set and turns the hierarchy and period values into a variance oriented tree visualization.

## Runtime model

The widget has no backend and no external runtime dependency. The runtime path is:

```text
SAC data binding
    ↓
metadata and feed resolution
    ↓
row normalization
    ↓
canonical BW hierarchy reconstruction
    ↓
period value maps
    ↓
variance and polarity calculation
    ↓
visible tree layout
    ↓
inspector and interaction rendering
```

## Canonical hierarchy reconstruction

The hierarchy is reconstructed from BW hierarchy evidence, primarily `parentId`.

A significant behavior observed in the BW Live binding is that repeated occurrences of the same hierarchy member across time do not necessarily repeat `parentId` on every row. The implementation therefore builds one canonical structure from all rows before applying current and prior period values.

The implementation does not derive hierarchy depth from labels or member names.

## Structural nodes and leaf members

`isNode === true` identifies a structural hierarchy node when the binding exposes that flag.

Rows without the node flag can represent leaf members. Direct leaf relations are kept parent aware so the inspector can show products under the selected node even when the same member ID can occur in more than one hierarchy context.

The main tree focuses on structural nodes. Leaf members are presented in the inspector.

## Time and values

Time and hierarchy are separate feeds. The widget builds period aligned current and prior value maps from the rows supplied by SAC/BW.

Aggregate, result and total rows are excluded from normal member processing so they are not counted as ordinary hierarchy members.

The widget does not mutate the SAC query or filter context.

## Variance semantics

For every visible node the widget derives:

- prior value
- current value
- absolute delta
- percentage delta where a prior denominator is available

The arrow reflects mathematical movement. Favorable or adverse color semantics depend on the selected KPI direction mode.

## UI state

The following states are maintained independently from data reconstruction:

- selected node
- collapsed nodes
- zoom
- pan position
- fit state
- layout direction (left to right or top to bottom)
- animation state

Layout direction changes only node positioning and connection routing. It does not change BW parent child relationships, sorting, values, or inspector semantics.

Animation and replay are visual controls and should not rewrite the user's hierarchy or viewport state.