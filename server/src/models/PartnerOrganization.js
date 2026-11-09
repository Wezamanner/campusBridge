import mongoose from 'mongoose';

const partnerOrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Partner company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [150, 'Company name cannot exceed 150 characters'],
      unique: true,
      collation: { locale: 'en', strength: 2 }, // Case-insensitive uniqueness per SRS Section 13.2
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Contact email address is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid company contact email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (coordinator) reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PartnerOrganization = mongoose.model('PartnerOrganization', partnerOrganizationSchema);
export default PartnerOrganization;
