import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Activity action is required'],
      enum: {
        values: [
          'SUBMIT_ASSIGNMENT',
          'GRADE_ASSIGNMENT',
          'APPLY_INTERNSHIP',
          'UPDATE_APPLICATION',
          'ENROLL_COURSE',
          'CREATE_COURSE',
          'CREATE_TASK',
          'COMPLETE_TASK',
          'CREATE_PROJECT',
          'USER_LOGIN',
          'UPDATE_PROFILE',
        ],
        message: '{VALUE} is not a recognized activity action',
      },
      index: true,
    },
    targetType: {
      type: String,
      enum: [
        'Assignment',
        'Submission',
        'Grade',
        'Course',
        'Internship',
        'Application',
        'Project',
        'Task',
        'User',
      ],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (val) {
          if (!val || typeof val !== 'object') return true;
          // Security rule SEC-12 / Section 13.2: Never store passwords, tokens, or raw message bodies
          const serialized = JSON.stringify(val).toLowerCase();
          return !serialized.includes('password') && !serialized.includes('token') && !serialized.includes('secret');
        },
        message: 'Activity log metadata must not contain credentials, tokens, or sensitive data',
      },
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
