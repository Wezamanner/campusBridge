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
          // Phase 14 — SEC-12 administrative actions
          'ADMIN_ROLE_CHANGE',
          'ADMIN_DEACTIVATE_USER',
          'ADMIN_REACTIVATE_USER',
          'ADMIN_SOFT_DELETE_USER',
          'ADMIN_CREATE_USER',
          'COORDINATOR_APPROVE_ORG',
          'COORDINATOR_FORWARD_APPLICATION',
          'COORDINATOR_RECORD_DECISION',
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
        'Announcement',
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
          // Security rule SEC-12 / Section 13.2: Never store passwords, tokens, or raw credentials
          const serialized = JSON.stringify(val).toLowerCase();
          return (
            !serialized.includes('password') &&
            !serialized.includes('token') &&
            !serialized.includes('secret') &&
            !serialized.includes('bearer ') &&
            !serialized.includes('authorization')
          );
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
