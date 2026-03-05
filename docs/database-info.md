Great data quality results:

75,857 total rows
aircraft_model: 74,492 / 75,857 = 98.2% coverage ✅
arr_airport_iata: 75,320 / 75,857 = 99.3% coverage ✅
arr_scheduled_utc: 71,573 / 75,857 = 94.4% coverage ✅
dep_revised_utc: 75,380 / 75,857 = 99.4% coverage ✅
Date range: 2025-12-31 to 2026-03-05 ✅
Now I'll pull the distinct aircraft models to see what we're working with.

Excellent! Now I have a clear picture of the aircraft models. Let me categorize them all:

CRJ (CRJ Series):

"Canadair CRJ 900" → CRJ (4266)
"Bombardier CRJ900" → CRJ (458)
"Canadair CRJ-701ER" → CRJ (384)
Need to see if there are more CRJ variants...
Turboprop:

"De Havilland Canada DHC-8-400 Dash 8Q" → Turboprop (535)

Still need to check for ATR, SF340, and other turboprop models.

Regional Jet:

"Embraer 175" → Regional Jet (5990)
"Embraer 195" → Regional Jet (4518)
"Embraer 170" → Regional Jet (2366)
"E295" → Regional Jet (812)
"Embraer 145" → Regional Jet (504)
"Embraer 195-E2" → Regional Jet (291)
Narrowbody: Now I'm mapping the major narrowbody aircraft — Boeing 737 variants dominate the dataset with the 737-800 leading at nearly 7000 flights, followed by the generic 737 designation and Airbus models like the A220-300, A320, and A321 all in the 5000-6000 range, with newer variants like the 737 MAX 8 and A320 NEO appearing less frequently.

For widebody aircraft, the Boeing 787-9 is the clear leader with over 2500 flights, followed by the 777-300ER and A330-300 in the 1300-1600 range, with various other 777 and 787 variants filling out the rest of the distribution.

Now I'm checking if there are additional aircraft models beyond what I've already captured, particularly looking for regional turboprops like ATR and Bombardier variants that might have smaller flight counts.

Excellent! Now I have a clear picture of the aircraft models. Let me categorize them all:

CRJ (CRJ Series):

"Canadair CRJ 900" → CRJ (4266)
"Bombardier CRJ900" → CRJ (458)
"Canadair CRJ-701ER" → CRJ (384)
Need to see if there are more CRJ variants...
Turboprop:

"De Havilland Canada DHC-8-400 Dash 8Q" → Turboprop (535)

Still need to check for ATR, SF340, and other turboprop models.

Regional Jet:

"Embraer 175" → Regional Jet (5990)
"Embraer 195" → Regional Jet (4518)
"Embraer 170" → Regional Jet (2366)
"E295" → Regional Jet (812)
"Embraer 145" → Regional Jet (504)
"Embraer 195-E2" → Regional Jet (291)
Narrowbody: Now I'm mapping the major narrowbody aircraft — Boeing 737 variants dominate the dataset with the 737-800 leading at nearly 7000 flights, followed by the generic 737 designation and Airbus models like the A220-300, A320, and A321 all in the 5000-6000 range, with newer variants like the 737 MAX 8 and A320 NEO appearing less frequently.

For widebody aircraft, the Boeing 787-9 is the clear leader with over 2500 flights, followed by the 777-300ER and A330-300 in the 1300-1600 range, with various other 777 and 787 variants filling out the rest of the distribution.

Now I'm checking if there are additional aircraft models beyond what I've already captured, particularly looking for regional turboprops like ATR and Bombardier variants that might have smaller flight counts.

Everything is working. Here's what was built and what the data tells us:

Data Quality (75,857 rows, Dec 31 2025 → Mar 5 2026)

Column	Coverage
aircraft_model	98.2% ✅
arr_airport_iata	99.3% ✅
arr_scheduled_utc	94.4% ✅
dep_revised_utc	99.4% ✅
View v_flights_enriched — deployed and working

New derived columns: route_code, flight_date, day_of_week, week_number, month_number, dep_delay_min, scheduled_block_min, aircraft_category, is_crj, is_turboprop, is_regional_jet

Aircraft Category Breakdown

Category	Flights	%
Narrowbody (737, A320…)	40,880	54%
Regional Jet (Embraer)	14,536	19%
Widebody (777, 787…)	12,093	16%
CRJ	5,506	7.3%
Turboprop	715	0.9%
Business Jet	630	0.8%
Key Phase 2 Insights Already Visible

Turboprop routes (upgrade opportunity): YYZ-YTS, YYZ-YSB, YYZ-YAM, YYZ-YXU — all Air Canada/Jazz, short block times (50–93 min). These are the clearest CRJ sales pitches.
Regional Jet competition: 19.2% of all departures use Embraer E-Series — the direct CRJ competitors. These routes are where MHIRJ needs to show CRJ superiority.
dep_delay_min is working — sample CRJ rows show actual delay values (−2 min early, +32 min late), which enables punctuality comparisons by aircraft type.