import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    submittedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAssignments: {
      type: Number,
      min: 0,
      default: 0,
    },
    percent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    averageScore: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One progress record per student per course
progressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
progressSchema.index({ averageScore: -1 });

export const Progress = mongoose.model('Progress', progressSchema);
export default Progress;
