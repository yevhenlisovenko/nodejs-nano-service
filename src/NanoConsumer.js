require("dotenv").config();
const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoConsumer {
  static FAILED_POSTFIX = ".failed";

  constructor(events = []) {
    this.connection = null;
    this.channel = null;
    this.handlers = {};
    this.callback = null;
    this.catchCallback = null;
    this.failedCallback = null;
    this.debugCallback = null;
    this.events = events;
    this.tries = 3;
    this.backoff = [5, 15, 60, 300];
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
    await channel.assertExchange(this.exchange, "topic", { durable: true });

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

    await channel.assertExchange(dlx, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "topic" },
    });

    await channel.assertQueue(dlx, { durable: true });
    await channel.bindQueue(this.queue, dlx, "#");
  }

  // ✅ These methods ensure chaining works correctly:
  tries(attempts) {
    this._tries = attempts;
    return this;
  }

  backoff(seconds) {
    this._backoff = Array.isArray(seconds) ? seconds : [seconds];
    return this;
  }

  catch(callback) {
    this.catchCallback = callback;
    return this;
  }

  failed(callback) {
    this.failedCallback = callback;
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
        const message = NanoServiceMessage.fromJson(msg.content.toString());
        const eventType = message.type;
        let retryCount = (message.getRetryCount() || 0) + 1;

        const handler = this.handlers[eventType] || this.callback;

        try {
          await handler(message);
          channel.ack(msg);
        } catch (error) {
          if (retryCount < this._tries) {
            if (this.catchCallback) {
              this.catchCallback(error, message);
            }
            const headers = {
              "x-delay": this.getBackoff(retryCount),
              "x-retry-count": retryCount,
            };
            channel.publish(
              this.exchange,
              eventType,
              Buffer.from(message.toJson()),
              { headers }
            );
            channel.ack(msg);
          } else {
            if (this.failedCallback) {
              this.failedCallback(error, message);
            }
            const headers = { "x-retry-count": retryCount };
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

  async shutdown() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  getBackoff(retryCount) {
    return (
      (this._backoff[Math.min(retryCount - 1, this._backoff.length - 1)] || 0) *
      1000
    );
  }
}

module.exports = NanoConsumer;
