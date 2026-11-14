import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system',
      trim: true,
    },
    registrationOpen: {
      type: Boolean,
      default: true,
    },
    publicContent: {
      heroTitle: {
        type: String,
        default: 'Bridging Academic Ambition with Real-World Industry',
        trim: true,
        maxlength: [200, 'Hero title cannot exceed 200 characters'],
      },
      heroSubtitle: {
        type: String,
        default: 'Discover university courses, industry-grade projects, and verified career internships.',
        trim: true,
        maxlength: [500, 'Hero subtitle cannot exceed 500 characters'],
      },
      aboutText: {
        type: String,
        default: 'CampusBridge connects students, faculty, and corporate recruiters in one unified platform.',
        trim: true,
        maxlength: [1000, 'About text cannot exceed 1000 characters'],
      },
      announcementBanner: {
        type: String,
        default: '',
        trim: true,
        maxlength: [200, 'Banner cannot exceed 200 characters'],
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
