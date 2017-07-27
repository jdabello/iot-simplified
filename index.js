
'use strict';

//to read the pub/sub message
const Buffer = require('safe-buffer').Buffer;

//to insert the row in bigtable
var bigtable = require('@google-cloud/bigtable');

//to create the rowkey
var crypto = require('crypto');
var time = require('time')(Date);

//constants
const TABLE = "data";
const INSTANCE = "my-iot-instance";
const ZONE = "us-central1-c";

//to log data using Cloud Logging
require('@google-cloud/debug-agent').start();

exports.processMessage = function (event, callback) {
//get json data from the pub/sub message
const pubsubMessage = event.data;
const message = Buffer.from(pubsubMessage.data, 'base64').toString() ;
var jsonData = JSON.parse(message);

//create bigtable client using the client library
const client = bigtable({
  zone: ZONE,
  maxRetries: 6,
}).instance(INSTANCE);

//create rowkey. In this case we are using the device id, and a hash of the current timestamp. 
//For best practices on how to define the rowkey check> https://cloud.google.com/bigtable/docs/schema-design-time-series
var date = String(new Date().getTime() / 1000);
date = crypto.createHash('md5').update(date).digest("hex");
var row_key = jsonData.device_id + "#" + date;

const table = client.table(TABLE);
//row entry
var rows = [
{
  key: row_key,
  data: {
    data: {
      temperature: String(jsonData.temperature),
      pressure: String(jsonData.pressure)
    }
  }
}
];

//insert row
table.insert(rows, function(err) {
  if (err) {
    console.log(err);
  }
});

callback();
};
