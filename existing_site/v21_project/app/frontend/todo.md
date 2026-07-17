# TTB Exchange - Schema Fix Plan

## Changes Required (per مخطط ttb document)

### 1. Converter Page - Two Panel Layout (PART/1 & PART/2)
- PART/1 (right side): Source currency panel with amount input and "تحويل" button
- PART/2 (left side): Target currency panel showing converted result
- Arrow between panels showing conversion direction
- Fee amount converted and displayed in deposit currency (USD or EUR)

### 2. Currency Pair Pages (Template System)
- Route: /converter/:pair (e.g., /converter/XAU_USD)
- Each pair page uses same PART/1/PART/2 template
- Navigation from homepage rates table links to pair-specific pages

### 3. Expert Auto Converter
- Auto-deduct fixed fee per admin settings
- Show complete currency info (buy/sell prices)
- Start/Stop button
- Execute conversions based on admin parameters until stopped
- Show timeframe options (1min, 5min, 15min, 30min, 1hr, 4hr)

### 4. Admin - Deposit Currency Setting
- Add deposit_currency selector (USD or EUR) in fee settings
- Fee is converted to deposit currency before display

### Files to modify:
1. `src/pages/Converter.tsx` - Complete redesign with PART/1/PART/2 layout + Expert
2. `src/pages/Admin.tsx` - Add deposit currency config
3. `src/App.tsx` - Add dynamic pair route
4. `src/pages/Index.tsx` - Update links to pair-specific pages