const amqp = require("amqplib");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoConsumer {
  static FAILED_POSTFIX = ".failed";

  constructor() {
    this.connection = null;
    this.channel = null;
    this.eventsList = [];
    this.handlers = {};
    this.callback = null;
    this.catchCallback = null;
    this.failedCallback = null;
    this.triesCount = 3;
    this.backoffIntervals = [5000, 15000, 60000];
    this.queue = `${process.env.AMQP_PROJECT}.${process.env.AMQP_MICROSERVICE_NAME}`;
    this.exchange = `${process.env.AMQP_PROJECT}.bus`;
  }

  events(...events) {
    this.eventsList = events;
    return this;
  }

  tries(count) {
    this.triesCount = count;
    return this;
  }

  backoff(intervals) {
    this.backoffIntervals = Array.isArray(intervals) ? intervals : [intervals];
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
    const channel = await this.getChannel();
    const dlx = `${this.queue}${NanoConsumer.FAILED_POSTFIX}`;

    // Exchange (bus)
    await channel.assertExchange(this.exchange, "topic", { durable: true });

    // Main queue with DLX
    await channel.assertQueue(this.queue, {
      durable: true,
      arguments: { "x-dead-letter-exchange": dlx },
    });

    // Delayed exchange for retries
    await channel.assertExchange(this.queue, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "topic" },
    });

    // DLX Queue
    await channel.assertQueue(dlx, { durable: true });

    // Bind main queue to delayed exchange for retry
    await channel.bindQueue(this.queue, this.queue, "#");

    // Bind events
    for (const event of this.eventsList) {
      await channel.bindQueue(this.queue, this.exchange, event);
    }
  }

  async consume(callback) {
    this.callback = callback;
    await this.init();
    const channel = await this.getChannel();
    await channel.prefetch(1);

    channel.consume(this.queue, async (msg) => {
      const message = NanoServiceMessage.fromJson(msg.content.toString());
      const eventType = message.type;
      const retryCount = (msg.properties.headers["x-retry-count"] || 0) + 1;

      try {
        await this.callback(message);
        channel.ack(msg);
      } catch (error) {
        if (retryCount < this.triesCount) {
          if (this.catchCallback) this.catchCallback(error, message);

          channel.publish(this.queue, eventType, msg.content, {
            headers: {
              "x-delay": this.getBackoff(retryCount),
              "x-retry-count": retryCount,
            },
          });
        } else {
          if (this.failedCallback) this.failedCallback(error, message);

          channel.publish(
            "",
            this.queue + NanoConsumer.FAILED_POSTFIX,
            msg.content,
            {
              headers: { "x-retry-count": retryCount },
            }
          );
        }
        channel.ack(msg);
      }
    });
  }

  getBackoff(retryCount) {
    return this.backoffIntervals[
      Math.min(retryCount - 1, this.backoffIntervals.length - 1)
    ];
  }
}

module.exports = NanoConsumer;
