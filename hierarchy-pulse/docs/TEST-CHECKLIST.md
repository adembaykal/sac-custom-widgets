# 1.0 Regression Test Checklist

Use this checklist before changing the Golden Build.

## Binding

- [ ] BW Live binding reaches `success`
- [ ] Measure feed resolves
- [ ] Time feed resolves
- [ ] Hierarchy feed resolves
- [ ] Native currency or unit is displayed
- [ ] SAC filters change the widget result without rebinding code changes

## Hierarchy

- [ ] Germany is the root in the reference scenario
- [ ] IT Division is a child of Germany
- [ ] Home and Business are children of IT Division
- [ ] Business children are displayed as branches, not products
- [ ] Software children are displayed as branches when they are structural nodes
- [ ] Monitors leaf members are displayed as products
- [ ] Mobile leaf members are displayed as products
- [ ] MS Office exposes WORD_SH as a product when present in the binding
- [ ] Software Tools exposes its direct leaf products when present
- [ ] hierarchy levels are not inferred from labels

## Inspector

- [ ] only one direct contribution table is shown
- [ ] Branch, Product or Member label matches the direct child type
- [ ] Prior, Current, Delta and Delta percent are shown correctly
- [ ] no duplicated lower detail panel appears

## Sorting

- [ ] children remain under their original parent
- [ ] siblings are sorted by absolute delta descending

## Interaction

- [ ] selection works
- [ ] expand works
- [ ] collapse works
- [ ] collapse does not move nodes to another parent
- [ ] animation toggle does not change selection
- [ ] animation toggle does not change collapsed state
- [ ] animation toggle does not change zoom or pan
- [ ] replay does not change collapsed state or viewport
- [ ] reset works
- [ ] zoom in works
- [ ] zoom out works
- [ ] pan works
- [ ] fit works

## Visual

- [ ] no Hierarchy Overview bar is shown
- [ ] corporate clean white and blue visual language is preserved
- [ ] favorable and adverse colors remain distinguishable
- [ ] selected node remains visibly highlighted
- [ ] typography remains readable at the default widget size

## Packaging

- [ ] `hierarchy-pulse.json` parses as JSON
- [ ] `node --check main.js` succeeds
- [ ] JSON and JavaScript report the same version
- [ ] release ZIP contains only `hierarchy-pulse.json` and `main.js`
- [ ] no diagnostic binding dump is included
- [ ] no credentials, tenant URLs, customer data or internal system identifiers are included