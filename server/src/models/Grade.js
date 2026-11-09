import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: [true, 'Submission reference is required'],
      unique: true,
      index: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
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
    graderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Grader (instructor) reference is required'],
      index: true,
    },
    score: {
      type: Number,
      required: [true, 'Grade score is required'],
      min: [0, 'Score cannot be negative'],
      validate: {
        validator: function (val) {
          return val <= this.maxScore;
        },
        message: 'Score cannot exceed assignment maximum score',
      },
    },
    maxScore: {
      type: Number,
      required: [true, 'Maximum possible score is required'],
      min: [1, 'Maximum score must be at least 1'],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Written feedback cannot exceed 1000 characters'],
      default: '',
    },
    gradedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

gradeSchema.index({ studentId: 1, courseId: 1 });

export const Grade = mongoose.model('Grade', gradeSchema);
export default Grade;
