# mysql

Sequelize mysql package to migrate from Mysql persistent connection to sequelize pool connection.
this package will fix the issue of PROTOCOL_CONNECTION_LOST (Connection lost: The server closed the connection.) 
featuring:
###   transactions
###   connection pooling
###   both a promise and callback API


## Installation

```sh
$ npm i @krvinay/mysql

# And Sequelize and mysql2 package:
$ npm i sequelize
$ npm i mysql2
```

## Documentation : 

### Connecting to a database

```javascript
mysql = require("@krvinay/mysql");
connection = new mysql({
  username: "mysql user",
  password: "mysql password",
  database: "database name",
  host: "host", // default localhost
  dateStrings: true // Force date types (TIMESTAMP, DATETIME, DATE)
});
```

### logging sqls

```javascript
connection = new mysql({
  ...
  logging: (sql, exec_time) => { console.log(sql, exec_time) }, // function to log sql
  logQueryParameters: true, //bind parameters to sql
  benchmark: true // gives execution time to logging function on second argument
});
```

### pool configuration

```javascript
connection = new mysql({
  ...
  pool: {
    max: 5, // Maximum number of connection in pool
    min: 0, // Minimum number of connection in pool
    idle: 10000, // The maximum time, in milliseconds, that a connection can be idle before being released.
    acquire: 60000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
    evict: 1000, // The time interval, in milliseconds, after which sequelize-pool will remove idle connections.
  }
});
```

### Performing queries

The most basic way to perform a query is to call the `.query()` method on an connection object.

The simplest form of .`query()` is `.query(sqlString, callback)`, where a SQL string
is the first argument and the second is a callback:

```js
connection.query('SELECT * FROM `books` WHERE `author` = "Vinay"', function (error, results) {
  // error will be an Error if one occurred during the query
  // results will contain the results of the query
});
```
OR 
```js
results = await connection.querySync('SELECT * FROM `books` WHERE `author` = "Vinay"');
```

