const {EXP_LENGTH} = require('../constants/inventory.js');

/**
 * Obtain most recent day and inventory count in records
 * @param {pg.Client} client postgres client from pool
 */
exports.getRecentRecord = async (client) => {
  const queryText = `
    SELECT day, in_inventory FROM records
    ORDER BY day DESC LIMIT 1;
  `;
  const {rows} = await client.query(queryText);
  const lastRecord = rows[0];
  return {
    lastDay: lastRecord ? new Date(lastRecord.day) : new Date(0),
    lastInInventory: lastRecord ? lastRecord.in_inventory : 0
  };
};

/**
 * Record the expiration of banans, given the date at which banans purchased
 * must become expired
 * @param {pg.Client} client postgres client from pool
 * @param {Date} expDate date where all banans purchased up to must be
 * declared as expired
 */
exports.expireOldBananas = async (client, expDate) => {
  const queryText = `
    WITH st AS
    (DELETE FROM store WHERE day <= $1 RETURNING quantity, day)
    UPDATE records AS rc
    SET expired = rc.expired + st.quantity
    FROM st
    WHERE rc.day = st.day
    RETURNING st.quantity;
  `;
  const queryParams = [expDate]; 
  const {rows} = await client.query(queryText, queryParams);
  const numExpired = rows.reduce((acc, result) => acc + result.quantity, 0);
  return numExpired;
};

/**
 * If the date of our recording of the purchase/sell is after the last date in
 * the records table, we insert a new row to records
 * @param {pg.Client} client postgres client from pool
 * @param {Number} purchased number of banans purchased at new day
 * @param {Number} sold number of banans sold at new day
 * @param {Number} inInventory number of banans in store at new day
 * @param {Date} currDate day of recording new purchase/sell
 */
exports.insertToRecords = async (client, purchased, sold, inInventory, currDate) => {
  const queryText = `
    INSERT INTO records (purchased, sold, in_inventory, day)
    VALUES ($1, $2, $3, $4);
  `;
  const queryParams = [purchased, sold, inInventory, currDate];
  return client.query(queryText, queryParams);
};

/**
 * If the date of our recording of the purchase is after the last date in
 * the records table, we insert a new row to store
 * @param {pg.Client} client postgres client from pool
 * @param {Number} quantity number of banans purchased at new day
 * @param {Date} currDate day of recording new purchase
 */
exports.insertToStore = async (client, quantity, currDate) => {
  const queryText = `
    INSERT INTO store (quantity, day)
    VALUES ($1, $2);
  `;
  const queryParams = [quantity, currDate];
  return client.query(queryText, queryParams);
};

/**
 * If the date of our recording of the purchase/sell equal to the last date in
 * the records table, we modify the last record (more banans purchased/sold)
 * @param {pg.Client} client postgres client from pool
 * @param {Number} purchased change in number of banans purchased at new day
 * @param {Number} sold change in number of banans sold at new day
 * @param {Number} inventoryChange change in number of banans in inventory
 * @param {Date} currDate day of recording new purchase/sell
 */
exports.updateRecords = async (client, purchased, sold, inventoryChange, currDate) => {
  const queryText = `
    UPDATE records AS rc
    SET purchased = rc.purchased + $1, sold = rc.sold + $2,
    in_inventory = rc.in_inventory + $3
    WHERE rc.day = $4;
  `;
  const queryParams = [purchased, sold, inventoryChange, currDate];
  return client.query(queryText, queryParams);
};

/**
 * If the date of our recording of the purchase equal to the last date in
 * the records table, we modify the last store item (more banans purchased)
 * @param {pg.Client} client postgres client from pool
 * @param {Number} quantity number of banans purchased at new day
 * @param {Date} currDate day of recording new purchase
 */
exports.updateStorePurchase = async (client, quantity, currDate) => {
  const queryText = `
    UPDATE store AS st
    SET quantity = st.quantity + $1
    WHERE st.day = $2;
  `;
  const queryParams = [quantity, currDate];
  return client.query(queryText, queryParams);
};

