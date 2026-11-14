import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    badgeId: {
      type: String,
      required: [true, 'Badge identifier is required'],
      enum: {
        values: [
          'FIRST_SUBMISSION',
          'PERFECT_SCORE',
          'COURSE_COMPLETION',
          'TASK_MASTER',
          'EARLY_BIRD',
          'INTERNSHIP_APPLICANT',
          'SCHOLAR',
        ],
        message: '{VALUE} is not a valid system badge ID',
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'award',
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One badge of a specific type per user
achievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const Achievement = mongoose.model('Achievement', achievementSchema);
export default Achievement;
