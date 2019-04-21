const pg = require('pg');

const config = {
  max: 20
};

if (process.env.NODE_ENV === 'development') {
  config.user = 'admin';
  config.database = 'inventory';
  config.password = 'admin';
  config.host = 'postgres-db';
  config.port = 5432;
}

const pool = new pg.Pool(config);

pool.on('error', (err, client) => {
  console.error('error on idle client', err.message);
});

module.exports = pool;
