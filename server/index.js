const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const inventoryController = require('./controllers/inventoryController.js');

const app = express();

app.use(bodyParser.json());

/**
 * Record the purchase of a quantity of bananas, either on after after the date
 * of the latest record currently in the database.
 * req.body contains:
 * @param {Number} quantity number of bananas
 * @param {String} date purchase date in YYYY-MM-DD format
 */
app.post('/purchase', inventoryController.recordPurchase, (req, res) => {
  const {store} = res.locals;
  res.status(200).send({store});
});

/**
 * Record the sell of a quantity of bananas, either on after after the date
 * of the latest record currently in the database. If we cannot sell that many 
 * bananas, respond with an error.
 * req.body contains:
 * @param {Number} quantity number of bananas
 * @param {String} date purchase date in YYYY-MM-DD format
 */
app.post('/sell', inventoryController.recordSell, (req, res) => {
  const {store} = res.locals;
  res.status(200).send({store});
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
  res.status(err.status || 500).send(err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, err => {
  console.log(err || `Server listening on port ${PORT}`);
});
