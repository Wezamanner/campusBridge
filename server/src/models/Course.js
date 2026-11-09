import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: 150,
    },
    type: {
      type: String,
      enum: ['pdf', 'document', 'slides', 'link', 'video', 'other'],
      default: 'document',
    },
    url: {
      type: String,
      required: [true, 'Resource URL or file path is required'],
      trim: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required (e.g. CS301)'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2,6}[0-9]{2,5}$/, 'Course code must follow standard pattern (e.g. CS301, SE402)'],
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor must be assigned to course'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (coordinator) reference is required'],
    },
    resources: {
      type: [resourceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ instructorId: 1, status: 1 });

export const Course = mongoose.model('Course', courseSchema);
export default Course;
