/*
 *
 * Publisher subscriber pattern
 *
 */

var zmq = require('zmq')
  , port = 'tcp://127.0.0.1:12345'
, sleep = require('sleep');


  //subscriber = receive only
  
  var socket = zmq.socket('sub');

  ix = {AAPL:0,GOOG:0}
cnt = 0
got = 0;
lost = 0;

  socket.identity = 'subscriber' + process.pid;
  
  socket.connect(port);
  
  socket.subscribe('AAPL');
  socket.subscribe('GOOG');

  console.log('connected!');

socket.on('message', function(data1,data2) {
    //console.log(data2.toString());
    var obj = JSON.parse(data2);
    got  += 1;
    if (obj.seq != ix[obj.sym] && ix[obj.sym] != 0) {
	lost += (obj.seq - ix[obj.sym]);
	console.log("expected " + ix[obj.sym] +" got "+ data2 + "diff of " + (obj.seq - ix[obj.sym]), lost, got, lost*100.0/got);
    }
    ix[obj.sym] = obj.seq + 1;
    if (cnt++ % 100000 == 0) {
	console.log(new Date());
	console.log(socket.identity + ': received data ' +  data2);
    }
    //sleep.usleep(1);

});
