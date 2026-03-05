Here is the full design plan:

Plan: Frontend Dashboard — Information Architecture
TL;DR: 4-page Next.js app (App Router + shadcn/ui + Recharts + Supabase). Clean professional white design, aviation-blue accents, amber/gold reserved exclusively for CRJ opportunity highlights. The data is already in v_flights_enriched — we just need to query it smartly.

App Shell (every page)
Sidebar navigation — MHIRJ logo, 4 nav items, clean & corporate
Global date range picker (top right) — defaults to last 30 days, persists via URL params
Footer — "Data source: AeroDataBox · Updated daily"
Page 1: Dashboard / — Command Center
"What's happening at YYZ right now?"

4 KPI Cards (top row):

Card	Value	Source
Total Departures	75,857	COUNT(*)
Airlines Operating	42	COUNT(DISTINCT airline_name)
Unique Routes	180+	COUNT(DISTINCT route_code)
CRJ Fleet Share	7.3%	is_crj / total
Charts row 1:

Aircraft Category Donut — CRJ / Regional Jet / Narrowbody / Widebody / Turboprop (the visual that tells the whole story at a glance)
Daily Flight Volume Trend — line chart, Jan → today, colored by category (stacked area)
Charts row 2:

Top 10 Routes by Frequency — horizontal bar chart, colored by dominant aircraft category on that route
Page 2: Airport Intelligence /routes — YYZ Deep Dive
"Who flies where, how often, and how punctually?"

Top section — Airline Performance Table:

Column	Data
Airline	airline_name
Total Flights	count
Routes Served	distinct route_codes
Avg Delay (min)	avg dep_delay_min
On-Time %	% where dep_delay_min ≤ 15
Top Aircraft	mode(aircraft_model)
Charts:

Top 20 Routes — horizontal bar with avg block time overlaid as a line
Day-of-Week Heatmap — 7 columns (Mon–Sun) × 4 rows (week buckets) showing flight volume intensity
Monthly Volume by Category — stacked bar chart (Jan / Feb / Mar), each bar segment = aircraft category color
Page 3: Fleet Analysis /fleet — What's Flying
"The competitive landscape at a glance."

Top section:

Category Breakdown Cards — one card per category with icon, count, and top model name
Pie/Donut chart (large, center of page)
Airline × Aircraft Category Matrix:
A heatmap-style table — airlines on Y axis, categories on X axis, cell = flight count. This visually shows which airlines are heaviest Embraer or turboprop users — MHIRJ's target list.

Top Aircraft Models Table:

Model	Category	Airlines Using	Flights	% of Total
Boeing 737-800	Narrowbody	4	6,976	9.2%
Airbus A220-300	Narrowbody	2	6,289	8.3%
Embraer 175	Regional Jet	3	5,990	7.9%
Canadair CRJ 900	CRJ	2	4,266	5.6%
…				
Page 4: CRJ Opportunity /opportunity — 💰 The Gold Mine
"Here's your sales pitch with data."

This page is styled differently — gold/amber accents, a hero banner that says "Routes Where CRJ Wins"

Hero KPI Strip (amber background):

Turboprop routes operated from YYZ (direct upgrade targets)
Embraer E-series routes (displacement targets)
Combined "Addressable Routes" count
Estimated annual flights in the opportunity pool
Airline Scorecard (the centerpiece):
One card per airline, sorted by "Opportunity Score" (highest first):

Opportunity Route Table (below scorecards):

Route	Airline	Current Aircraft	Flights/Mo	Avg Block (min)	Why CRJ Wins
YYZ-YOW	Air Canada	Embraer 175	1,100	70	Same range, CRJ 900 = more payload flex
YYZ-YTS	Air Canada	Dash 8 Q400	150	93	Jet speed, pressurized, higher comfort
YYZ-YSB	Air Canada	Dash 8 Q400	150	69	Same route, 50% faster block time
The "Why CRJ Wins" column is static text (manually authored per route type) mapped by a simple rule: turboprop → "Jet speed + passenger comfort + pressurization"; E-175 → "CRJ 900 competitive on range + comparable capacity".

Design System
Element	Decision
Primary color	Aviation blue #003DA5
Opportunity highlight	Amber #F59E0B (only on page 4)
Charts neutral	Gray #6B7280
CRJ brand color	MHIRJ red #C8102E (accent only)
Font	Inter (already in Tailwind)
Cards	shadcn/ui Card with subtle shadow
Tables	shadcn/ui DataTable with sorting
Charts	Recharts (BarChart, AreaChart, PieChart, heatmap via custom cells)
Data Architecture (Next.js)
Server Components fetch data at request time from Supabase (no API routes needed for read-only queries)
Client Components only for: date range picker, sortable tables, interactive chart tooltips
lib/supabase.ts — one Supabase server client, reused across all pages
lib/queries.ts — all SQL queries as typed functions (e.g., getAircraftCategoryBreakdown(from, to))
Environment: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (read-only, RLS-protected)
Step-by-Step Build Order
Phase 1 — Scaffold (parallel)

npx create-next-app frontend with TypeScript + Tailwind
Install shadcn/ui, Recharts, Supabase client
Create sidebar layout + navigation shell
Wire Supabase client with env vars
Phase 2 — Pages (sequential, each depends on layout)

Page 1: Dashboard (KPI cards + category donut + trend line) — validates data pipeline end-to-end
Page 2: Airport Intelligence (airline table + route bar chart + day heatmap)
Page 3: Fleet Analysis (matrix + top models table)
Page 4: CRJ Opportunity (scorecards + route table) — most important, save for last so design is locked
Phase 3 — Polish

Global date range filter (URL state)
Mobile responsiveness pass
Deploy to Vercel with Supabase env vars
Relevant files to create

frontend — root (empty now, scaffold here)
frontend/lib/supabase.ts — Supabase client
frontend/lib/queries.ts — all typed data-fetch functions for v_flights_enriched
frontend/app/layout.tsx — sidebar shell
frontend/app/page.tsx — Dashboard
frontend/app/routes/page.tsx — Airport Intelligence
frontend/app/fleet/page.tsx — Fleet Analysis
frontend/app/opportunity/page.tsx — CRJ Opportunity
Further Considerations

RLS / public access: v_flights_enriched currently only allows service_role. For the frontend (anon key), we need to either add an authenticated or anon read policy, or proxy all queries through a Next.js Server Component (which never exposes keys to the client). Recommendation: use Next.js Server Components exclusively for data fetching — no client-side Supabase calls — so only the server-side client touches the DB with the service_role key via SUPABASE_SERVICE_ROLE_KEY (never exposed to browser).

"Why CRJ Wins" column: This is sales copy, not computed data. Suggest a small config map in code (opportunity-copy.ts) of route_code → reason that can be easily edited, rather than storing it in the DB.

Auth: Since audience is external stakeholders, do you want a password-protected page (simple Next.js middleware + env var secret) or fully open? Recommend at minimum a single shared passphrase until Phase 3.