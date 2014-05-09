#!/usr/local/bin/node

var qs=require('querystring');
var url=require('url')
var Etcd = require('node-etcd');
var machines = {
    init: { host: '54.212.30.182',
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
		var u = url.parse(qs.parse(n[node].value).etcd);
		machines[n[node].key] = {
		    host: u.hostname, 
		    port: u.port || '4001',
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
machines = {};

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
		     if (e)
			 console.log(err, e.prevNode?e.prevNode.value:null, e.node?e.node.value:null, now-settime);
		     settime = now;
		 });
    }
    etcd.mkdir("cnt", iter_set );
    break;

case 'busysetter':
    getconfig();
    var timing = { c: 0, s: new Date()}
    function iter_busyset()
    {
	i = (i+1) % 100;    
	etcd.set("cnt/"+i, 
		 (new Date()).toString(),
		 function(err,e) {
		     setImmediate(iter_busyset); 
		     if (err) return reconnect();
		     timing.c += 1;
		     var now = new Date();
		     if ( (output++%25)==5) {
			 console.log("op/s", timing.c*1000.0/(now-timing.s), " from ", timing.c,now-timing.s);
			 timing = {c:0, s: now};
		     }
		 });
    }
    etcd.mkdir("cnt", iter_busyset );
    break;

case 'spawnsetter':
    getconfig();
    var timing = { c: 0, s: new Date()}
    function iter_spawnset()
    {
	i = (i+1) % 100;    
	etcd.set("cnt/"+i, 
		 (new Date()).toString(),
		 function(err,e) {
		     setImmediate(iter_spawnset); 
		     if (err) return reconnect();
		     timing.c += 1;
		     var now = new Date();
		     if ( (output++%400)==35) {
			 console.log("op/s", timing.c*1000.0/(now-timing.s), " from ", timing.c,now-timing.s);
			 timing = {c:0, s: now};
		     }
		 });
    }
    for (var j=0; j<20; j++)
	setTimeout(iter_spawnset,j*100);
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
		if ( (output++%100)==5)
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
		n = nodes&&nodes.node?nodes.node.nodes:[];
		var info = [];
		try {		    		    
		    for (var node in n) {
			var u = url.parse(qs.parse(n[node].value).etcd);
			machines[n[node].key] = {
			    host: u.hostname, 
			    port: u.port || '4001',
			    tryit: true};
			info.push([u.hostname,u.port].join(':'));
		    }
		    info.push(leader);
		} catch(e) {
		    console.log((new Date()), e.toString());
		}
		console.log(info.join(' / '));
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
	commitindex = e.node?parseInt(e.node.modifiedIndex):0;
	iter_watch();
    });
    function iter_watch(){	
	console.log("Wathing", commitindex+1);
	etcd.watchIndex("cnt/"+i, commitindex+1, function(err,e) {
	    if (err && err.errorCode == 401) {
		return etcd.get("cnt/"+i, function(err,e) {
		    commitindex = e.node?parseInt(e.node.modifiedIndex):0;
		    iter_watch();
		});
	    }
	    // Simulate a `slow` watcher, to see that we get updates
	    // even if the wather is not ready yet
	    setTimeout(iter_watch, Math.random()* 100);
	    //setImmediate(iter_watch);
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

		commitindex = e.node?parseInt(e.node.modifiedIndex):0;
	    } catch(e) {}
	});
    }
    break;


case 'spawnwatcher':

    getconfig();
    // Pick a key to watch
    function spawn_watch() {
	var i = parseInt(Math.random() * 100);
	var commitindex = 0;
	etcd.get("cnt/"+i, function(err,e) {
	    commitindex = e.node?parseInt(e.node.modifiedIndex):0;
	    iter_swatch();
	});
	function iter_swatch(){	
	    //console.log("Wathing", commitindex+1);
	    etcd.watchIndex("cnt/"+i, commitindex+1, function(err,e) {
		if (err && err.errorCode == 401) {
		    return etcd.get("cnt/"+i, function(err,e) {
			commitindex = e.node?parseInt(e.node.modifiedIndex):0;
			iter_swatch();
		    });
		}
		// Simulate a `slow` watcher, to see that we get updates
		// even if the wather is not ready yet
		setTimeout(iter_swatch, Math.random()* 100);
		//setImmediate(iter_watch);
		
		if (err) console.log("watcher",err, e);
		if (err) return reconnect(); 
		try {
		    var now = new Date(), age = new Date(e.node.value);
		    if ( (output++%1000)==5)
			console.log(i, now, now - age);
		    // Max time to cycle through for the setter
		    // should be 100 sec, lets make some noise if the data looks stale
		    // i.e older than 100 sec.
		    if ( (now-age) > 110000) 
			console.log(i, now, now - age, e);
		    
		    commitindex = e.node?parseInt(e.node.modifiedIndex):0;
		} catch(e) {}
	    });
	}
    }
    for (var j=0; j < 200; j++)
	setTimeout(spawn_watch, j*100);
    break;
	
    
default:
    console.log(process.argv);
    console.log("Usage: etcd_client [getter|setter|watcher]");
}
