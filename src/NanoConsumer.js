const NanoServiceClass = require("./NanoServiceClass");
const NanoServiceMessage = require("./NanoServiceMessage");

class NanoConsumer extends NanoServiceClass {
  constructor() {
    super();
    this.exchange = this.getNamespace("bus");
    this.FAILED_POSTFIX = ".failed";
    this.handlers = { "system.ping.1": this.handleSystemPing.bind(this) };
    this._tries = 3;
    this._backoff = 0;
    this._events = [];
    this.catchCallback = null;
    this.failedCallback = null;
  }

  // Set the number of retry attempts
  tries(attempts) {
    this._tries = attempts;
    return this; // Return `this` for method chaining
  }

  // Set the backoff intervals (in seconds)
  backoff(intervals) {
    this._backoff = intervals;
    return this; // Return `this` for method chaining
  }

  // Set the callback for transient errors
  catch(callback) {
    this.catchCallback = callback;
    return this; // Return `this` for method chaining
  }

  // Set the callback for permanent failures
  failed(callback) {
    this.failedCallback = callback;
    return this; // Return `this` for method chaining
  }

  // Bind events to the queue
  events(...events) {
    this._events = events;
    return this; // Return `this` for method chaining
  }

  // Initialize the consumer
  async init() {
    await this.setupFailedQueue();
    await this.createExchangeIfNotExists(); // Create the exchange if it doesn't exist
    await this.bindEvents();
  }

  // Create the exchange if it doesn't exist
  async createExchangeIfNotExists() {
    const exchange = this.exchange; // Use the fully namespaced exchange name
    const ch = await this.getChannel();

    try {
      // Check if the exchange exists by attempting to declare it passively
      await ch.checkExchange(exchange);
      console.log(`Skipped. Exchange '${exchange}' already exists.`);
    } catch (err) {
      if (err.code === 404) {
        // Exchange does not exist, so create it
        await this.createExchange(exchange, "topic", { durable: true });
        console.log(`Exchange '${exchange}' created.`);
      } else {
        throw err; // Re-throw other errors
      }
    }
  }

  // Set up the failed queue and dead-letter exchange
  async setupFailedQueue() {
    const queue = this.getNamespace(this.getEnv("AMQP_MICROSERVICE_NAME")); // Use the full namespace for the queue name
    const dlx = `${queue}${this.FAILED_POSTFIX}`; // Failed queue name

    // Create the main queue with dead-letter exchange
    await this.createQueue(queue, {
      deadLetterExchange: dlx,
    });

    // Create the failed queue
    await this.createQueue(dlx);

    // Create the delayed exchange
    await this.createExchange(queue, "x-delayed-message", {
      arguments: { "x-delayed-type": "topic" },
    });

    // Bind the queue to itself (for dead-letter routing)
    const ch = await this.getChannel();
    await ch.bindQueue(queue, queue, "#");
  }

  // Bind events to the queue
  async bindEvents() {
    const exchange = this.exchange; // Use the fully namespaced exchange name
    const ch = await this.getChannel();

    // Bind user-defined events
    this._events.forEach((event) => ch.bindQueue(this.queue, exchange, event));

    // Bind system events (e.g., system.ping.1)
    Object.keys(this.handlers).forEach((systemEvent) => {
      ch.bindQueue(this.queue, exchange, systemEvent);
    });
  }

  // Start consuming messages
  async consume(handler) {
    await this.init();
    const ch = await this.getChannel();
    ch.prefetch(1); // Process one message at a time

    ch.consume(this.queue, async (msg) => {
      const message = this.parseMessage(msg);

      try {
        if (this.handlers[message.getEventName()]) {
          // Handle system events
          console.log("System event received: " + message.getEventName()); // Debugging
          await this.handlers[message.getEventName()](message);
          ch.ack(msg);
          return;
        }

        console.log("User event received: " + message.getEventName()); // Debugging

        await handler(message);
        ch.ack(msg);
      } catch (err) {
        await this.handleError(msg, err);
      }
    });
  }

  // Parse an AMQP message into a NanoServiceMessage
  parseMessage(msg) {
    const body = JSON.parse(msg.content.toString());
    const properties = msg.properties; // Preserve the original properties
    return new NanoServiceMessage(body, properties);
  }

  // Handle errors during message processing
  async handleError(msg, error) {
    // Ensure headers object exists
    if (!msg.properties.headers) {
      msg.properties.headers = {};
    }

    const retryCount = msg.properties.headers["x-retry-count"] || 0;
    if (retryCount < this._tries) {
      await this.retryMessage(msg, retryCount);
    } else {
      await this.sendToFailedQueue(msg, error);
    }
  }

  // Retry a failed message with backoff
  async retryMessage(msg, retryCount) {
    const delay = this.calculateBackoff(retryCount);
    const ch = await this.getChannel();

    // Ensure headers object exists
    if (!msg.properties.headers) {
      msg.properties.headers = {};
    }

    // Update retry count and delay
    msg.properties.headers["x-retry-count"] = retryCount + 1;
    msg.properties.headers["x-delay"] = delay;

    // Preserve the original properties and merge headers
    const properties = {
      ...msg.properties, // Copy all original properties
      headers: {
        ...msg.properties.headers, // Copy all original headers
        "x-retry-count": retryCount + 1,
        "x-delay": delay,
      },
    };

    // Republish the message
    ch.publish(this.exchange, msg.fields.routingKey, msg.content, properties);
    ch.ack(msg);
  }

  // Send a message to the failed queue
  async sendToFailedQueue(msg, error) {
    const ch = await this.getChannel();
    const failedQueue = `${this.queue}${this.FAILED_POSTFIX}`;

    // Parse the message and ensure it's a NanoServiceMessage instance
    const message = this.parseMessage(msg);

    // Add error details to the message
    message.setConsumerError(error.message);

    // Preserve the original properties and merge headers
    const properties = {
      ...msg.properties, // Copy all original properties
      headers: {
        ...msg.properties.headers, // Copy all original headers
        "x-retry-count": msg.properties.headers["x-retry-count"] || 0, // Ensure x-retry-count exists
        "x-delay": msg.properties.headers["x-delay"] || 0, // Ensure x-delay exists
      },
    };

    // Publish to the failed queue with the preserved properties and headers
    ch.publish("", failedQueue, message.toBuffer(), properties);

    // Acknowledge the original message
    ch.ack(msg);
  }

  // Calculate backoff time for retries
  calculateBackoff(retryCount) {
    return Array.isArray(this._backoff)
      ? this._backoff[Math.min(retryCount, this._backoff.length - 1)] * 1000
      : this._backoff * 1000;
  }

  // Handle system ping event
  async handleSystemPing(message) {
    console.log("System ping received:", message.getPayload());
    // Add custom logic for handling system ping
  }
}

module.exports = NanoConsumer;