The second form `.query(sqlString, values, callback)` comes when using
placeholder values (see [escaping query values](#escaping-query-values)):

```js
connection.query('SELECT * FROM `books` WHERE `author` = ?', ['Vinay'], function (error, results) {
  // error will be an Error if one occurred during the query
  // results will contain the results of the query
});
```
OR 
```js
results = await connection.querySync('SELECT * FROM `books` WHERE `author` = ?', ['Vinay']);
```

### Escaping query values

**Caution** These methods of escaping values only works when the
[NO_BACKSLASH_ESCAPES](https://dev.mysql.com/doc/refman/5.7/en/sql-mode.html#sqlmode_no_backslash_escapes)
SQL mode is disabled (which is the default state for MySQL servers).

In order to avoid SQL Injection attacks, you should always escape any user
provided data before using it inside a SQL query. You can do so using the
`connection.escape()` method:

<!-- eslint-disable no-undef -->

```js
var userId = 'some user provided value';
var sql    = 'SELECT * FROM users WHERE id = ' + connection.escape(userId);
console.log(sql); // SELECT * FROM users WHERE id = 'some user provided value'
```

Alternatively, you can use `?` characters as placeholders for values you would
like to have escaped like this:

<!-- eslint-disable no-undef -->

```js
var userId = 1;
var sql    = connection.format('SELECT * FROM users WHERE id = ?', [userId]);
console.log(sql); // SELECT * FROM users WHERE id = 1
```

Multiple placeholders are mapped to values in the same order as passed. For example,
in the following query `foo` equals `a`, `bar` equals `b`, `baz` equals `c`, and
`id` will be `userId`:

<!-- eslint-disable no-undef -->

```js
var userId = 1;
var sql    = connection.format('UPDATE users SET foo = ?, bar = ?, baz = ? WHERE id = ?',
  ['a', 'b', 'c', userId]);
console.log(sql); // UPDATE users SET foo = 'a', bar = 'b', baz = 'c' WHERE id = 1
```

This looks similar to prepared statements in MySQL, however it really just uses
the same `connection.escape()` method internally.

**Caution** This also differs from prepared statements in that all `?` are
replaced, even those contained in comments and strings.

Different value types are escaped differently, here is how:

* Numbers are left untouched
* Booleans are converted to `true` / `false`
* Date objects are converted to `'YYYY-mm-dd HH:ii:ss'` strings
* Buffers are converted to hex strings, e.g. `X'0fa5'`
* Strings are safely escaped
* Arrays are turned into list, e.g. `['a', 'b']` turns into `'a', 'b'`
* Nested arrays are turned into grouped lists (for bulk inserts), e.g. `[['a',
  'b'], ['c', 'd']]` turns into `('a', 'b'), ('c', 'd')`
* Objects that have a `toSqlString` method will have `.toSqlString()` called
  and the returned value is used as the raw SQL.
* Objects are turned into `key = 'val'` pairs for each enumerable property on
  the object. If the property's value is a function, it is skipped; if the
  property's value is an object, toString() is called on it and the returned
  value is used.
* `undefined` / `null` are converted to `NULL`
* `NaN` / `Infinity` are left as-is. MySQL does not support these, and trying
  to insert them as values will trigger MySQL errors until they implement
  support.

You may have noticed that this escaping allows you to do neat things like this:

<!-- eslint-disable no-undef -->

```js
var post  = {id: 1, title: 'Hello MySQL'};
var sql = connection.format('INSERT INTO posts SET ?', post);
console.log(sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
```

**Caution** The string provided to `connection.raw()` will skip all escaping
functions when used, so be careful when passing in unvalidated input.

<!-- eslint-disable no-undef -->

```js
var CURRENT_TIMESTAMP = connection.raw('CURRENT_TIMESTAMP()');
var sql = connection.format('UPDATE posts SET modified = ? WHERE id = ?', [CURRENT_TIMESTAMP, 42]);
console.log(sql); // UPDATE posts SET modified = CURRENT_TIMESTAMP() WHERE id = 42
```

### Escaping query identifiers

If you can't trust an SQL identifier (database / table / column name) because it is
provided by a user, you should escape it with `connection.escapeId(identifier)` like this:

<!-- eslint-disable no-undef -->

```js
var sorter = 'date';
var sql    = 'SELECT * FROM posts ORDER BY ' + connection.escapeId(sorter);
console.log(sql); // SELECT * FROM posts ORDER BY `date`
```

It also supports adding qualified identifiers. It will escape both parts.

<!-- eslint-disable no-undef -->

```js
var sorter = 'date';
var sql    = 'SELECT * FROM posts ORDER BY ' + connection.escapeId('posts.' + sorter);
console.log(sql); // SELECT * FROM posts ORDER BY `posts`.`date`
```

If you do not want to treat `.` as qualified identifiers, you can set the second
argument to `true` in order to keep the string as a literal identifier:

<!-- eslint-disable no-undef -->

```js
var sorter = 'date.2';
var sql    = 'SELECT * FROM posts ORDER BY ' + connection.escapeId(sorter, true);
console.log(sql); // SELECT * FROM posts ORDER BY `date.2`
```

Alternatively, you can use `??` characters as placeholders for identifiers you would
like to have escaped like this:

<!-- eslint-disable no-undef -->

```js
var userId = 1;
var columns = ['username', 'email'];
var sql     = connection.format('SELECT ?? FROM ?? WHERE id = ?', [columns, 'users', userId]);
console.log(sql); // SELECT `username`, `email` FROM `users` WHERE id = 1
```

When you pass an Object to `.escape()` or `.format()`, `.escapeId()` is used to avoid SQL injection in object keys.

### Formatting queries

You can use `connection.format` to prepare a query with multiple insertion points,
utilizing the proper escaping for ids and values. A simple example of this follows:

<!-- eslint-disable no-undef -->

```js
var userId  = 1;
var inserts = ['users', 'id', userId];
var sql     = connection.format('SELECT * FROM ?? WHERE ?? = ?', inserts);
console.log(sql); // SELECT * FROM `users` WHERE `id` = 1
```

Following this you then have a valid, escaped query that you can then send to the database safely.
This is useful if you are looking to prepare the query before actually sending it to the database.
You also have the option (but are not required) to pass in `stringifyObject` and `timeZone`,
allowing you provide a custom means of turning objects into strings, as well as a
location-specific/timezone-aware `Date`.

This can be further combined with the `connection.raw()` helper to generate SQL
that includes MySQL functions as dynamic vales:

<!-- eslint-disable no-undef -->

```js
var userId = 1;
var data   = { email: 'foobar@example.com', modified: connection.raw('NOW()') };
var sql    = connection.format('UPDATE ?? SET ? WHERE `id` = ?', ['users', data, userId]);
console.log(sql); // UPDATE `users` SET `email` = 'foobar@example.com', `modified` = NOW() WHERE `id` = 1
```

## Transactions

Simple transaction support is available at the connection level:

```js
connection.beginTransaction(function(err, transConn) {
  if (err) { throw err; }
  transConn.query('INSERT INTO posts SET title=?', title, function (error, results) {
    if (error) {
      return transConn.rollback(function() {
        throw error;
      });
    }

    var log = 'Post ' + results.insertId + ' added';

    transConn.query('INSERT INTO log SET data=?', log, function (error, results) {
      if (error) {
        return transConn.rollback(function() {
          throw error;
        });
      }
      transConn.commit(function(err) {
        if (err) {
          return transConn.rollback(function() {
            throw err;
          });
        }
        console.log('success!');
      });
    });
  });
});
```
Please note that beginTransaction(), commit() and rollback() are simply convenience
functions that execute the START TRANSACTION, COMMIT, and ROLLBACK commands respectively.
It is important to understand that many commands in MySQL can cause an implicit commit,
as described [in the MySQL documentation](http://dev.mysql.com/doc/refman/5.5/en/implicit-commit.html)

## Transactions in Sync

```js
try{
  var transConn = await connection.beginTransactionSync();
  var results = await transConn.querySync('INSERT INTO posts SET title=?', title);
  var log = 'Post ' + results.insertId + ' added';
  ..... more queries .....
  await transConn.commitSync();
  console.log('success!');
} catch (error){
  if(trans_id){
    await transConn.rollbackSync();
  }
}
```