/**
 * During a sell, remove from the FIFO store queue the banans to be sold
 * @param {pg.Client} client postgres client from pool
 * @param {Number} quantity number of banans being sold
 */
exports.removeFromStoreQueue = async (client, quantity) => {
  let queryText = `
    WITH st AS
    (SELECT day, SUM(quantity) OVER (ORDER BY day) AS total FROM store GROUP BY quantity, day ORDER BY day)
    DELETE FROM store USING st
    WHERE st.day = store.day AND st.total < $1
    RETURNING st.total;
  `;
  let queryParams = [quantity];
  const {rows} = await client.query(queryText, queryParams);
  // calculate remaining bananas we need to delete from store
  const remaining = rows.length ? quantity - rows[rows.length - 1].total : quantity;
  
  queryText = `
    UPDATE store AS st
    SET quantity = st.quantity - $1
    WHERE st.day = (SELECT day from store ORDER BY day LIMIT 1);
  `;
  queryParams = [remaining];
  return client.query(queryText, queryParams);
};

/**
 * During either a buy or sell, obtain a snapshot of the current store queue
 * @param {pg.Client} client postgres client from pool
 */
exports.getCurrentStore = async (client) => {
  const queryText = `
    SELECT quantity, day FROM store ORDER BY day;
  `;
  const {rows} = await client.query(queryText);
  return rows;
};

/**
 * Return the number of purchased and sold items from startDate to endDate
 * @param {pg.Client} client postgres client from pool
 * @param {Date} startDate beginning of date window
 * @param {Date} endDate beginning of date window
 */
exports.getBuySellData = async (client, startDate, endDate) => {
  const queryText = `
    SELECT COALESCE(SUM(purchased), 0) AS purchased, COALESCE(SUM(sold), 0) AS sold
    FROM records WHERE $1 <= day AND day <= $2;
  `;
  const queryParams = [startDate, endDate];
  const results = (await client.query(queryText, queryParams)).rows[0];
  const purchased = Number(results.purchased);
  const sold = Number(results.sold);
  return {purchased, sold};
};

/**
 * Return the number of expiring banans from startDate to endDate
 * This has to be computed by going back in time, because banana expirations
 * are recorded in our records table at the date they are bought, not the
 * date they actually expire
 *
 * Also returns the number of bananas in inventory, taking into account
 * expirations if the endDate is after the last date stored in the records table
 * @param {pg.Client} client postgres client from pool
 * @param {Date} startDate beginning of date window
 * @param {Date} endDate beginning of date window
 */
exports.getExpiryData = async (client, startDate, endDate) => {
  const startExpire = new Date(startDate.getTime() - EXP_LENGTH);
  const endExpire = new Date(endDate.getTime() - EXP_LENGTH);
  
  // obtain last recorded inventory count
  let queryText = `
    SELECT day, in_inventory FROM records
    WHERE day <= $1
    ORDER BY day DESC LIMIT 1;
  `;
  let queryParams = [endDate];
  let results = (await client.query(queryText, queryParams)).rows[0];
  const inInventory = results ? results.in_inventory: 0;
  const recordedExpire = new Date((results ? results.day: startDate).getTime() - EXP_LENGTH);
  
  // obtain banans expired from beginning to last recorded record
  queryText = `
    SELECT COALESCE(SUM(expired), 0) AS num_expired FROM records
    WHERE $1 <= day AND day <= $2;
  `;
  queryParams = [startExpire, recordedExpire];
  results = (await client.query(queryText, queryParams)).rows[0];
  const recordedNumExpired = Number(results.num_expired);
  
  // obtain banans that should expire within the store queue because
  // endExpire is after recordedExpire and so banans will expire within
  // the queue even though these expirations are not recorded
  queryText = `
    SELECT COALESCE(SUM(quantity), 0) AS num_expired FROM store
    WHERE $1 <= day AND day <= $2;
  `;
  queryParams = [recordedExpire, endExpire];
  results = (await client.query(queryText, queryParams)).rows[0];
  const postRecordedNumExpired = Number(results.num_expired);
  
  return {
    inInventory: inInventory - postRecordedNumExpired,
    expired: recordedNumExpired + postRecordedNumExpired
  };
};

