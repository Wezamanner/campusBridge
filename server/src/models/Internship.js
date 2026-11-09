import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartnerOrganization',
      required: [true, 'Partner company reference is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (coordinator) reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Internship title is required'],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: {
        values: ['Remote', 'Hybrid', 'On-site'],
        message: '{VALUE} is not a valid internship work mode (Remote, Hybrid, On-site)',
      },
      required: [true, 'Internship work mode is required'],
    },
    skills: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: 'At least one required skill must be specified',
      },
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Internship description is required'],
      trim: true,
    },
    requirements: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: 'At least one requirement must be specified',
      },
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    deadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

internshipSchema.index({ status: 1, deadline: 1 });
internshipSchema.index({ title: 'text', skills: 'text' });

export const Internship = mongoose.model('Internship', internshipSchema);
export default Internship;
