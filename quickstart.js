const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const OAuth2Client = google.auth.OAuth2;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'credentials.json';
var mysql = require('mysql');


var http = require('http'),
    url = require('url'),
    choices = ["hello world", "goodbye world"];

http.createServer(function(request, response){
    var path = url.parse(request.url).pathname;
    if(path=="/getstring"){
        console.log("request recieved");
        var string = choices[Math.floor(Math.random()*choices.length)];
        console.log("string '" + string + "' chosen");
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.end(string);
        console.log("string sent");
    } if(path=="/liverpool") {
        console.log('call liverpool...')
        init(function(result) {
            console.log('fin');
            response.end(result);
        });
    } else {
        fs.readFile('./index.html', function(err, file) {  
            if(err) {  
                // write an error response or nothing here  
                return;  
            }  
            response.writeHead(200, { 'Content-Type': 'text/html' });  
            response.end(file, "utf-8");  
        });
    }
}).listen(8001);
console.log("server initialized");

function init(callbackLiv) {
    // Load client secrets from a local file.
    fs.readFile('client_secret.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        console.log('init start...')
        authorize(JSON.parse(content), listMajors, callbackLiv);
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, callbackLiv) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, callbackLiv);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {OAuth2Client} auth The authenticated Google OAuth client.
 */
function listMajors(auth, callbackLiv) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '159qYRWtGKFAGJ8yMTU4Jth1FkETVezGDApBuu8tThrA',
    range: 'A4:J',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    insertLivDrive(data.values, callbackLiv);
    //const rows = data.values;
    // if (rows.length) {
    //   console.log('Name, Major:');
    //   // Print columns A and E, which correspond to indices 0 and 4.
    //   rows.map((row) => {
    //     console.log(`${row[0]}, ${row[4]}`);
    //   })
    // } else {
    //   console.log('No data found.');
    // }
  });
}

function insertLivDrive(rows, callbackLiv) {

    var con = mysql.createConnection({
        host: "192.168.1.66",
        user: "usr_casc",
        password: "Hadalid1985$",
        database: "dbcasc"
    });

    var arrIst = [];
    var arrIstLiv = [];
    var arrIstLen = 0;
    var arrIstLivLen = 0;
    var arrIstUdt = [];
    var arrIstUdtLen = 0;
    var SqlIstUdt;

    if (rows.length) {
        // Print columns A and E, which correspond to indices 0 and 4.
        rows.map((row) => {
          //console.log(`${row[0]}, ${row[4]}`);
          var objData = {
            Proveedor : row[1],
            Trafico : row[3],
            Pedido : row[4],
            Piezas : row[8].replace(',',''),
            Fecha_confirma : row[9] != undefined ? row[9].split('/')[2] + '-' + row[9].split('/')[0] + '-' + row[9].split('/')[1] : null,
            Ref_entrada : row[2].replace(/(\d{2})(\d{2})(\d{4})(\d{7})?/i,"$2-$3-$4"),
            Id_entrada: 0
          };
          if(objData.Fecha_confirma!=null)
            arrIst.push(objData);
            //console.log(JSON.stringify(objData));
        });

        arrIstLen = arrIst.length;
        if(arrIstLen > 0) {
            con.connect();
            //async.forEachOf(arrIst, function(element, i, inner_callback) {
            arrIst.forEach(element => {
                con.query('select id from entrada where referencia = ? and isactive = 1',
                [element.Ref_entrada],
                (err, ent) => {
                    if(err) throw err;
                    
                    if(ent.length > 0) {
                        element.Id_entrada = ent[0].id;
                        arrIstLiv.push(element);
                    }
                    if(1 === arrIstLen--) {
                        arrIstLivLen = arrIstLiv.length;
                        if(arrIstLivLen > 0) {
                            arrIstLiv.forEach(item => {
                                con.query('select id, fecha_confirma from entrada_liverpool where trafico = ? and pedido = ?',
                                [item.Trafico, item.Pedido],
                                (err, ent_liv) => {
                                    if(ent_liv.length > 0) {
                                        SqlIstUdt = {
                                            sql: 'update entrada_liverpool set fecha_confirma = ? , id_entrada = ?, piezas = ? where id = ?',
                                            values: [item.Fecha_confirma, item.Id_entrada, item.Piezas, ent_liv[0].id],
                                            action: 'udt'
                                        };
                                    } else {
                                        SqlIstUdt = {
                                            sql: 'insert into entrada_liverpool set ?',
                                            values: {id_entrada: item.Id_entrada, proveedor: item.Proveedor, trafico: item.Trafico, pedido: item.Pedido, piezas: item.Piezas, fecha_confirma: item.Fecha_confirma, piezas_maq: 0 },
                                            action: 'ist'
                                        };
                                    }
                                    arrIstUdt.push(SqlIstUdt);

                                    if(1 === arrIstLivLen--) {
                                        arrIstUdtLen = arrIstUdt.length;
                                        if(arrIstUdtLen > 0) {
                                            var istRows = arrIstUdt.filter(function(obj) {
                                                return obj.action == 'ist';
                                            }).length;
                                            var udtRows = arrIstUdt.filter(function(obj) {
                                                return obj.action == 'udt';
                                            }).length;
                                            arrIstUdt.forEach(itemQry => {
                                                con.query(itemQry, function(err, result) {
                                                    if(err) throw err;
                                                    if(1 === arrIstUdtLen--) {
                                                        console.log('inserted rows: ' + istRows + ', updated rows: ' + udtRows);
                                                        if(callbackLiv) callbackLiv('inserted rows: ' + istRows + ', updated rows: ' + udtRows);
                                                        con.end();
                                                    }
                                                }) ;                                              
                                            });
                                        } else {
                                            con.end();
                                        }
                                    }
                                });
                            });
                        } else {
                            con.end();
                        }
                    }
                });
            });
        }



    } else {
        console.log('No data found.');
    }
}