# API Needs Statements — Group 11 (Voter Edu)

> Notes from our conversation with Group 12.

## Part D — Needs Statements

1. AccessMap Nairobi needs to read a list of candidates and their policies in order to display civic info on venue pages for voter education centers. Low volume, daily freshness fine, no auth needed.

2. AccessMap Nairobi needs to read reviews for a specific candidate in order to show community sentiment on venue pages hosting civic events. Same — low volume, daily freshness, no auth.

3. AccessMap Nairobi needs to read a list of upcoming civic events and rallies, with venue coordinates, date, start and end time and expected attendance, in order to flag venues and routes that will be busy during events (accessibility and traffic planning). Low volume, daily freshness fine. *(Draft: added because candidates and reviews alone were not enough for Group 12. Confirm the wording with Group 12.)*

## Part E — Sanity Check

Maps cleanly to our Week 1 audit: Statement 1 → Candidate Details, Statement 2 → Reviews. Statement 3 → Rallies (`GET /api/rallies`), a new resource that was not in the Week 1 audit; it is served as sample data.

Conceptual gap only: neither team scoped "civic venue tagging" in Week 1. Flagging for instructor before Week 3.

## Reflection

Biggest surprise was with Group 12: our apps don't obviously overlap at all, accessible venues vs. voter education, so instead of the usual problem of trimming down an over-scoped wishlist, we had to dig to find a real connection. Talking it through, we landed on civic venue tagging: venues that double as voter education centers can pull candidate policy info and reviews to show alongside their accessibility details.