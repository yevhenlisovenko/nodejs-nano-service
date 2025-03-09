const amqp = require("amqplib");

class NanoPublisher {
  constructor(url) {
    this.url = url;
  }

  async publish(queue, message) {
    const conn = await amqp.connect(this.url);
    const channel = await conn.createChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    console.log(`Published message to ${queue}:`, message);
    await channel.close();
    await conn.close();
  }
}

module.exports = NanoPublisher;
