Team 11: Voter Edu (Downstream API for Group 12)

|Method | Path | Purpose | Maps to Need|
|:--- |:---- |:--- |:--- |
|GET | /candidates | Gets all candidates — basic info plus their policy positions. | "AccessMap Nairobi needs to read the list of candidates and their policy positions, in order to display civic info on venue pages for voter education centers." |
|GET | /candidates/{candidateId} | One candidate's full profile: experience, policies, vision. | "AccessMap Nairobi needs to read a single candidate's full profile, in order to show detailed civic info when a venue page links out to that specific candidate." |
|GET | /candidates/{candidateId}/reviews | All reviews for a candidate (rating + description). | "AccessMap Nairobi needs to read reviews for a specific candidate in order to show community sentiment on venue pages hosting civic events." |
|POST | /candidates/{candidateId}/reviews | Adds a new review to a candidate. | Internal — for our own review feature (Reviews: Create, from the Week 1 audit). |
|GET | /candidates/{candidateId}/reviews?minRating={n} | Same as above but filtered by min star rating. | Internal — for our own review feature (Reviews: Filter, from the Week 1 audit). |