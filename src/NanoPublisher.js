const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoPublisher {
  async publish(event, payload, delay = null, meta = {}) {
    if (process.env.AMQP_PUBLISHER_ENABLED !== "true") return;

    const conn = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.AMQP_HOST,
      port: process.env.AMQP_PORT,
      username: process.env.AMQP_USER,
      password: process.env.AMQP_PASS,
      vhost: process.env.AMQP_VHOST,
    });
    const channel = await conn.createChannel();
    const exchange = `${process.env.AMQP_PROJECT}.bus`;

    await channel.assertExchange(exchange, "topic", { durable: true });

    const message = new NanoServiceMessage(event, payload, meta);
    const headers = delay ? { "x-delay": delay } : {};

    channel.publish(exchange, event, Buffer.from(message.toJson()), {
      headers,
    });

    await channel.close();
    await conn.close();
  }
}

module.exports = NanoPublisher;
