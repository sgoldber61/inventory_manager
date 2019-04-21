# Inventory Manager

## About

Bob is running a banana stand and needs to keep track of his inventory and metrics.
We've made a Docker-containerized service with Node.js server and Postgres database.

## Getting Started

Download [Docker](https://hub.docker.com/search?q=&type=edition&offering=community). To spin up the service in development, run
```
npm run docker-dev
```
which exposes a server on port 3000. No need to install Node.js or Postgres. Images are automatically pulled from public Docker hub [repos](https://cloud.docker.com/u/sgoldber61/repository/list).
