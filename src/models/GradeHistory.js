const mongoose = require('mongoose');

const gradeHistorySchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    previousScore: { type: Number, default: null },
    previousGrade: { type: String, default: null },
    newScore: { type: Number, required: true },
    newGrade: { type: String, required: true },
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

gradeHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('GradeHistory', gradeHistorySchema);
