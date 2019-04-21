/**
 * Validation for http request input.
 */

const validateInt = value => {
  if (!Number.isInteger(value))
    throw new Error('quantity provided is not an integer');
    
  if (value < 0)
    throw new Error('quantity should be positive');
};

const validateDate = value => {
  const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
  if (!value.match(dateFormat))
    throw new Error('date provided is not in valid format YYYY-MM-DD');
  if (Number.isNaN((new Date(value)).getTime()))
    throw new Error ('date provided is not numerically valid');
};

exports.recordTransaction = (quantity, date) => {
  validateInt(quantity);
  validateDate(date);
};

exports.retrieveAnalytics = (start_date, end_date) => {
  validateDate(start_date);
  validateDate(end_date);
};
