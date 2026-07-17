# Project Context

## Project Overview
A decentralized exchange (DEX) web application built on the Binance Smart Chain (BSC) for trading BEP-20 tokens. Features include token swapping, currency conversion with fixed fees (no slippage/spread), deposit/withdraw with multiple payment methods including "بريدي موب" (Barid Mob), admin/sub-admin management, and wallet connection. Arabic RTL interface with dark theme.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-03-23 | Project initialized as DEX on BSC | Alex | User requirement for BSC token swap site |
| 2026-05-12 | Added BSC Token to converter | Alex | Expand trading pairs |
| 2026-05-12 | Added wallet connection feature | Alex | Enable user interaction with BSC |
| 2026-05-12 | Implemented fixed fee system | Alex | Replace percentage-based fees with flat fees |
| 2026-05-12 | Removed slippage and crypto fees | Alex | User requested no slippage/fees on token swap |
| 2026-05-12 | Added "بريدي موب" payment method | Alex | User requested Algerian Barid Mob payment support |

## Constraints
- Dark theme with amber/gold accent colors
- Arabic RTL (right-to-left) interface throughout
- No slippage on token swaps
- No buyTax/sellTax fees in smart contract
- No spread on currency conversion (SPREAD = 0)
- Fixed fee system for currency conversion ($2 default)
- "بريدي موب" (Barid Mob) supported in deposit, withdraw, and banks pages
- Color palette: bg-[#0A0F1C] (primary dark), bg-[#1F2937] (card), border-[#374151], amber-400/500/600 (accent)
- Typography: System fonts, monospace for numbers/rates