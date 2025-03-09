require("dotenv").config();
const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoConsumer {
  static FAILED_POSTFIX = ".failed";

  constructor() {
    this.connection = null;
    this.channel = null;
    this.handlers = {};
    this.callback = null;
    this.catchCallback = null;
    this.failedCallback = null;
    this.debugCallback = null;
    this.events = [];
    this.tries = 3;
    this.backoff = 0;
    this.queue = `${process.env.AMQP_PROJECT}.${process.env.AMQP_MICROSERVICE_NAME}`;
    this.exchange = `${process.env.AMQP_PROJECT}.bus`;
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

  async init() {
    await this.initialWithFailedQueue();
    const channel = await this.getChannel();
    for (const event of this.events) {
      await channel.bindQueue(this.queue, this.exchange, event);
    }
    for (const systemEvent of Object.keys(this.handlers)) {
      await channel.bindQueue(this.queue, this.exchange, systemEvent);
    }
  }

  async initialWithFailedQueue() {
    const channel = await this.getChannel();
    const dlx = `${this.queue}${NanoConsumer.FAILED_POSTFIX}`;

    await channel.assertQueue(this.queue, {
      durable: true,
      arguments: { "x-dead-letter-exchange": dlx },
    });
    await channel.assertExchange(this.queue, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "topic" },
    });
    await channel.assertQueue(dlx, { durable: true });
    await channel.bindQueue(this.queue, this.queue, "#");
  }

  events(...events) {
    this.events = events;
    return this;
  }

  tries(attempts) {
    this.tries = attempts;
    return this;
  }

  backoff(seconds) {
    this.backoff = seconds;
    return this;
  }

  async consume(callback, debugCallback = null) {
    await this.init();
    this.callback = callback;
    this.debugCallback = debugCallback;
    const channel = await this.getChannel();
    await channel.prefetch(1);

    channel.consume(this.queue, async (msg) => {
      if (msg) {
        const message = new NanoServiceMessage(
          msg.content.toString(),
          msg.properties
        );
        const eventType = message.type;

        if (this.handlers[eventType]) {
          this.handlers[eventType](message);
          channel.ack(msg);
          return;
        }

        const retryCount = (message.getRetryCount() || 0) + 1;
        try {
          await this.callback(message);
          channel.ack(msg);
        } catch (error) {
          if (retryCount < this.tries) {
            if (this.catchCallback) {
              this.catchCallback(error, message);
            }
            const headers = {
              "x-delay": this.getBackoff(retryCount),
              "x-retry-count": retryCount,
            };
            message.set("application_headers", headers);
            channel.publish(
              this.queue,
              eventType,
              Buffer.from(message.toJson()),
              {
                headers,
              }
            );
            channel.ack(msg);
          } else {
            if (this.failedCallback) {
              this.failedCallback(error, message);
            }
            const headers = { "x-retry-count": retryCount };
            message.set("application_headers", headers);
            channel.publish(
              "",
              this.queue + NanoConsumer.FAILED_POSTFIX,
              Buffer.from(message.toJson()),
              { headers }
            );
            channel.ack(msg);
          }
        }
      }
    });
  }

  catch(callback) {
    this.catchCallback = callback;
    return this;
  }

  failed(callback) {
    this.failedCallback = callback;
    return this;
  }

  async shutdown() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  getBackoff(retryCount) {
    if (Array.isArray(this.backoff)) {
      return (
        (this.backoff[Math.min(retryCount - 1, this.backoff.length - 1)] || 0) *
        1000
      );
    }
    return this.backoff * 1000;
  }
}

module.exports = NanoConsumer;
