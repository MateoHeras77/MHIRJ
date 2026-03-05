FIDS (airport departures and arrivals) - by local time range / TIER 2
get (https://doc.aerodatabox.com/rapidapi.html#/operations/GetAirportFlights)
https://aerodatabox.p.rapidapi.com/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}
What are current departures or arrivals at the airport? or What is the flight schedule at the airport? or What is flight history at the airport?

Flights may contain live updates with corresponding information related to the actual progress of the flight (including actual/estimated arrival/departure times). In this case this endpoint serves as a FIDS endpoint. Presense of live updates is subject to data coverage: not all airports have this coverage in our system.

Otherwise flight information will be limited to scheduled only and will not be updated real-time. Much more airports have this type of coverage. To check if airport is tracked and on which level, use /health/services/airports/{icao}/feeds endpoint. You can also use /health/services/feeds/{service}/airports to get the list of supported airports for this or that layer of coverage. To learn more about the data coverage, refer to https://www.aerodatabox.com/data-coverage.

Returns: the list of arriving and/or departing flights scheduled and/or planned and/or commenced within a specified time range for a specified airport.

Request
Path Parameters
code
string
required
If codeType is:Show all...

icao, then this field must be a 4-character ICAO-code of the airport (e.g.: EHAM, KLAX, UUEE, etc.);
iata, then this field must be a 3-character IATA-code of the airport (e.g.: AMS, SFO, LAX, etc.).
>= 3 characters
<= 4 characters
fromLocal
string<date-time>
required
Beginning of the search range (local time, format: YYYY-MM-DDTHH:mm)

Match pattern:
\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?
toLocal
string<date-time>
required
End of the search range (local time, format: YYYY-MM-DDTHH:mm). Must be more than beginning of the search range by no more than 12 hours.

Match pattern:
\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?
codeType
string
Type of code to search airport by (iata or icao)

Allowed values:
Icao
Iata
Query Parameters
direction
string
Direction of flights: Arrival, Departure or Both (default)

Allowed values:
Arrival
Departure
Both
withCancelled
boolean
If set to true, result will include cancelled, divered, likely cancelled (CanceledUncertain) flights. Default: true.

Default:
true
withCargo
boolean
If set to true, the result will include cargo flights (subject to availability).

Default:
true
withCodeshared
boolean
If set to true, the result will include flights with all code-shared statuses. Otherwise, code-sharing flights will be exclued. For airports, where no information about code-share statuses of flights are supplied (all flights are CodeshareStatus=Unknown), complex filtering will be applied to determine which flights are likely to be operational (caution: false results are possible).

Default:
true
withLeg
boolean
If set to true, the result will include movement information from airport opposite in this flight leg (airport of origin for arriving flight or airport of destination for departing flight). In this case, Movement property will be replaced with Departure and Arrival properties for each flight. Default: false.

Default:
false
withLocation
boolean
If set to true, each currently active flight within the result will be populated with its present real-time location, altitude, speed and track (subject to availability).

Default:
false
withPrivate
boolean
If set to true, the result will include private flights (subject to availability).

Default:
true
Responses
200
204
400
401
451
500
503
OK

Body
application/jsonapplication/xml

application/json
responses
/
200
Airport schedule contract

departures
array[object] or null
Departing flights

movement
object
Flight arrival or departure information

departure
object
Flight arrival or departure information

arrival
object
Flight arrival or departure information

number
string
required
Flight Number

>= 1 characters
callSign
string or null
ATC call-sign of the flight

status
string
required
Flight progress status

Possible values:

0 - Unknown: Status is not available for this flight
1 - Expected: Expected
2 - EnRoute: En route
3 - CheckIn: Check-in is open
4 - Boarding: Boarding in progress / Last call
5 - GateClosed: Gate closed
6 - Departed: Departed
7 - Delayed: Delayed
8 - Approaching: On approach to destination
9 - Arrived: Arrived
10 - Canceled: Cancelled
11 - Diverted: Diverted to another destination
12 - CanceledUncertain: Status of the flight is uncertain, may be cancelled
Allowed values:
Unknown
Expected
EnRoute
CheckIn
Boarding
GateClosed
Departed
Delayed
Approaching
Arrived
Canceled
Diverted
CanceledUncertain
codeshareStatus
string
required
Flight code-share status

Possible values:

0 - Unknown: Code-sharing information is unavailable for this flight. Flight might be operated both by airline owning the flight number as well as by another airliner.
1 - IsOperator: Flight is operated by an airline owning the flight number (the same code)
2 - IsCodeshared: Flight is code-shared (operated by an airline other than airline owning the flight number)
Allowed values:
Unknown
IsOperator
IsCodeshared
isCargo
boolean
required
Is cargo flight

aircraft
object
Flight's aircraft reference contract

airline
object
Flight's airline reference conract

location
object
Positional information about flight: location, altitude, speed and track

arrivals
array[object] or null
Arriving flights

movement
object
Flight arrival or departure information

departure
object
Flight arrival or departure information

arrival
object
Flight arrival or departure information

number
string
required
Flight Number

>= 1 characters
callSign
string or null
ATC call-sign of the flight

status
string
required
Flight progress status

Possible values:

0 - Unknown: Status is not available for this flight
1 - Expected: Expected
2 - EnRoute: En route
3 - CheckIn: Check-in is open
4 - Boarding: Boarding in progress / Last call
5 - GateClosed: Gate closed
6 - Departed: Departed
7 - Delayed: Delayed
8 - Approaching: On approach to destination
9 - Arrived: Arrived
10 - Canceled: Cancelled
11 - Diverted: Diverted to another destination
12 - CanceledUncertain: Status of the flight is uncertain, may be cancelled
Allowed values:
Unknown
Expected
EnRoute
CheckIn
Boarding
GateClosed
Departed
Delayed
Approaching
Arrived
Canceled
Diverted
CanceledUncertain
codeshareStatus
string
required
Flight code-share status

Possible values:

0 - Unknown: Code-sharing information is unavailable for this flight. Flight might be operated both by airline owning the flight number as well as by another airliner.
1 - IsOperator: Flight is operated by an airline owning the flight number (the same code)
2 - IsCodeshared: Flight is code-shared (operated by an airline other than airline owning the flight number)
Allowed values:
Unknown
IsOperator
IsCodeshared
isCargo
boolean
required
Is cargo flight

aircraft
object
Flight's aircraft reference contract

airline
object
Flight's airline reference conract

location
object
Positional information about flight: location, altitude, speed and track

X-RapidAPI-Key
:
123
X-RapidAPI-Host
:
123
code*
:
string
fromLocal*
:
string
toLocal*
:
string
codeType
:
Not SetIcaoIata

select an option
direction
:
Not SetArrivalDepartureBoth

select an option
withCancelled
:
Not SetFalseTrue

select an option (defaults to: true)
withCargo
:
Not SetFalseTrue

select an option (defaults to: true)
withCodeshared
:
Not SetFalseTrue

select an option (defaults to: true)
withLeg
:
Not SetFalseTrue

select an option (defaults to: false)
withLocation
:
Not SetFalseTrue

select an option (defaults to: false)
withPrivate
:
Not SetFalseTrue

select an option (defaults to: true)
Send API Request
curl --request GET \
  --url https://aerodatabox.p.rapidapi.com/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal} \
  --header 'Accept: application/json, application/xml' \
  --header 'X-RapidAPI-Host: 123' \
  --header 'X-RapidAPI-Key: 123'
{
  "departures": [
    {
      "movement": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "predictedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "runwayTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "terminal": "string",
        "checkInDesk": "string",
        "gate": "string",
        "baggageBelt": "string",
        "runway": "string",
        "quality": [
          "Basic"
        ]
      },
      "departure": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "predictedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "runwayTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "terminal": "string",
        "checkInDesk": "string",
        "gate": "string",
        "baggageBelt": "string",
        "runway": "string",
        "quality": [
          "Basic"
        ]
      },
      "arrival": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "predictedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "runwayTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "terminal": "string",
        "checkInDesk": "string",
        "gate": "string",
        "baggageBelt": "string",
        "runway": "string",
        "quality": [
          "Basic"
        ]
      },
      "number": "string",
      "callSign": "string",
      "status": "Unknown",
      "codeshareStatus": "Unknown",
      "isCargo": true,
      "aircraft": {
        "reg": "string",
        "modeS": "string",
        "model": "string",
        "image": {
          "url": "string",
          "webUrl": "string",
          "author": "string",
          "title": "string",
          "description": "string",
          "license": "AllRightsReserved",
          "htmlAttributions": [
            "string"
          ]
        }
      },
      "airline": {
        "name": "string",
        "iata": "string",
        "icao": "string"
      },
      "location": {
        "pressureAltitude": {
          "meter": 0,
          "km": 0,
          "mile": 0,
          "nm": 0,
          "feet": 0
        },
        "altitude": {
          "meter": 0,
          "km": 0,
          "mile": 0,
          "nm": 0,
          "feet": 0
        },
        "pressure": {
          "hPa": 0,
          "inHg": 0,
          "mmHg": 0
        },
        "groundSpeed": {
          "kt": 0,
          "kmPerHour": 0,
          "miPerHour": 0,
          "meterPerSecond": 0
        },
        "trueTrack": {
          "deg": 0,
          "rad": 0
        },
        "vsiFpm": 0,
        "reportedAtUtc": "2019-08-24T14:15:22Z",
        "lat": -90,
        "lon": -180
      }
    }
  ],
  "arrivals": [
    {
      "movement": {
        "airport": {
          "icao": "string",
          "iata": "string",
          "localCode": "string",
          "name": "string",
          "shortName": "string",
          "municipalityName": "string",
          "location": {
            "lat": -90,
            "lon": -180
          },
          "countryCode": "string",
          "timeZone": "string"
        },
        "scheduledTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
        },
        "revisedTime": {
          "utc": "2019-08-24T14:15:22Z",
          "local": "2019-08-24T14:15:22Z"
  