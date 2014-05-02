/*
 *
 * Publisher subscriber pattern
 *
 */

var zmq = require('zmq')
  , port = 'tcp://127.0.0.1:12345';

  
//publisher = send only

var socket = zmq.socket('pub');
socket.identity = 'publisher' + process.pid;


var stocks = ['AAPL', 'GOOG', 'YHOO', 'MSFT', 'INTC'];
var seq = {'AAPL':0, 'GOOG':0, 'YHOO':0, MSFT:0, INTC:0};

socket.bind(port, function(err) {
    if (err) throw err;
    console.log('bound!');
    
    function s() {
      var symbol = stocks[Math.floor(Math.random()*stocks.length)]
        , value = Math.random()*1000;
	
	//console.log(socket.identity + ': sent ' + symbol + ' ' + value);

	var msg={seq:seq[symbol]++, sym:symbol, val:value}

	socket.send(symbol +  JSON.stringify(msg));
	setImmediate(s);	
    }
    s();
  });
