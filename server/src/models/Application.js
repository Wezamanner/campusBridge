import mongoose from 'mongoose';

const applicationCvSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Phase 12.5: Interview scheduling subdocument
const interviewScheduleSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
    },
    time: {
      type: String, // e.g., "10:00 AM UTC"
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Meeting link must be a valid URL'],
    },
    instructionsForCandidate: {
      type: String,
      trim: true,
      maxlength: [1000, 'Instructions cannot exceed 1000 characters'],
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Coordinator who scheduled
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Submitted', 'Under review', 'Forwarded', 'Accepted', 'Rejected', 'Withdrawn'],
      required: true,
    },
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship reference is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student applicant reference is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Application cover letter / message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters long'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    cv: {
      type: applicationCvSchema,
      required: [true, 'A valid CV attachment is required for application'],
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under review', 'Forwarded', 'Accepted', 'Rejected', 'Withdrawn'],
      default: 'Submitted',
      index: true,
    },
    history: {
      type: [statusHistorySchema],
      default: [],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    // Phase 12.5: Interview scheduling (coordinator workflow)
    interviewSchedule: {
      type: interviewScheduleSchema,
      default: null,
    },
    // Phase 12.5: Coordinator reviewer notes (PRIVATE - SEC-13)
    reviewerNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Reviewer notes cannot exceed 2000 characters'],
      default: '',
      select: false, // Never exposed in student API responses
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications for the same internship by same student
applicationSchema.index({ internshipId: 1, studentId: 1 }, { unique: true });
applicationSchema.index({ status: 1, appliedAt: 1 });

// Helper method to validate status transition per FR-12
applicationSchema.methods.canTransitionTo = function (nextStatus) {
  const current = this.status;
  if (current === nextStatus) return true;
  if (current === 'Accepted' || current === 'Rejected' || current === 'Withdrawn') {
    return false; // Final terminal states
  }
  if (nextStatus === 'Withdrawn') {
    return true; // May withdraw before final decision
  }

  const allowedTransitions = {
    'Submitted': ['Under review'],
    'Under review': ['Forwarded'],
    'Forwarded': ['Accepted', 'Rejected'],
  };

  return allowedTransitions[current]?.includes(nextStatus) || false;
};

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
