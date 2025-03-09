require("dotenv").config();
const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.message = null;
    this.delay = null;
    this.meta = {};
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

  setMeta(data) {
    this.meta = { ...this.meta, ...data };
    return this;
  }

  setMessage(message) {
    this.message = message;
    return this;
  }

  delay(milliseconds) {
    this.delay = milliseconds;
    return this;
  }

  async publish(event) {
    if (process.env.AMQP_PUBLISHER_ENABLED !== "true") {
      return;
    }

    const channel = await this.getChannel();
    const exchange = `${process.env.AMQP_PROJECT}.bus`;
    const routingKey = `${event}`;

    await channel.assertExchange(exchange, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "topic" },
    });

    this.message.type = event;
    this.message.set(
      "app_id",
      `${process.env.AMQP_PROJECT}.${process.env.AMQP_MICROSERVICE_NAME}`
    );

    if (this.delay) {
      this.message.set("application_headers", { "x-delay": this.delay });
    }

    if (Object.keys(this.meta).length > 0) {
      this.message.addMeta(this.meta);
    }

    channel.publish(exchange, routingKey, Buffer.from(this.message.toJson()), {
      headers: this.message.application_headers || {},
    });

    console.log(
      `✅ Published event: ${event} to exchange: ${exchange} with routingKey: ${routingKey}`
    );

    await channel.close();
    await this.connection.close();
    this.connection = null;
    this.channel = null;
  }
}

module.exports = NanoPublisher;
