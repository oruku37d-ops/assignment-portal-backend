const mongoose = require('mongoose');

const lecturerStudentSchema = new mongoose.Schema(
  {
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

lecturerStudentSchema.index({ lecturerId: 1, studentId: 1 }, { unique: true });

lecturerStudentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('LecturerStudent', lecturerStudentSchema);
