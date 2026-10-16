# Changelog

## v0.3.0, 16 October 2026

**Community release, author-tested in SAP Analytics Cloud with SAP BW Live.**

- Multi-measure dropdown with stable calendar window and per-measure values and units.
- Day Spotlight with reported-day rank and signed difference from reported-day average.
- Spotlight support for clicks, touch, keyboard interaction, Escape and backdrop closing.
- Kept 2D / 3D morph, 3D orbit, year bands, blue palettes, and signed daily values.
- Updated the KPI labels for business use and made displayed week-column count dynamic.
- Strengthened currency and unit checks to reject mixed-unit aggregations.
- Added public documentation and standalone smoke tests. The previously tested `main.js` and `skyline.zip` are unchanged.

## v0.2.1

- Accurate year guides in both 2D and 3D, including year transitions inside calendar weeks.
- Removed the redundant `SAC DATA` label in normal bound-data mode.

## v0.2.0

- Repositioned the original Activity Skyline concept as a business performance visualization.
- Introduced a high-contrast executive-blue design, day-based KPI metrics and visible data units.
- Differentiated missing values, zero values, and signed values.
