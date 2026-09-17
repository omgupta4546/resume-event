const mongoose = require('mongoose');

const voteRecordSchema = new mongoose.Schema({
  resumeIndex: {
    type: Number,
    required: true,
  },
  resumeLabel: {
    type: String,
    default: '',
  },
  acceptCount: {
    type: Number,
    required: true,
    default: 0,
  },
  rejectCount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalVoters: {
    type: Number,
    default: 0,
  },
  voters: [
    {
      name: String,
      year: String,
      branch: String,
      vote: {
        type: String,
        enum: ['accept', 'reject'],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  duration: {
    type: Number,
    default: 30,
  },
  correctOption: {
    type: String,
    enum: ['accept', 'reject', null],
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VoteRecord', voteRecordSchema);
