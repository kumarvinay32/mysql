'use strict';

const mysql = require("./mysql");
const sequelize = require('sequelize');
const _systemTimeZone = () => {
    let tzo = Number((new Date()).getTimezoneOffset());
    let tzs = '-';
    if (tzo <= 0) {
        tzs = '+';
        tzo *= -1;
    }
    const _dd = (d) => (d < 10 ? '0' : '') + d;
    return tzs + _dd(Math.floor(tzo / 60)) + ":" + _dd(tzo % 60);
}

class MySqlConnection extends mysql {
    /**
       * Instantiate sequelize mysql with options containing name of database, username and password.
       *
       * @param {object}   [options={}] An object with options.
       * @param {string}   [options.username=null] The username which is used to authenticate against the database.
       * @param {string}   [options.password=null] The password which is used to authenticate against the database.
       * @param {string}   [options.database=null] The name of the database
       * @param {string}   [options.host='localhost'] The host of the relational database.
       * @param {number}   [options.port=] The port of the relational database.
       * @param {string}   [options.protocol='tcp'] The protocol of the relational database.
       * @param {string}   [options.timezone='+00:00'] The timezone used when converting a date from the database into a JavaScript date. The timezone is also used to SET TIMEZONE when connecting to the server, to ensure that the result of NOW, CURRENT_TIMESTAMP and other time related functions have in the right timezone. For best cross platform performance use the format +/-HH:MM. Will also accept string versions of timezones used by moment.js (e.g. 'America/Los_Angeles'); this is useful to capture daylight savings time changes.
       * @param {Function} [options.logging=false] A function that gets executed every time Sequelize would log something.
       * @param {boolean}  [options.logQueryParameters=true] A flag that defines if show bind parameters in log.
       * @param {boolean}  [options.benchmark=true] Pass query execution time in milliseconds as second argument to logging function (options.logging).
       * @param {boolean}  [options.omitNull=false] A flag that defines if null values should be passed as values to CREATE/UPDATE SQL queries or not.
       * @param {boolean}  [options.replication=false] Use read / write replication. To enable replication, pass an object, with two properties, read and write. Write should be an object (a single server for handling writes), and read an array of object (several servers to handle reads). Each read/write server can have the following properties: `host`, `port`, `username`, `password`, `database`
       * @param {object}   [options.pool] pool configuration
       * @param {number}   [options.pool.max=5] Maximum number of connection in pool
       * @param {number}   [options.pool.min=0] Minimum number of connection in pool
       * @param {number}   [options.pool.idle=10000] The maximum time, in milliseconds, that a connection can be idle before being released.
       * @param {number}   [options.pool.acquire=60000] The maximum time, in milliseconds, that pool will try to get connection before throwing error
       * @param {number}   [options.pool.evict=1000] The time interval, in milliseconds, after which sequelize-pool will remove idle connections.
       * @param {Function} [options.pool.validate] A function that validates a connection. Called with client. The default function checks that client is an object, and that its state is not disconnected
       * @param {number}   [options.pool.maxUses=Infinity] The number of times a connection can be used before discarding it for a replacement, [`used for eventual cluster rebalancing`](https://github.com/sequelize/sequelize-pool).
       */
    constructor(options) {
        sequelize.DATE.types.mysql = ['DATE'];
        let connection = null;
        if (typeof options === 'object') {
            options.dialect = "mysql";
            options.dialectOptions = {
                multipleStatements: true,
                dateStrings: false
            }
            if (Object.hasOwnProperty.call(options, 'dateStrings')) {
                options.dialectOptions.dateStrings = options.dateStrings ? true : false;
                delete options.dateStrings;
            }
            if (!Object.hasOwnProperty.call(options, 'timezone')) {
                options.timezone = _systemTimeZone();
            }
            if (options.logging && typeof options.logging === 'function') {
                const logger = options.logging;
                options.logging = (sql, ...rest) => {
                    logger(sql.replace('SELECT 1;', ''), ...rest);
                }
                options.logQueryParameters = !Object.hasOwnProperty.call(options, 'logQueryParameters') ? true : options.logQueryParameters;
                options.benchmark = !Object.hasOwnProperty.call(options, 'benchmark') ? true : options.benchmark;
            } else {
                options.logging = false;
            }
            connection = new sequelize(options);
        } else if (typeof options === 'string') {
            connection = new sequelize(options, { dialect: "mysql", dialectOptions: { multipleStatements: true } });
        }
        return super(connection, null);
    }
}

module.exports = MySqlConnection;