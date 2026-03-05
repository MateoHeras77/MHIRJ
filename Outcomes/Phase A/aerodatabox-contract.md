# AeroDataBox Contract Discovery (Phase A)

Generated at (UTC): 2026-03-05T20:18:18.430Z

## Request Settings

- Endpoint: `GET /flights/airports/iata/YYZ/{fromLocal}/{toLocal}`
- `withLeg=true`
- `direction=Departure`
- `withCancelled=false`
- Time range windows are local Toronto time and each window is <= 12h

## Probe Windows

| Window | From Local | To Local | Status | HTTP | Departures | Arrivals | Sample | Error |
|---|---|---|---|---:|---:|---:|---|---|
| normal_morning | 2026-03-04T06:00 | 2026-03-04T10:00 | ok | 200 | 266 | 0 | Outcomes/Phase A/phaseA-samples/normal_morning.json |  |
| high_volume_midday | 2026-03-04T11:00 | 2026-03-04T15:00 | ok | 200 | 220 | 0 | Outcomes/Phase A/phaseA-samples/high_volume_midday.json |  |
| edge_overnight | 2026-03-04T23:00 | 2026-03-05T05:00 | ok | 200 | 94 | 0 | Outcomes/Phase A/phaseA-samples/edge_overnight.json |  |

## Envelope Shape

- Response top-level keys observed: departures
- Departure object top-level keys observed: aircraft, airline, arrival, callSign, codeshareStatus, departure, isCargo, number, status

## Flattened Path Type Map (Observed)

| Path | Types |
|---|---|
| <root> | object |
| aircraft | object |
| aircraft.model | string |
| aircraft.modeS | string |
| aircraft.reg | string |
| airline | object |
| airline.iata | string |
| airline.icao | string |
| airline.name | string |
| arrival | object |
| arrival.airport | object |
| arrival.airport.countryCode | string |
| arrival.airport.iata | string |
| arrival.airport.icao | string |
| arrival.airport.name | string |
| arrival.airport.timeZone | string |
| arrival.baggageBelt | string |
| arrival.gate | string |
| arrival.quality | array |
| arrival.quality[] | string |
| arrival.revisedTime | object |
| arrival.revisedTime.local | string |
| arrival.revisedTime.utc | string |
| arrival.runway | string |
| arrival.runwayTime | object |
| arrival.runwayTime.local | string |
| arrival.runwayTime.utc | string |
| arrival.scheduledTime | object |
| arrival.scheduledTime.local | string |
| arrival.scheduledTime.utc | string |
| arrival.terminal | string |
| callSign | string |
| codeshareStatus | string |
| departure | object |
| departure.gate | string |
| departure.quality | array |
| departure.quality[] | string |
| departure.revisedTime | object |
| departure.revisedTime.local | string |
| departure.revisedTime.utc | string |
| departure.runway | string |
| departure.runwayTime | object |
| departure.runwayTime.local | string |
| departure.runwayTime.utc | string |
| departure.scheduledTime | object |
| departure.scheduledTime.local | string |
| departure.scheduledTime.utc | string |
| departure.terminal | string |
| isCargo | boolean |
| number | string |
| status | string |

## Nullability Snapshot (Selected Paths)

| Path | Exists | Non-null | Null | Missing | Non-null % of all departures |
|---|---:|---:|---:|---:|---:|
| number | 580 | 580 | 0 | 0 | 100% |
| callSign | 519 | 519 | 0 | 61 | 89.48% |
| status | 580 | 580 | 0 | 0 | 100% |
| codeshareStatus | 580 | 580 | 0 | 0 | 100% |
| isCargo | 580 | 580 | 0 | 0 | 100% |
| airline.iata | 560 | 560 | 0 | 20 | 96.55% |
| airline.icao | 571 | 571 | 0 | 9 | 98.45% |
| aircraft.reg | 511 | 511 | 0 | 69 | 88.1% |
| aircraft.modeS | 511 | 511 | 0 | 69 | 88.1% |
| aircraft.model | 578 | 578 | 0 | 2 | 99.66% |
| departure.scheduledTime.utc | 580 | 580 | 0 | 0 | 100% |
| departure.revisedTime.utc | 577 | 577 | 0 | 3 | 99.48% |
| departure.predictedTime.utc | 0 | 0 | 0 | 580 | 0% |
| departure.runwayTime.utc | 198 | 198 | 0 | 382 | 34.14% |
| departure.terminal | 558 | 558 | 0 | 22 | 96.21% |
| departure.gate | 558 | 558 | 0 | 22 | 96.21% |
| arrival.airport.iata | 573 | 573 | 0 | 7 | 98.79% |
| arrival.airport.icao | 573 | 573 | 0 | 7 | 98.79% |
| arrival.scheduledTime.utc | 553 | 553 | 0 | 27 | 95.34% |
| location.lat | 0 | 0 | 0 | 580 | 0% |
| location.lon | 0 | 0 | 0 | 580 | 0% |
| location.reportedAtUtc | 0 | 0 | 0 | 580 | 0% |

## Stable Identifier Candidates

| Candidate | Complete Rows | Distinct Values | Duplicate Rows | Uniqueness % | Coverage % |
|---|---:|---:|---:|---:|---:|
| number | 580 | 579 | 1 | 99.83% | 100% |
| number+departure.scheduledTime.utc | 580 | 579 | 1 | 99.83% | 100% |
| number+departure.scheduledTime.utc+arrival.airport.iata | 573 | 572 | 1 | 99.83% | 98.79% |
| number+departure.scheduledTime.utc+airline.icao | 571 | 570 | 1 | 99.82% | 98.45% |
| number+departure.scheduledTime.utc+arrival.airport.iata+arrival.scheduledTime.utc | 553 | 552 | 1 | 99.82% | 95.34% |
| callSign+departure.scheduledTime.utc | 519 | 281 | 238 | 54.14% | 89.48% |

## Recommendation for Upsert Key (Phase B Input)

Best observed candidate in this probe: `number` (duplicates: 1, coverage: 100%).
If duplicates remain in larger windows, use airport request context plus payload fields: `airport_iata + direction + number + departure.scheduledTime.utc + coalesce(arrival.airport.iata,'NA')`.

## Generated Artifacts

- `Outcomes/Phase A/phaseA-samples/*.json`: raw API snapshots per window
- `Outcomes/Phase A/phaseA-samples/phaseA-summary.json`: machine-readable summary
- `Outcomes/Phase A/aerodatabox-contract.md`: this contract report
