const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: null },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'GRADED'], default: 'PENDING' },
    score: { type: Number, default: null },
    grade: { type: String, default: null },
    comment: { type: String, default: null },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

submissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Submission', submissionSchema);
