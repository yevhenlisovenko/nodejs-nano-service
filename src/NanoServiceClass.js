const NanoPublisher = require("./NanoPublisher");
const NanoConsumer = require("./NanoConsumer");

class NanoServiceClass {
  constructor(url, queue) {
    this.publisher = new NanoPublisher(url);
    this.consumer = new NanoConsumer(url, queue);
  }

  async start(handler) {
    await this.consumer.consume(handler);
  }

  async send(queue, message) {
    await this.publisher.publish(queue, message);
  }
}

module.exports = NanoServiceClass;
