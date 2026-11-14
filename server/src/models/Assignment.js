import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (instructor) reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Assignment instructions/description are required'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Assignment submission deadline is required'],
      validate: {
        validator: function (value) {
          // Validate future deadline on creation only
          if (this.isNew) {
            return value > new Date();
          }
          return true;
        },
        message: 'Deadline must be a future date and time',
      },
    },
    maxScore: {
      type: Number,
      required: [true, 'Maximum score is required'],
      min: [1, 'Maximum score must be at least 1'],
      max: [100, 'Maximum score cannot exceed 100'],
      default: 100,
    },
    allowLate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ courseId: 1, deadline: 1 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
