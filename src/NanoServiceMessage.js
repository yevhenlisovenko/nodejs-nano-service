const { v4: uuidv4 } = require("uuid");

class NanoServiceMessage {
  constructor(type, payload, meta = {}) {
    this.id = uuidv4();
    this.type = type;
    this.payload = payload;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  toJson() {
    return JSON.stringify(this);
  }

  static fromJson(jsonString) {
    const obj = JSON.parse(jsonString);
    return new NanoServiceMessage(obj.type, obj.payload, obj.meta);
  }
}

module.exports = NanoServiceMessage;
