import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "USD"
    },
    merchant: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    paymentMethod: {
      type: String,
      default: ""
    },
    deviceId: {
      type: String,
      default: ""
    },
    timestamp: {
      type: Date,
      required: true
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
      index: true
    },
    ruleSignals: {
      type: [String],
      default: []
    },
    aiSignals: {
      type: [String],
      default: []
    },
    aiExplanation: {
      type: String,
      default: ""
    },
    alerted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
