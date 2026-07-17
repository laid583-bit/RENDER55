# Architecture Design

## System Overview
A single-page application (SPA) built with React and TypeScript, using Vite as the build tool. The frontend communicates with a FastAPI backend for authentication and data management. The app follows a component-based architecture with page-level routing.

## Tech Stack
- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **Routing**: React Router DOM v6
- **State Management**: React Query (TanStack) + React Context
- **Charts**: Recharts
- **Backend**: Python FastAPI (separate service)
- **Package Manager**: pnpm

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Pages | Route-level page components | src/pages/Index.tsx, Token.tsx, Converter.tsx, Admin.tsx, Banks.tsx, Deposit.tsx, Withdraw.tsx, SubAdmins.tsx |
| Components | Reusable UI elements | src/components/Header.tsx, Navbar.tsx, SwapInterface.tsx, TokenInfo.tsx, WalletButton.tsx |
| Hooks | Custom React hooks | src/hooks/useWallet.ts |
| Lib | Utilities and API services | src/lib/rates-service.ts, converter-api.ts, auth.ts, config.ts |
| Contexts | Global state providers | src/contexts/ |
| API | Backend communication layer | src/api/ |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Framework | shadcn/ui + Tailwind | Consistent dark theme, RTL support, rapid development |
| Routing | React Router v6 | Standard SPA routing with nested routes |
| State | React Query + Context | Server state caching + local UI state |
| Currency Rates | Local fallback + API | Reliable rates even when API unavailable |
| Fee Model | Fixed fee ($2 default) | Simple, transparent pricing for users |
| Auth | FastAPI backend | Centralized user/role management |

## File Tree Plan
```
app/frontend/
├── src/
│   ├── App.tsx                 # Root component with routing
│   ├── main.tsx                # Entry point
│   ├── pages/
│   │   ├── Index.tsx           # Homepage/landing
│   │   ├── Token.tsx           # Token swap + info
│   │   ├── Converter.tsx       # Currency converter
│   │   ├── Admin.tsx           # Admin dashboard
│   │   ├── SubAdmins.tsx       # Sub-admin management
│   │   ├── Banks.tsx           # Payment methods listing
│   │   ├── Deposit.tsx         # Deposit interface
│   │   ├── Withdraw.tsx        # Withdrawal interface
│   │   ├── Profits.tsx         # Profits tracking
│   │   ├── History.tsx         # Transaction history
│   │   ├── AuthCallback.tsx    # OAuth callback
│   │   └── AuthError.tsx       # Auth error page
│   ├── components/
│   │   ├── Header.tsx          # App header with wallet
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── SwapInterface.tsx   # Token swap UI
│   │   ├── TokenInfo.tsx       # Token details display
│   │   ├── SmartContract.tsx   # Contract code viewer
│   │   ├── Tokenomics.tsx      # Token distribution chart
│   │   └── WalletButton.tsx    # Wallet connect button
│   ├── hooks/
│   │   └── useWallet.ts        # Wallet state management
│   ├── lib/
│   │   ├── rates-service.ts    # Currency rate calculations
│   │   ├── converter-api.ts    # Conversion API calls
│   │   ├── auth.ts             # Auth API calls
│   │   └── config.ts           # App configuration
│   └── contexts/               # React context providers
├── public/                     # Static assets
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

## Implementation Guide
1. All pages use dark theme (bg-[#0A0F1C]) with Arabic RTL direction
2. Currency conversion uses rates-service.ts with SPREAD=0 and fixed fees
3. Token swap has no slippage controls or fee deductions
4. Smart contract code displayed without buyTax/sellTax
5. Payment methods include بريدي موب in transfers category
6. Admin features require authentication via FastAPI backend
7. Wallet connection managed through useWallet hook