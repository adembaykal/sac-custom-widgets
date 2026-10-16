# PERFORMANCE SKYLINE: Release test checklist

Use this checklist after importing the widget or changing its code. Tests marked with a checkbox require a live SAC Story.

## Install and lifecycle

- [ ] `skyline.json` is accepted and `skyline.zip` uploads as the widget resource archive.
- [ ] The widget can be inserted into a new Story.
- [ ] The footer reports version 0.3.0.
- [ ] The regular saved Story **View** mode loads without errors.
- [ ] A reload does not lose the widget or its binding.
- [ ] The widget resizes when the Story canvas or widget geometry changes.

## BW Live binding

- [ ] Bind one BW daily date dimension, such as `0CALDAY`.
- [ ] Bind an additive revenue or cost measure and compare totals with SAC or BW results for the exact displayed dates.
- [ ] Confirm the displayed unit or currency comes from the binding and is consistent across rows.
- [ ] Bind two different measures and verify the MEASURE dropdown is visible.
- [ ] Select the other measure and verify the KPI cards, bars, tooltips and Day Spotlight all update.
- [ ] Confirm the date window stays fixed while switching measures.
- [ ] Confirm a single bound measure does not show an unnecessary dropdown.
- [ ] Test a day with an explicit zero and a day not returned by the binding; they must remain distinguishable.
- [ ] Test signed or negative values and reconcile net totals.
- [ ] A mixed-currency result is rejected or clearly flagged rather than shown under a misleading unit.
- [ ] Non-daily time dimensions (such as year or calendar month only) are rejected rather than spread across invented days.

## Interactions

- [ ] 2D heatmap is readable, including weekday and month labels.
- [ ] 3D view animates from 2D, and vice versa.
- [ ] Drag rotates 3D without opening Day Spotlight.
- [ ] Double-click resets the camera angle.
- [ ] Hover displays date, measure, value and unit where provided.
- [ ] Click and tap open Day Spotlight on the selected day.
- [ ] Spotlight rank and variance match the actual reported-day set.
- [ ] Spotlight closes via X, backdrop and Escape, with focus restored appropriately.
- [ ] Selecting a new measure while Spotlight is open does not leave stale values visible.
- [ ] 2025 and 2026 year guides stay aligned in both views when the window crosses 1 January.
- [ ] Palette changes leave labels readable.

## Known SAC URL distinction (observed on one tenant)

In the author's SAC environment, a special preview link including `preview=true` led to an SAC SDK initialization error: `Cannot read properties of undefined (reading 'requireWidgetClass')`. A normal saved Story link using `?mode=view` worked correctly. This was an **observed host-viewer difference**, not a proven widget defect or a guarantee for other SAC versions.

If you reproduce it, compare the saved Story's normal Edit and View paths before attributing the SDK error to this widget. Capture the browser console, SAC version, and request status of `/main.js` if escalation is needed.

## Release guardrails

- Keep the `main.js` inside ZIP byte-identical to the published source.
- Do not mix sample/demo data with live SAC binding data.
- Never claim that red or blue encodings represent target attainment without explicit target data.
- Do not infer causes of spikes or missing days from this visualization.
- Do not publish sensitive business data, internal tenant links, credentials, or customer information in screenshots or test artifacts.
