import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const cvSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true, max: 2 * 1024 * 1024 }, // Max 2MB per FR-23 / SEC-07
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'instructor', 'coordinator', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'student',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    program: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    year: {
      type: Number,
      min: 1,
      max: 7,
    },
    skills: {
      type: [
        {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 30,
        },
      ],
      validate: [
        (val) => val.length <= 15,
        'Cannot have more than 15 skills recorded',
      ],
      default: [],
    },
    cv: {
      type: cvSchema,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({ theme: 'dark' }),
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes per SRS Section 13.2
userSchema.index({ role: 1, active: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Exclude passwordHash in JSON serialization
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

export const User = mongoose.model('User', userSchema);
export default User;
