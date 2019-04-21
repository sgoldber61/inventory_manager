const sqls = require('../models/inventorySqls.js');
const pool = require('../models/pg-pool.js');
const {EXP_LENGTH} = require('../constants/inventory.js');

/**
 * Record the purchase of a quantity of bananas, either on after after the date
 * of the latest record currently in the database.
 */
exports.recordPurchase = async (req, res, next) => {
  const {quantity, date} = req.body;
  
  // date of new purchase, and date of purchase of expiring bananas
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
      await sqls.insertToRecords(client, quantity, lastInInventory + quantity - numExpired, currDate);
      await sqls.insertToStore(client, quantity, currDate);
    } else {
      await sqls.updateRecords(client, quantity - numExpired, currDate);
      await sqls.updateStore(client, quantity, currDate);
    }
    
    res.locals.results = await client.query('COMMIT');
  } catch(err) {
    await client.query('ROLLBACK');
    
    error = err;
  } finally {
    client.release();
    next(error);
  }
};

