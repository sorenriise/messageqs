var Kafka = require('kafka0.8');

var zkClient = new Kafka.Zookeeper();

//var transport = new Kafka.Transport({
//    zkClient: zkClient
//})

var transport = new Kafka.Transport({
        brokers: [ 'localhost' ]
    })

var stringSerializer = new Kafka.Serializer.String();
var jsonSerializer = new Kafka.Serializer.Json();

var topic = process.argv[2];

var cnt = 0;
var ent = 0;

var consumer = new Kafka.Consumer({
	transport: transport,
	// store: new Kafka.Store.Zookeeper({ zkClient: zkClient }),
	store: new Kafka.Store.Memory(),
	payloads: [
		{
			topic: [ 'test' ],
			group: 'test-group',
			serializer: jsonSerializer,
			partition: [ 0 ]
		}
	]
}
, function() {

	function do_consume() {
	        
		consumer.consume(function(msg, meta, next) {
		    if (cnt ++ % 1000 === 0) 
			console.log('Topic:', meta.topic, '- Partition:', meta.partition, '- Offset:', meta.offset, '- Message:', msg);
		    next();
		}
                , function() {
		    if (ent++ % 100 == 0) 
			console.log('end of message set', new Date());
		
                }
		, function(err) {
			if(err) {
				console.log(err);
			}
			setTimeout(function() {
				do_consume();
			}, 1)
		});
	}

	do_consume();

})
