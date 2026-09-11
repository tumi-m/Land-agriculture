---
description: Take screenshots and review them against the design spec
---
!`npm run shots 2>&1 | tail -20`

Open each new PNG in test-results/shots/. Compare it with section 5 of @docs/PLAN.md and list concrete defects: overlapping or clipped elements, controls covering the land, text under 4.5:1 contrast, touch targets under 44 px, misalignment. Order them by impact and propose fixes. Don't edit files.