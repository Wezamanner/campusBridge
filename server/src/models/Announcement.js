import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Announcement message is required'],
      trim: true,
      maxlength: [200, 'Announcement message cannot exceed 200 characters'], // per FR-24 and Section 13.2
    },
    audience: {
      type: String,
      enum: {
        values: ['dashboard', 'public', 'both'],
        message: '{VALUE} is not a valid audience target',
      },
      required: [true, 'Audience is required (dashboard, public, both)'],
      default: 'both',
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      required: [true, 'Announcement expiry / end date is required'],
      validate: {
        validator: function (val) {
          return val > this.startsAt;
        },
        message: 'End date must be chronologically after the start date',
      },
    },
    published: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Administrator reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ published: 1, audience: 1, startsAt: 1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
