const sqls = require('../models/inventorySqls.js');
const pool = require('../models/pg-pool.js');
const validate = require('../utils/validateInventory.js');
const {EXP_LENGTH, PRICE, COST} = require('../constants/inventory.js');

/**
 * Record the purchase of a quantity of bananas, either on after after the date
 * of the latest record currently in the database.
 */
exports.recordPurchase = async (req, res, next) => {
  const {quantity, date} = req.body;
  
  // validate input
  try {
    validate.recordTransaction(quantity, date);
  } catch(err) {
    return next(err);
  }
  
  // date of new purchase, and date at or before which bananas should expire
  const currDate = new Date(date);
  const expDate = new Date(currDate.getTime() - EXP_LENGTH);
  
  const client = await pool.connect();
  let error = null;
  try {
    await client.query('BEGIN');
    
    // date of most recent record
    const {lastDay, lastInInventory} = await sqls.getRecentRecord(client);
    
    if (currDate < lastDay)
      throw new Error('date cannot be earlier than last recorded date');
    
    // determine the banans that need to be marked as expired
    const numExpired = await sqls.expireOldBananas(client, expDate);
    
    // upsert purchase into records and store
    if (currDate > lastDay) {
      await sqls.insertToRecords(client, quantity, 0, lastInInventory + quantity - numExpired, currDate);
      await sqls.insertToStore(client, quantity, currDate);
    } else {
      await sqls.updateRecords(client, quantity, 0, quantity - numExpired, currDate);
      await sqls.updateStorePurchase(client, quantity, currDate);
    }
    
    // respond with snapshot of current store
    res.locals.store = await sqls.getCurrentStore(client);
    await client.query('COMMIT');
  } catch(err) {
    await client.query('ROLLBACK');
    
    error = err;
  } finally {
    client.release();
    next(error);
  }
};

/**
 * Record the sell of a quantity of bananas, either on after after the date
 * of the latest record currently in the database. If we cannot sell that many 
 * bananas, respond with an error.
 */
exports.recordSell = async (req, res, next) => {
  const {quantity, date} = req.body;
  
  // validate input
  try {
    validate.recordTransaction(quantity, date);
  } catch(err) {
    return next(err);
  }
  
  // date of new purchase, and date at or before which bananas should expire
  const currDate = new Date(date);
  const expDate = new Date(currDate.getTime() - EXP_LENGTH);
  
  const client = await pool.connect();
  let error = null;
  try {
    await client.query('BEGIN');
    
    // date of most recent record
    const {lastDay, lastInInventory} = await sqls.getRecentRecord(client);
    
    if (currDate < lastDay)
      throw new Error('date cannot be earlier than last recorded date');
    
    // determine the banans that need to be marked as expired
    const numExpired = await sqls.expireOldBananas(client, expDate);
    
    if (quantity > lastInInventory - numExpired)
      throw new Error('cannot sell more than the number of freshly available banans');
    
    // upsert sell into records
    if (currDate > lastDay) {
      await sqls.insertToRecords(client, 0, quantity, lastInInventory - quantity - numExpired, currDate);
    } else {
      await sqls.updateRecords(client, 0, quantity, -quantity - numExpired, currDate);
    }
    // remove sold banans from store queue
    await sqls.removeFromStoreQueue(client, quantity);
    
    // respond with snapshot of current store
    res.locals.store = await sqls.getCurrentStore(client);
    await client.query('COMMIT');
  } catch(err) {
    await client.query('ROLLBACK');
  
    error = err;
  } finally {
    client.release();
    next(error);
  }
};

/**
 * Obtain analytics for number of banans purchased and sold within time interval
 * Obtatain profit (which may be negative)
 * Also obtain number of banans that would be in inventory
 * and expired within time interval, noting that if endDate is after
 * last recorded time, assume banans in queue that should expire will expire
 */
exports.retrieveAnalytics = async (req, res, next) => {
  const {start_date, end_date} = req.query;
  
  // validate input
  try {
    validate.retrieveAnalytics(start_date, end_date);
  } catch(err) {
    return next(err);
  }
  
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  const client = await pool.connect();
  let error = null;
  try {
    await client.query('BEGIN');
    
    // obtain number of banans purchased and sold within time interval
    let {purchased, sold} = await sqls.getBuySellData(client, startDate, endDate);
    // obtain number of banans that would be in inventory and expired within time interval
    // (if endDate is after last recorded time, assume banans in queue that should expire will expire)
    const {inInventory, expired} = await sqls.getExpiryData(client, startDate, endDate);
    const centsProfit = PRICE * sold - COST * purchased;
    const profit = (centsProfit / 10).toLocaleString("en-US", {style:"currency", currency:"USD"});
    
    res.locals.results = {purchased, sold, profit, inInventory, expired};
    await client.query('COMMIT');
  } catch(err) {
    await client.query('ROLLBACK');
  
    error = err;
  } finally {
    client.release();
    next(error);
  }
};

