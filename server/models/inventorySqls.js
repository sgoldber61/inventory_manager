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
    UPDATE records as rc
    SET purchased = rc.purchased + $1, sold = rc.sold + $2,
    in_inventory = rc.in_inventory + $3
    WHERE rc.day = $4;
  `;
  const queryParams = [purchased, sold, inventoryChange, currDate];
  await client.query(queryText, queryParams);
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
    UPDATE store as st
    SET quantity = st.quantity + $1
    WHERE st.day = $2
  `;
  const queryParams = [quantity, currDate];
  await client.query(queryText, queryParams);
};

