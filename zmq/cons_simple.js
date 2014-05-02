var zmq = require('zmq')
  , sock = zmq.socket('pull')
, util = require('util');
var sleep = require('sleep');

sock.connect('tcp://127.0.0.1:3000');
console.log('Worker connected to port 3000');

var cnt=0;
var sqv = 0;
sock.on('message', function(msg){
    sq=JSON.parse(msg);
    if (sq.sq != sqv) {
	console.log(typeof sq.sq);
	console.log(typeof sqv);
	console.log("got", sq.sq, "expected", sqv);
    }
    sqv = sq.sq+1;
    if ((cnt ++ ) % 1000 == 0) {
	console.log('work: %s', util.inspect(msg.toString(),{depth:null}));
	console.log(new Date());
    }
    sleep.usleep(1000);
});