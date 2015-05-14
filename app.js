var express = require('express');
var pg = require('pg');
var app = express();

// Use the public/ folder for resource files (css, js, images)  
app.use(express.static(__dirname + '/public'));

/**
 * Display index.html when the user visits the root page 
 */
app.get('/', function (req, res) {
  res.sendFile( __dirname + '/index.html');
});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Delphi Demo listening at http://%s:%s', host, port);

  /** 
   * Establish database connection with delphi
   * https://github.com/brianc/node-postgres
   */
  var pg = require('pg');
  // replace with real credentials
  var conString = "postgres://USERNAME:PASSWORD@HOST/DB";

  /** 
   * Returns JSON string with data from table 
   * 'leading_causes_of_death_by_zip_code_1999_2012'
   */
  app.get('/api/causes_of_death', function (req, res) {
    // initialize connection pool 
    pg.connect(conString, function(err, client, done) {
      var handleError = function(err, res) {
        // no error occurred, continue with the request
        if(!err) return false;
        else console.log(err);

        // An error occurred, remove the client from the connection pool.
        // A truthy value passed to done will remove the connection from the pool
        // instead of simply returning it to be reused.
        // In this case, if we have successfully received a client (truthy)
        // then it will be removed from the pool.
        done(client);
        res.writeHead("500", {'content-type': 'text/plain'});
        res.end('An error occurred');
        return true;
      };    

      var args = [];
      var query = 'SELECT sum(alz) as alz, sum(can) as can, sum(stk) as stk, sum(cld) as cld, sum(inj) as inj, ' + 
        ' sum(pnf) as pnf, sum(dia) as dia, sum(liv) as liv, sum(sui) as sui, sum(hyp) as hyp, sum(hom) as hom, sum(oth) as oth, sum(unk) as unk FROM leading_causes_of_death_by_zip_code_1999_2012';
      
      // filter by zip code if available, otherwise return all data
      if(req.query.zipcode) {
        query += " WHERE zip=$1";
        args.push(req.query.zipcode);
      }

      client.query(query, args, function(err, result) {
        if(handleError(err, res)) return;

        // return the client to the connection pool for other requests to reuse
        done();

        res.writeHead("200", {'content-type': 'application/json'});
        res.end(JSON.stringify(result.rows[0]));
      });
    });
  }); // end /api/causes_of_death callback

}); // end server callback