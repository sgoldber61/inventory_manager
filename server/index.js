const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const inventoryController = require('./controllers/inventoryController.js');

const app = express();

app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(JSON.stringify(req.body));
  next();
});

app.post('/purchase', inventoryController.recordPurchase, (req, res) => {
  res.status(200).send(res.locals.results);
});

// catch 404 and forward to general error handler
app.use((req, res, next) => {
  const err = new Error('not found');
  err.status = 404;
  next(err);
});

// general error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, err => {
  console.log(err || `Server listening on port ${PORT}`);
});
