# NodeJS Nano-Service

## Introduction

NodeJS Nano-Service is a lightweight event-driven microservices package for **RabbitMQ**. It allows seamless **message publishing and consuming** within a **Node.js microservices architecture**, ensuring **scalability, reliability, and efficiency** in **distributed systems**.

## Features

- 📡 **Event-Driven Architecture** – Publish and consume messages efficiently
- 🚀 **Scalable & High-Performance** – Ideal for real-time applications
- 🔄 **Standardized Messages** – Uses `NanoServiceMessage` for structured event communication
- 🎯 **Microservice-Ready** – `NanoServiceClass` makes integration simple
- 🌐 **Supports AMQP/RabbitMQ** – Built-in support for RabbitMQ message brokering
- 📊 **Enterprise-Level Logging** – Uses **Winston** for logging and **Sentry** for error tracking
- 🛠️ **Easily Extensible** – Add custom event handlers for business logic

## Installation

Install the package via Yarn or NPM:

```sh
yarn add nodejs-nano-service
```

OR

```sh
npm install nodejs-nano-service
```

Ensure **RabbitMQ** is installed and running. You can start a local instance using Docker:

```sh
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

Access RabbitMQ Management UI: [http://localhost:15672](http://localhost:15672) (User: `guest`, Password: `guest`).

## Usage

### 1. Publish Messages

Use `NanoPublisher` to send messages to RabbitMQ.

```javascript
const { NanoPublisher } = require("nodejs-nano-service");

const publisher = new NanoPublisher("amqp://guest:guest@localhost:5672");
publisher.publish("event_queue", "order.created", {
  order_id: 123,
  total: 99.99,
});
```

### 2. Consume Messages

Use `NanoConsumer` to listen for messages from RabbitMQ.

```javascript
const { NanoConsumer } = require("nodejs-nano-service");

const consumer = new NanoConsumer(
  "amqp://guest:guest@localhost:5672",
  "event_queue"
);
consumer.consume((msg) => {
  console.log("Received event:", msg);
});
```

### 3. Standardized Message Format

Use `NanoServiceMessage` for structured communication between services.

```javascript
const { NanoServiceMessage } = require("nodejs-nano-service");

const message = new NanoServiceMessage("order.created", {
  order_id: 123,
  total: 99.99,
});
console.log(message.toJson());
```

### 4. Implementing a Microservice

Use `NanoServiceClass` for handling events in a microservice.

```javascript
const { NanoServiceClass } = require("nodejs-nano-service");

class OrderService extends NanoServiceClass {
  async handleMessage(message) {
    console.log("Processing Order:", message.payload);
  }
}

const orderService = new OrderService(
  "amqp://guest:guest@localhost:5672",
  "order.created"
);
orderService.start();
```

## Environment Variables

Set up a `.env` file for RabbitMQ connection:

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## Deployment with Docker

Create a `Dockerfile` for deployment:

```dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN yarn install
CMD ["node", "index.js"]
```

Build and run your service:

```sh
docker build -t nano-service .
docker run -d nano-service
```

## Advanced Features

### 📡 **Event Handling with Custom Handlers**

You can define event handlers similar to the PHP **NanoService** package.

#### Example: Custom Handler for `company.created` Event

```javascript
const winston = require("winston");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

module.exports = async function CustomerCreatedHandler(message) {
  logger.info("Processing Customer Created Event", {
    payload: message.payload,
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  logger.info("Customer Created Event processed successfully");
};
```

### 📌 **Centralized Consumer Command**

Run all event consumers in a single entry point, similar to PHP.

```javascript
const { NanoConsumer } = require("nodejs-nano-service");
const handlers = require("./handlers"); // Import handlers

const consumer = new NanoConsumer(
  "amqp://guest:guest@localhost:5672",
  "event_queue"
);
consumer.consume(async (message) => {
  if (handlers[message.type]) {
    await handlers[message.type](message);
  } else {
    console.error("No handler found for:", message.type);
  }
});
```

## Future Enhancements

- ✅ **Support for Kafka, Redis Pub/Sub**
- ✅ **Automated reconnection to RabbitMQ**
- ✅ **Built-in retries and exponential backoff**
- ✅ **More examples and tutorials**

## Contributing

We welcome contributions! Please **fork**, create a **branch**, and submit a **pull request**.

## License

MIT License.

## Links & Resources

- **GitHub Repository**: [https://github.com/yevhenlisovenko/nodejs-nano-service](https://github.com/yevhenlisovenko/nodejs-nano-service)
- **NPM Package**: [https://www.npmjs.com/package/nodejs-nano-service](https://www.npmjs.com/package/nodejs-nano-service)

🚀 **Now your microservices can communicate efficiently using RabbitMQ!**
