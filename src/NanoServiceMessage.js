const { v4: uuidv4 } = require("uuid");

class NanoServiceMessage {
  constructor(data = {}, properties = {}) {
    this.body = {
      meta: {},
      status: { code: "unknown", data: [] },
      payload: {},
      system: {
        is_debug: false,
        consumer_error: null,
        created_at: this.getTimestampWithMs(),
      },
      ...data,
    };
    this.properties = {
      messageId: uuidv4(), // Default messageId if not provided
      deliveryMode: 2, // Persistent by default
      ...properties, // Override with provided properties
      headers: properties.headers || {}, // Ensure headers is always an object
    };
  }

  // Set the event type
  setEvent(event) {
    this.properties.headers.type = event;
    return this;
  }

  // Set the delay (in milliseconds)
  setDelay(ms) {
    this.properties.headers["x-delay"] = ms;
    return this;
  }

  // Add metadata to the message
  addMeta(data) {
    this.body.meta = { ...this.body.meta, ...data };
    return this;
  }

  // Get the message payload
  getPayload() {
    return this.body.payload;
  }

  // Get the event type
  getEventName() {
    return this.properties.type;
  }

  // Get retry count
  getRetryCount() {
    return this.properties.headers["x-retry-count"] || 0;
  }

  // Get the message ID
  getId() {
    return this.properties.messageId;
  }

  // Convert the message to a buffer
  toBuffer() {
    return Buffer.from(JSON.stringify(this.body));
  }

  // Get the current timestamp with milliseconds
  getTimestampWithMs() {
    const now = new Date();
    return now.toISOString().replace(/\.\d+Z$/, `.${now.getMilliseconds()}Z`);
  }

  // Set consumer error
  setConsumerError(errorMessage) {
    this.body.system.consumer_error = errorMessage;
    return this;
  }
}

module.exports = NanoServiceMessage;
