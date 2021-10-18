'use strict';

const sqlstring = require("./SqlString");

class SequelizeConnectionError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class MySqlUtil {

    /**
     * Initilized connection and mapped to mysql functions.
     *
     * @param {resource} connection sequelize connection instance.
     * @param {resource|null} trans_id  sequelize transaction instance.
     * @returns {object} connection resource equivalent to mysql connection. 
     */
    constructor(connection, trans_id) {
        this.connection = connection;
        this.trans_id = trans_id || null;
        return this;
    }

    escapeId(...params) {
        return sqlstring.escapeId(...params);
    }

    escape(...params) {
        return sqlstring.escape(...params);
    }

    format(...params) {
        return sqlstring.format(...params);
    }

    raw(sql) {
        return sqlstring.raw(sql);
    }

    async querySync(sql, ...params) {
        try {
            if (!this.connection) {
                throw new SequelizeConnectionError("Connection failed.");
            }
            let { sqlQuery, options, sqlType } = this._createQuery(sql, params);
            if (this.trans_id) {
                options.transaction = this.trans_id;
            }
            let [results,] = await this.connection.query(sqlQuery, options);
            if (sqlType) {
                [, ...results] = results;
                if (results.length === 1) {
                    results = results.pop();
                }
            }
            return results;
        } catch (error) {
            throw error;
        }
    }

    async beginTransactionSync() {
        try {
            const transId = await this.connection.transaction({ isolationLevel: 'READ COMMITTED' });
            return new MySqlUtil(this.connection, transId);
        } catch (error) {
            throw error;
        }
    }

    async commitSync() {
        try {
            if (!this.trans_id) {
                throw new SequelizeConnectionError("Transaction not initiated use beginTransaction before commit.");
            }
            return await this.trans_id.commit();
        } catch (error) {
            throw error;
        }
    }

    async rollbackSync() {
        try {
            if (!this.trans_id) {
                throw new SequelizeConnectionError("Transaction not initiated use beginTransaction before rollback.");
            }
            return await this.trans_id.rollback();
        } catch (error) {
            throw error;
        }
    }

    query(sql, ...params) {
        const callback = params.pop();
        (async (sql, params, next) => {
            try {
                let results = await this.querySync(sql, ...params);
                next(false, results);
            } catch (error) {
                next(error);
            }
        })(sql, params, (err, result) => {
            callback(err, result);
        });
    }

    beginTransaction(callback) {
        (async (next) => {
            try {
                const trans_conn = await this.beginTransactionSync();
                next(false, trans_conn);
            } catch (error) {
                next(error);
            }
        })((err, trans_conn) => {
            callback(err, trans_conn);
        });
    }

    commit(callback) {
        (async (next) => {
            try {
                await this.commitSync();
                next();
            } catch (error) {
                next(error);
            }
        })(err => {
            callback(err);
        });
    }

    rollback(callback) {
        (async (next) => {
            try {
                await this.rollbackSync();
                next();
            } catch (error) {
                next(error);
            }
        })(err => {
            callback(err);
        });
    }

    _createQuery(sql, values) {
        let options = {};
        if (typeof sql === 'string') {
            options.sql = sql;
        } else if (typeof sql === 'object') {
            for (var prop in sql) {
                options[prop] = sql[prop];
            }
        }
        let select_query = true;
        if (options.sql && options.sql.trim().substr(0, 6) !== "SELECT") {
            select_query = false;
            options.sql = `SELECT 1;${options.sql}`;
        }
        return {
            sqlQuery: this.format(options.sql, ...(options.values ? [options.values] : values)),
            options: {
                raw: true,
                nest: options.nestTables || false,
                transaction: options.transaction || null
            },
            sqlType: !select_query
        }
    }

}

module.exports = MySqlUtil;