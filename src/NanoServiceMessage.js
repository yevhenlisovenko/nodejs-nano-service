const { v4: uuidv4 } = require("uuid");

class NanoServiceMessage {
  constructor(type, payload) {
    this.id = uuidv4();
    this.type = type;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
  }

  toJson() {
    return JSON.stringify(this);
  }

  static fromJson(jsonString) {
    const obj = JSON.parse(jsonString);
    return new NanoServiceMessage(obj.type || "unknown", obj.payload || {});
  }
}

module.exports = NanoServiceMessage;
