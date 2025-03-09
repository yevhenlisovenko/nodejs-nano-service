require("dotenv").config();
const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = await amqp.connect({
        protocol: "amqp",
        hostname: process.env.AMQP_HOST,
        port: process.env.AMQP_PORT,
        username: process.env.AMQP_USER,
        password: process.env.AMQP_PASS,
        vhost: process.env.AMQP_VHOST,
      });
    }
    return this.connection;
  }

  async getChannel() {
    if (!this.channel) {
      const conn = await this.getConnection();
      this.channel = await conn.createChannel();
    }
    return this.channel;
  }

  async publish(event, payload) {
    const channel = await this.getChannel();
    const exchange = `${process.env.AMQP_PROJECT}.bus`;
    const routingKey = `${process.env.AMQP_PROJECT}.${event}`;

    await channel.assertExchange(exchange, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "topic" }, // Preserve topic routing
    });
    const message = new NanoServiceMessage(event, payload);

    try {
      channel.publish(exchange, routingKey, Buffer.from(message.toJson()));
    } catch (err) {
      console.error("Publishing Error:", err);
    }

    console.log(
      `Published event: ${event} to exchange: ${exchange} with routingKey: ${routingKey}`
    );
  }
}

module.exports = NanoPublisher;
