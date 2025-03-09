require("dotenv").config();
const amqp = require("amqplib");

class NanoServiceClass {
  constructor(config = {}) {
    this.config = config;
    this.exchange = "bus";
    this.queue = "default";
    this.channel = null;
    this.connection = null;
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

  async exchange(exchange, type = "topic", options = {}) {
    this.exchange = this.getNamespace(exchange);
    return this.createExchange(this.exchange, type, options);
  }

  async createExchange(exchange, type = "topic", options = {}) {
    const channel = await this.getChannel();
    await channel.assertExchange(exchange, type, { durable: true, ...options });
    return this;
  }

  async queue(queue, options = {}) {
    this.queue = this.getNamespace(queue);
    return this.createQueue(this.queue, options);
  }

  async createQueue(queue, options = {}) {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, { durable: true, ...options });
    return this;
  }

  async declare(queue) {
    queue = this.getNamespace(queue);
    this.exchange = queue;
    this.queue = queue;
    await this.exchange(queue);
    await this.queue(queue);
    return this;
  }

  getProject() {
    return process.env.AMQP_PROJECT;
  }

  getNamespace(path) {
    return `${this.getProject()}.${path}`;
  }

  async reset() {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

module.exports = NanoServiceClass;
