var zmq = require('zmq')
  , sock = zmq.socket('push');

sock.bindSync('tcp://127.0.0.1:3000');
console.log('Producer bound to port 3000');

var sq=0;
function s(){
    //console.log('sending work');
    sock.send(JSON.stringify({sq:sq++}));
    setImmediate(s);
};
s();

