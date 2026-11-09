import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: '{VALUE} is not a valid priority (low, medium, high)',
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'done'],
        message: '{VALUE} is not a valid task status (todo, done)',
      },
      default: 'todo',
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically maintain completedAt timestamp based on status change
taskSchema.pre('save', function () {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'todo') {
      this.completedAt = null;
    }
  }
});

taskSchema.index({ ownerId: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
