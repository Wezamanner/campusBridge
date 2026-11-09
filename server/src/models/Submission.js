import mongoose from 'mongoose';

const submissionFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    size: {
      type: Number,
      required: true,
      max: [5 * 1024 * 1024, 'File size cannot exceed 5 MB'], // 5 MB per FR-07 / SEC-07
    },
    mimeType: {
      type: String,
      match: [
        /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/zip|application\/x-zip-compressed|text\/plain)/,
        'File type must be PDF, Word, ZIP, or text',
      ],
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
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
      required: [true, 'Course reference is required (denormalized for query optimization)'],
      index: true,
    },
    text: {
      type: String,
      trim: true,
    },
    file: {
      type: submissionFileSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ['Submitted', 'Graded'],
      default: 'Submitted',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Either text answer or file attachment must be provided
submissionSchema.pre('validate', function () {
  if (!this.text && !this.file) {
    this.invalidate('text', 'Either a text answer or an attached file is required');
  }
});

// Enforce at most one active submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ courseId: 1, status: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
