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

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/nodejs-nano-service.git
   cd nodejs-nano-service
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   AMQP_PROJECT=easyweek-e2e
   AMQP_MICROSERVICE_NAME=demo-nodejs
   AMQP_HOST=127.0.0.1
   AMQP_PORT=5672
   AMQP_USER=user
   AMQP_PASS=ohCuYNimH2kq1UBuciOX
   AMQP_VHOST=easyweek-e2e
   ```

## Usage

### Publishing Messages

To publish a message, use the `NanoPublisher` class:

```javascript
const { NanoPublisher, NanoServiceMessage } = require("nodejs-nano-service");

(async () => {
  const publisher = new NanoPublisher();
  const message = new NanoServiceMessage({ payload: { key: "value" } });

  await publisher
    .setMessage(message)
    .setMeta({ tenant: "example-tenant" })
    .delay(5000) // 5-second delay
    .publish("company.created");
})();
```

### Consuming Messages

To consume messages, use the `NanoConsumer` class:

```javascript
const { NanoConsumer } = require("nodejs-nano-service");
const handlers = require("./handlers");

const EVENT_HANDLERS = {
  "company.created": handlers.CustomerCreatedHandler,
};

(async () => {
  const consumer = new NanoConsumer()
    .events(...Object.keys(EVENT_HANDLERS)) // Bind to user-defined events
    .tries(4) // Retry up to 4 times
    .backoff([5, 15, 60, 300]) // Backoff intervals in seconds
    .catch((error, message) => {
      console.error("⚠️ Catchable error", {
        error: error.message,
        event: message.getEventName(),
      });
    })
    .failed((error, message) => {
      console.error("❌ Permanent error", {
        error: error.message,
        event: message.getEventName(),
      });
    });

  await consumer.consume(async (message) => {
    const handler = EVENT_HANDLERS[message.getEventName()];
    if (handler) {
      await handler(message);
      console.log(`✅ Handled event: ${message.getEventName()}`);
    } else {
      console.warn(`⚠️ No handler for event: ${message.getEventName()}`);
    }
  });
})();
```

### Example Handlers

Define your event handlers in a separate file (e.g., `handlers.js`):

```javascript
module.exports = {
  CustomerCreatedHandler: async (message) => {
    const payload = message.getPayload();
    console.log("Handling company.created event:", payload);
    // Add your business logic here
  },
};
```

## Configuration

### Environment Variables

| Variable                 | Description                          | Example Value          |
| ------------------------ | ------------------------------------ | ---------------------- |
| `AMQP_PROJECT`           | Project namespace for RabbitMQ       | `easyweek-e2e`         |
| `AMQP_MICROSERVICE_NAME` | Microservice name for RabbitMQ queue | `demo-nodejs`          |
| `AMQP_HOST`              | RabbitMQ host                        | `127.0.0.1`            |
| `AMQP_PORT`              | RabbitMQ port                        | `5672`                 |
| `AMQP_USER`              | RabbitMQ username                    | `user`                 |
| `AMQP_PASS`              | RabbitMQ password                    | `ohCuYNimH2kq1UBuciOX` |
| `AMQP_VHOST`             | RabbitMQ virtual host                | `easyweek-e2e`         |

### Retry and Backoff

- **Retry Attempts**: Configure the number of retry attempts using the `tries` method.
- **Backoff Intervals**: Configure backoff intervals (in seconds) using the `backoff` method.

Example:

```javascript
const consumer = new NanoConsumer()
  .tries(4) // Retry up to 4 times
  .backoff([5, 15, 60, 300]); // Backoff intervals: 5s, 15s, 60s, 300s
```

## Logging

The project uses `winston` for logging. Logs are output in JSON format to the console.

Example log output:

```json
{"level":"info","message":"🚀 Starting consumer: easyweek-e2e.demo-nodejs"}
{"level":"info","message":"✅ Handled event: company.created"}
{"level":"error","message":"⚠️ Catchable error","error":"Some error message","event":"company.created"}
```

## Error Handling

- **Transient Errors**: Use the `catch` method to handle transient errors (e.g., network issues).
- **Permanent Errors**: Use the `failed` method to handle permanent errors (e.g., invalid data).

Example:

```javascript
const consumer = new NanoConsumer()
  .catch((error, message) => {
    console.error("⚠️ Catchable error", {
      error: error.message,
      event: message.getEventName(),
    });
  })
  .failed((error, message) => {
    console.error("❌ Permanent error", {
      error: error.message,
      event: message.getEventName(),
    });
  });
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This `README.md` provides a clear and concise overview of your project, making it easy for users and contributors to understand and use your library. You can customize it further based on your specific needs.
