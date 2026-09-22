# Changelog

## 1.1.0

Adds selectable hierarchy orientation without changing BW hierarchy semantics.

### Added

- Left-to-right layout remains the default
- new Top-to-bottom layout option in the widget header
- orientation-aware node positioning and connection routing
- layout switching preserves selection, hierarchy state, KPI semantics, animation setting, and inspector behavior
- automatic fit after changing orientation

### Unchanged

- BW `parentId` relationships remain authoritative
- sibling sorting, expand/collapse, branch/product inspection, KPI polarity, native units, and SAC filter context remain unchanged

## 1.0.0

Initial frozen release candidate / Golden Build.

### Included

- BW Live native hierarchy reconstruction using real parent child relationships
- canonical hierarchy mapping across repeated time rows
- branch and leaf aware inspector
- direct product display for leaf members
- branch display for structural children
- single non duplicated inspector contribution table
- sibling sorting by absolute delta within each parent
- smooth expand and collapse transitions
- animation toggle and replay
- zoom, pan, fit and reset
- KPI polarity modes
- native unit and currency handling
- aggregate/result row protection
- SAC filter context support

### Final 1.0 fixes

- corrected classification of Business children as branches rather than products
- corrected display of leaf products below lower hierarchy nodes
- handled BW rows where `parentId` is omitted on repeated monthly occurrences
- handled members that can occur in different hierarchy contexts by keeping parent aware relationships
- removed duplicate inspector detail presentation
- removed the Hierarchy Overview bar from the final UI