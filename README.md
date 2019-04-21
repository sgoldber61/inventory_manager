# Inventory Manager

## About

Bob is running a banana stand and needs to keep track of his inventory and metrics.
We've made a Docker-containerized service with Node.js server and Postgres database.

## Getting Started

Download [Docker](https://hub.docker.com/search?q=&type=edition&offering=community). To spin up the service in development, run
```
npm run docker-dev
```
which exposes a server on port 3000. No need to directly install Node.js or Postgres. Docker images are automatically pulled from public Docker hub [repos](https://cloud.docker.com/u/sgoldber61/repository/list).

## API documentation

### Givens
1. Bob sells each banana at a constant price of $0.35
2. Bob sells his bananas with a FIFO policy (based on purchase date)
3. Bob purchases a banana from a supplier at a cost of $0.20
4. Bananas will expire 10 days from purchase date (so if purchased on 2019-01-01, they will
expire on 2019-01-10, meaning they can no longer be sold on 2019-01-11)

### Backend
1. `POST /api/purchase`: record the purchasing of bananas from supplier. Inputs are number of bananas (int) and the purchase date (YYYY-MM-DD) on JSON request body, e.g.
```
{
  "quantity": 4,
	"date": "2019-01-04"
}
```
2. `POST /api/sell` Selling API: record the selling of bananas. Input is how many bananas were sold (int) and the sell date (YYYY-MM-DD) on JSON request body.
3. `GET /api/analytics/?start_date=<START_DATE>&end_date=<END_DATE>`: return count of bananas in inventory (by end date), count of bananas that have expired (between start and end date), and count of bananas purchased, sold, and profit/loss.
Inputs are start date (YYYY-MM-DD) and end date (YYYY-MM-DD) on URL query string. Dates are inclusive.

### Assumptions
1. Recording a new purchase/sell can be done either on or after the day of the last purchase/sell, but *not* before. We're not allowed to rewrite history.
2. Recording a purchase (with valid input) can always be done, but recording a sell can only be done if there are enough fresh bananas in our store.
3. If the provided end date in the analytics API is _after_ the last recorded date, then we assume that all banans during the time from the last recorded date to the provided end date that should expire will expire. However, if later we record transactions (buy/sell) between those dates, then a subsequent hit to the analytics API with the same provided end date may give a different result for number of expired banans (because we might know that some of those bananas get sold rather than become expired).

