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

  socket.identity = 'subscriber' + process.pid;
  
  socket.connect(port);
  
  socket.subscribe('AAPL');
  socket.subscribe('GOOG');

  console.log('connected!');

  socket.on('message', function(data) {
      var d = data.toString().substr(4);
      var obj = JSON.parse(d);
      if (obj.seq != ix[obj.sym]) {
	  console.log("expected " + ix[obj.sym] +" got "+ d);
      }
      ix[obj.sym] = obj.seq + 1;
      if (cnt++ % 100000 == 0) {
	  console.log(new Date());
	  console.log(socket.identity + ': received data ' +  d);
      }
      sleep.usleep(100);
  });
