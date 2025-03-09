# NodeJS Nano-Service

## Introduction

NodeJS Nano-Service is a lightweight event-driven microservices package for **RabbitMQ**. It allows PHP-like message publishing and consuming within a **Node.js microservices architecture**.

## Features

- **Publish & Consume** messages via RabbitMQ
- **Event-driven architecture**
- **Standardized messages** using `NanoServiceMessage`
- **Microservice-ready** with `NanoServiceClass`
- **Easily scalable**

## Installation

Run the following command in your project directory:

```sh
yarn add amqplib dotenv uuid
```

## Setup

Initialize the project:

```sh
yarn init -y
```

Set up RabbitMQ using Docker:

```sh
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

Access RabbitMQ at: [http://localhost:15672](http://localhost:15672) (User: `guest`, Password: `guest`).

## Usage

### 1. Publish Messages

Use `NanoPublisher` to send messages.

```javascript
const { NanoPublisher } = require("./index");

const publisher = new NanoPublisher("amqp://guest:guest@localhost:5672");
publisher.publish("test_queue", { text: "Hello World" });
```

### 2. Consume Messages

Use `NanoConsumer` to receive messages.

```javascript
const { NanoConsumer } = require("./index");

const consumer = new NanoConsumer(
  "amqp://guest:guest@localhost:5672",
  "test_queue"
);
consumer.consume((msg) => console.log("Received:", msg));
```

### 3. Standardized Message Format

Use `NanoServiceMessage` to create consistent messages.

```javascript
const { NanoServiceMessage } = require("./index");

const message = new NanoServiceMessage("order.created", { order_id: 123 });
console.log(message.toJson());
```

### 4. Implementing a Microservice

Use `NanoServiceClass` to manage messaging logic.

```javascript
const { NanoServiceClass } = require("./index");

class OrderService extends NanoServiceClass {
  handleMessage(message) {
    console.log("Processing Order:", message);
  }
}

const orderService = new OrderService(
  "amqp://guest:guest@localhost:5672",
  "order.created"
);
orderService.start();
```

## Environment Variables

Set up `.env` file for RabbitMQ configuration:

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## Deployment with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN yarn install
CMD ["node", "index.js"]
```

Build and run:

```sh
docker build -t nano-service .
docker run -d nano-service
```

## Future Enhancements

- Support for **Kafka, Redis Pub/Sub**
- **Automated reconnecting** to RabbitMQ
- More **examples and tutorials**

## License

MIT License.

## Contributing

Open an issue or submit a PR to improve this package!
