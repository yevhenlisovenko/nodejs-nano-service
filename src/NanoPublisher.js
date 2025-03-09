const NanoServiceClass = require("./NanoServiceClass");

class NanoPublisher extends NanoServiceClass {
  constructor() {
    super();
    this.exchange = "bus"; // Use the fully namespaced exchange name
    this.message = null;
    this.delay = null;
    this.meta = {};
  }

  // Set the message to publish
  setMessage(message) {
    this.message = message;
    return this; // Return `this` for method chaining
  }

  // Set the delay (in milliseconds)
  delay(ms) {
    this.delay = ms;
    return this; // Return `this` for method chaining
  }

  // Add metadata to the message
  setMeta(data) {
    this.meta = { ...this.meta, ...data };
    return this; // Return `this` for method chaining
  }

  // Publish the message to the exchange
  async publish(event) {
    if (!this.message) {
      throw new Error("No message set. Use setMessage() to set the message.");
    }

    const exchange = this.getNamespace(this.exchange);
    const ch = await this.getChannel();

    // Set event and metadata
    this.message.setEvent(event);
    this.message.set(
      "app_id",
      this.getNamespace(this.getEnv("AMQP_MICROSERVICE_NAME"))
    );

    // Apply delay if set
    if (this.delay) {
      this.message.set("application_headers", { "x-delay": this.delay });
    }

    // Add metadata to the message
    if (Object.keys(this.meta).length > 0) {
      this.message.addMeta(this.meta);
    }

    // Publish the message
    ch.publish(exchange, event, this.message.toBuffer(), {
      headers: this.message.get("application_headers"),
    });

    // Close the channel and connection
    await this.close();
  }
}

module.exports = NanoPublisher;
