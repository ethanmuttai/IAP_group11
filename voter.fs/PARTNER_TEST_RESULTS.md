Partner Test Results 
Partner API Tested: Group 10 API

Test Suite File: Manual API Verification / Endpoint Testing

Target URL: Live API Server

**Findings from Partner Test Execution**

* Manual exploratory testing against Group 10's API contract revealed data format and schema mismatches between the live endpoints and the OpenAPI contract.

Successful Checks: Base server reachability and general landmark retrieval returned responses, but key identifiers and schema fields diverged from the contract spec.

**1. Contract Divergences / Failures Found:**

Landmark IDs Mismatch: The contract specifies landmark IDs like `"lmk_001"`, but `GET /landmarks` returned numeric strings `"1"` to `"31"` and local names like `"westlands"`. Fetching `GET /landmarks/lmk_001` resulted in a **404 NOT_FOUND** error.

rideType Enum Mismatch: `GET /rides` expected `rideType` to match contract enums (`Boda`, `Standard`, `XL`), but returned live values like `"Bolt Boda"`, `"UberXL"`, `"Uber Chapchap"`, and `"Faras Delivery"`.

Undocumented Parcel Estimates: Five returned estimates (e.g., Bolt Send, Faras Delivery, Uber Connect) had `capacity: 0`. These represent parcel services, which are completely omitted from the contract spec.

**2. Classification of Findings & Resolutions**

Real Bugs / Spec Mismatches: Identified discrepancies between live data enums/IDs and the contract specification.

Action Taken: Omitted capacity 0 parcel services from the UI frontend for now. Reaching out to Group 10 to confirm whether the live API endpoints or the contract specification should be updated.