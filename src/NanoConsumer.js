const amqp = require("amqplib");

class NanoConsumer {
  constructor(url, queue) {
    this.url = url;
    this.queue = queue;
  }

  async consume(callback) {
    const conn = await amqp.connect(this.url);
    const channel = await conn.createChannel();
    await channel.assertQueue(this.queue, { durable: true });
    console.log(`Waiting for messages in ${this.queue}...`);

    channel.consume(this.queue, (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());
        callback(message);
        channel.ack(msg);
      }
    });
  }
}

module.exports = NanoConsumer;
