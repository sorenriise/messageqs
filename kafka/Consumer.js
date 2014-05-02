


var kafka = require('kafka-node'),
    Producer = kafka.Producer,
    client = new kafka.Client(),
    producer = new Producer(client);
// Create topics sync
producer.createTopics(['topic1','topic2'], false, function (err, data) {
    console.log("topic creation",data);
});



var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    client = new kafka.Client(),
    consumer = new Consumer(
        client,
        [
            { topic: 'topic1', partition: 0 }, { topic: 'topic2', partition: 1 }
        ],
        {
            autoCommit: false
        }
    );
consumer.on('message', function (message) {
    console.log("consumer message",message);
});


var kafka = require('kafka-node'),
    Producer = kafka.Producer,
    client = new kafka.Client(),
    producer = new Producer(client),
    payloads = [
        { topic: 'topic1', messages: 'hi', partition: 0 },
        { topic: 'topic2', messages: ['hello', 'world'] }
    ];

producer.on('ready', function () {
    producer.send(payloads, function (err, data) {
        console.log("producer message",data);
    });
});


