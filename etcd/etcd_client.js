#!/usr/local/bin/node

var Etcd = require('node-etcd');
var machines = {
    init: { host:'127.0.0.1', 
	    port: ((process.argv.length > 3)?process.argv[3]:'4001'), 
	    tryit: true }
};
function getconfig() {
    // getting the list of available host from etcd
    // this could alternatively also just be from a configuration file
    etcd.machines(function(err,nodes) {
	if (err) return setTimeout(getconfig, 10000);
	try {		    		    
	    var n = nodes.node.nodes;
	    for (var node in n) {
		machines[n[node].key] = {
		    host: '127.0.0.1', 
		    port: n[node].value.slice(30,34),
		    tryit: true};
	    }
	} catch(e) {
	    console.log(new Date(), e.toString());
	    setTimeout(getconfig, 30000);
	}
    });
}


var etcd = null;
// establish a connection to a host which is not down
// we are just doing a sequential scan though here and connect to the first
// available machine -- however for a actual deployment
// we would need to be more clever to even spread the load between the hosts.
function reconnect()
{
    for (var i in machines) {
	if (machines[i].tryit) {
	    machines[i].tryit = false;	    
	    etcd = new Etcd(machines[i].host, machines[i].port);
	    if (etcd) {
		console.log("CONNECTED", machines[i]);
		return;
	    }
	}
    }    
    while (true)
	// if we have tried all, then randomly pick any and keep trying
	// (maybe this should be the default....)
	for (var i in machines) { // find one at random
	    if (Math.random() < 0.05) {
		etcd = new Etcd(machines[i].host, machines[i].port);
		if (etcd) {
		    console.log("CONNECTEd", machines[i]);
		    return;
		}
	    }	    
	}
}
reconnect(); // establish initial connection

var i = 0;
var output = 0;
var settime = new Date();

switch (process.argv[2])
{

case 'setter':
    getconfig();
    function iter_set()
    {
	i = (i+1) % 100;    
	etcd.set("cnt/"+i, 
		 (new Date()).toString(),
		 function(err,e) {
		     setTimeout(iter_set,1000); 
		     if (err) return reconnect();
		     var now = new Date();	
		     console.log(err, e.prevNode.value, e.node.value, now-settime);
		     settime = now;
		 });
    }
    etcd.mkdir("cnt", iter_set );
    break;

case 'busysetter':
    getconfig();
    function iter_busyset()
    {
	i = (i+1) % 100;    
	etcd.set("cnt/"+i, 
		 (new Date()).toString(),
		 function(err,e) {
		     setImmediate(iter_busyset); 
		     if (err) return reconnect();
		     var now = new Date();
		     if ( (output++%1000)==5)	
			 console.log(err, e.prevNode.value, e.node.value, now-settime);
		     settime = now;
		 });
    }
    etcd.mkdir("cnt", iter_busyset );
    break;

case 'getter':
    getconfig();
    function iter_get(){
	i = (i+1) % 100;    
	etcd.get("cnt/"+i, function(err,e) {
	    setImmediate(iter_get);
	    if (err) return reconnect(); 
	    try {
		var now = new Date(), age = new Date(e.node.value);
		if ( (output++%10000)==5)
		    console.log(i, now, now - age);
		// Max time to cycle through for the setter
		// should be 100 sec, lets make some noise if the data looks stale
		// i.e older than 100 sec.
		if ( (now-age) > 110000) 
		    console.log(i, now, now - age, e);
	    } catch(e) {}
	});
    }
    iter_get();
    break;
    
case 'monitor':
    var m = {};
    function iter_mon(){
	etcd.machines(function(err,nodes) {
	    if (err) console.log("machines",err, nodes);
	    if (err) return reconnect();
	    etcd.leader(function(err,leader) {
		if (err) console.log("leader",err, leader);
		if (err) return reconnect();
		var now = new Date();
		n = nodes.node.nodes;
		var info = [];
		try {		    		    
		    for (var node in n) {
			machines[n[node].key] = {
			    host: '127.0.0.1', 
			    port: n[node].value.slice(30,34),
			    tryit: true};
			info.push((":"+n[node].value.slice(30,34)));
		    }
		    info.push(leader);
		} catch(e) {
		    console.log(new Date(), e.toString());
		}
		console.log(now,info);
	    });	    
	});
    }
    setInterval(iter_mon, 2000);
    break;


case 'watcher':

    getconfig();
    // Pick a key to watch
    i = parseInt(Math.random() * 100);
    var commitindex = 0;
    etcd.get("cnt/"+i, function(err,e) {
	commitindex = e.node.modifiedIndex;
	iter_watch();
    });
    function iter_watch(){	
	console.log("Wathing", commitindex+1);
	etcd.watchIndex("cnt/"+i, commitindex+1, function(err,e) {
	    // Simulate a `slow` watcher, to see that we get updates
	    // even if the wather is not ready yet
	    //setTimeout(iter_watch, Math.random()* 10000);
	    setImmediate(iter_watch);
	    console.log(e);
	    
	    if (err) console.log("watcher",err, e);
	    if (err) return reconnect(); 
	    try {
		var now = new Date(), age = new Date(e.node.value);
		if ( (output++%100)==5)
		    console.log(i, now, now - age);
		// Max time to cycle through for the setter
		// should be 100 sec, lets make some noise if the data looks stale
		// i.e older than 100 sec.
		if ( (now-age) > 110000) 
		    console.log(i, now, now - age, e);

		commitindex = e.node.modifiedIndex;
	    } catch(e) {}
	});
    }
    break;

    
default:
    console.log(process.argv);
    console.log("Usage: etcd_client [getter|setter|watcher]");
}