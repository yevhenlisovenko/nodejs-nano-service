const amqp = require("amqplib");

class NanoServiceClass {
  constructor(config = {}) {
    this.config = config;
    this.connection = null;
    this.channel = null;
    this.exchange = this.getNamespace("bus"); // Default exchange
    this.queue = this.getNamespace(this.getEnv("AMQP_MICROSERVICE_NAME")); // Use the full namespace for the queue name
  }

  // Get an environment variable
  getEnv(key) {
    const value = process.env[key];
    if (!value) throw new Error(`Environment variable ${key} not found`);
    return value;
  }

  // Get the project namespace
  getProject() {
    return this.getEnv("AMQP_PROJECT");
  }

  // Get the full namespace for a path
  getNamespace(path) {
    return `${this.getProject()}.${path}`;
  }

  // Connect to RabbitMQ
  async connect() {
    if (!this.connection) {
      this.connection = await amqp.connect({
        hostname: this.getEnv("AMQP_HOST"),
        port: parseInt(this.getEnv("AMQP_PORT")),
        username: this.getEnv("AMQP_USER"),
        password: this.getEnv("AMQP_PASS"),
        vhost: this.getEnv("AMQP_VHOST"),
      });
    }
    return this.connection;
  }

  // Get the AMQP channel
  async getChannel() {
    if (!this.channel) {
      const conn = await this.connect();
      this.channel = await conn.createChannel();
    }
    return this.channel;
  }

  // Create an exchange
  async createExchange(exchange, type = "topic", options = {}) {
    const ch = await this.getChannel();
    await ch.assertExchange(exchange, type, options);
  }

  // Create a queue
  async createQueue(queue, options = {}) {
    const ch = await this.getChannel();
    await ch.assertQueue(queue, options);
  }

  // Close the connection and channel
  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.channel = null;
    this.connection = null;
  }
}

module.exports = NanoServiceClass;
