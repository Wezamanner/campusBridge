import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
  User,
  Course,
  Enrollment,
  Assignment,
  Submission,
  Grade,
  PartnerOrganization,
  Internship,
  Application,
  Progress,
  Achievement,
  Notification,
  Announcement,
  Project,
  Task,
  Message,
  ActivityLog,
} from '../models/index.js';

async function runModelTests() {
  console.log('--- Starting CampusBridge Phase 2 Models Test Suite ---');
  await connectDB();

  // Ensure all indexes (including compound unique constraints) are built in MongoDB
  await Promise.all([
    User.syncIndexes(),
    Course.syncIndexes(),
    Enrollment.syncIndexes(),
    Assignment.syncIndexes(),
    Submission.syncIndexes(),
    Grade.syncIndexes(),
    PartnerOrganization.syncIndexes(),
    Internship.syncIndexes(),
    Application.syncIndexes(),
    Progress.syncIndexes(),
    Achievement.syncIndexes(),
    Notification.syncIndexes(),
    Announcement.syncIndexes(),
    Project.syncIndexes(),
    Task.syncIndexes(),
    Message.syncIndexes(),
    ActivityLog.syncIndexes(),
  ]);

  const results = {
    passed: 0,
    failed: 0,
    details: [],
  };

  function assert(condition, message) {
    if (condition) {
      results.passed++;
      results.details.push(`✅ PASS: ${message}`);
      console.log(`✅ PASS: ${message}`);
    } else {
      results.failed++;
      results.details.push(`❌ FAIL: ${message}`);
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. User Model & Password Hashing
    const testEmail = `test_student_${Date.now()}@university.edu`;
    const user = new User({
      name: 'Sabrin Abdu',
      email: testEmail,
      passwordHash: 'PlainSecretPassword123!',
      role: 'student',
      program: 'Water Resources Eng.',
      year: 4,
      skills: ['Python', 'Hydraulics', 'React'],
      preferences: { theme: 'dark' },
    });
    await user.save();
    assert(user._id != null, 'User created with ObjectId');
    assert(user.passwordHash !== 'PlainSecretPassword123!', 'Password was hashed with bcrypt');
    const isMatch = await user.comparePassword('PlainSecretPassword123!');
    assert(isMatch === true, 'comparePassword successfully validates matching password');
    const isMismatch = await user.comparePassword('WrongPassword');
    assert(isMismatch === false, 'comparePassword rejects invalid password');

    const serializedUser = user.toJSON();
    assert(serializedUser.passwordHash === undefined, 'toJSON excludes passwordHash');

    // 2. Course Model & Code Validation
    const course = new Course({
      code: `CS${Math.floor(100 + Math.random() * 900)}`,
      title: 'Database Architecture & Web Engineering',
      description: 'Comprehensive modern full-stack development',
      instructorId: user._id,
      createdBy: user._id,
      resources: [{ title: 'Lecture 1 Slides', type: 'slides', url: '/files/lecture1.pdf' }],
    });
    await course.save();
    assert(course.status === 'active', 'Course default status is "active"');
    assert(course.resources.length === 1, 'Course embedded resources array properly saved');

    // 3. Enrollment & Unique Constraint
    const enrollment = new Enrollment({
      studentId: user._id,
      courseId: course._id,
    });
    await enrollment.save();
    assert(enrollment._id != null, 'Enrollment recorded');

    let duplicateEnrollmentThrew = false;
    try {
      const duplicateEnrollment = new Enrollment({
        studentId: user._id,
        courseId: course._id,
      });
      await duplicateEnrollment.save();
    } catch (e) {
      duplicateEnrollmentThrew = true;
    }
    assert(duplicateEnrollmentThrew, 'Duplicate student enrollment correctly rejected by unique index');

    // 4. Assignment Model
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const assignment = new Assignment({
      courseId: course._id,
      createdBy: user._id,
      title: 'Hydraulics II Exam Prep Assignment',
      description: 'Complete problem sets 1 through 5.',
      deadline: futureDate,
      maxScore: 100,
    });
    await assignment.save();
    assert(assignment.maxScore === 100, 'Assignment created with maxScore 100');

    // Past deadline validator check
    let pastDeadlineThrew = false;
    try {
      const pastAssignment = new Assignment({
        courseId: course._id,
        createdBy: user._id,
        title: 'Past Assignment',
        description: 'Should fail validation',
        deadline: new Date(Date.now() - 10000),
      });
      await pastAssignment.save();
    } catch (e) {
      pastDeadlineThrew = true;
    }
    assert(pastDeadlineThrew, 'Assignment with past deadline correctly rejected during creation');

    // 5. Submission Model
    const submission = new Submission({
      assignmentId: assignment._id,
      studentId: user._id,
      courseId: course._id,
      text: 'Final submission answer document uploaded.',
      file: {
        name: 'assignment_prep.pdf',
        path: '/uploads/assignment_prep.pdf',
        size: 1024 * 500, // 500KB
        mimeType: 'application/pdf',
      },
      status: 'Submitted',
    });
    await submission.save();
    assert(submission.status === 'Submitted', 'Submission saved with status "Submitted"');

    // 6. Grade Model & Score Validation
    const grade = new Grade({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId: user._id,
      courseId: course._id,
      graderId: user._id,
      score: 95,
      maxScore: 100,
      feedback: 'Excellent analytical work and clear methodology.',
    });
    await grade.save();
    assert(grade.score === 95, 'Grade record saved with score');

    let invalidGradeThrew = false;
    try {
      const invalidGrade = new Grade({
        submissionId: new mongoose.Types.ObjectId(),
        assignmentId: assignment._id,
        studentId: user._id,
        courseId: course._id,
        graderId: user._id,
        score: 110, // Exceeds maxScore
        maxScore: 100,
      });
      await invalidGrade.save();
    } catch (e) {
      invalidGradeThrew = true;
    }
    assert(invalidGradeThrew, 'Grade exceeding maxScore rejected by schema validation');

    // 7. Partner Organization Model
    const companyName = `Brolf Tech Partners ${Date.now()}`;
    const partner = new PartnerOrganization({
      name: companyName,
      contactPerson: 'Director Alex',
      email: 'recruitment@brolftech.com',
      createdBy: user._id,
    });
    await partner.save();
    assert(partner.name === companyName, 'Partner organization created with contact info');

    // 8. Internship Model
    const internship = new Internship({
      companyId: partner._id,
      createdBy: user._id,
      title: 'Full Stack Engineering Intern',
      type: 'Remote',
      skills: ['Node.js', 'React', 'MongoDB'],
      description: 'Hands-on remote university internship challenge',
      requirements: ['Enrolled university student', 'Knowledge of JavaScript'],
      deadline: futureDate,
    });
    await internship.save();
    assert(internship.type === 'Remote', 'Internship created with valid work mode enum');

    // 9. Application Model & Transition Rules
    const application = new Application({
      internshipId: internship._id,
      studentId: user._id,
      message: 'I am highly passionate about full stack development and university software systems.',
      cv: {
        name: 'student_resume.pdf',
        path: '/uploads/cvs/student_resume.pdf',
        size: 1024 * 300,
        mimeType: 'application/pdf',
      },
    });
    await application.save();
    assert(application.status === 'Submitted', 'Application default status is "Submitted"');
    assert(application.canTransitionTo('Under review') === true, 'Allowed status transition: Submitted -> Under review');
    assert(application.canTransitionTo('Accepted') === false, 'Disallowed illegal skip: Submitted -> Accepted directly');

    // 10. Progress Model
    const progress = new Progress({
      studentId: user._id,
      courseId: course._id,
      submittedCount: 1,
      totalAssignments: 1,
      percent: 100,
      averageScore: 95,
    });
    await progress.save();
    assert(progress.percent === 100, 'Student progress calculated and cached');

    // 11. Achievement Model
    const achievement = new Achievement({
      userId: user._id,
      badgeId: 'FIRST_SUBMISSION',
      title: 'First Step',
      description: 'Submitted your first assignment on CampusBridge',
      icon: 'star',
    });
    await achievement.save();
    assert(achievement.badgeId === 'FIRST_SUBMISSION', 'Achievement badge awarded');

    // 12. Notification Model
    const notification = new Notification({
      userId: user._id,
      type: 'grade',
      title: 'Assignment Graded',
      message: 'Your Hydraulics II submission received a score of 95/100.',
      link: `/courses/${course._id}/assignments/${assignment._id}`,
    });
    await notification.save();
    assert(notification.read === false, 'Notification created unread');

    // 13. Announcement Model
    const announcement = new Announcement({
      message: 'Welcome to CampusBridge Fall 2026 Academic Term!',
      audience: 'both',
      startsAt: new Date(),
      endsAt: futureDate,
      createdBy: user._id,
    });
    await announcement.save();
    assert(announcement.audience === 'both', 'Announcement published with proper audience');

    // 14. Project Model
    const project = new Project({
      ownerId: user._id,
      name: 'Rihla Ventures Bootcamp System',
      description: 'A modern bootcamp management system for ASTU.',
      status: 'active',
    });
    await project.save();
    assert(project.status === 'active', 'Personal project created');

    // 15. Task Model & Completion Hook
    const task = new Task({
      ownerId: user._id,
      projectId: project._id,
      title: 'Complete Portfolio Admin Page',
      priority: 'high',
      status: 'todo',
    });
    await task.save();
    assert(task.status === 'todo' && task.completedAt === null, 'Task initial status is todo with null completedAt');
    task.status = 'done';
    await task.save();
    assert(task.completedAt != null, 'Task completedAt automatically populated on status change to "done"');

    // 16. Message Model
    const instructorUser = new User({
      name: 'Dr. Instructor',
      email: `instructor_${Date.now()}@university.edu`,
      passwordHash: 'InstructorPassword123!',
      role: 'instructor',
      department: 'Computer Science & Engineering',
    });
    await instructorUser.save();

    const message = new Message({
      senderId: user._id,
      recipientId: instructorUser._id,
      body: 'Hello Dr., I have a question regarding the recent course project guidelines.',
    });
    await message.save();
    assert(message.conversationKey != null, 'Message conversationKey auto-generated for threading');

    // 17. ActivityLog Model & Metadata Validation
    const activityLog = new ActivityLog({
      userId: user._id,
      action: 'SUBMIT_ASSIGNMENT',
      targetType: 'Assignment',
      targetId: assignment._id,
      meta: { assignmentTitle: assignment.title, scoreExpected: true },
    });
    await activityLog.save();
    assert(activityLog.action === 'SUBMIT_ASSIGNMENT', 'Activity log recorded');

    // Sensitive metadata rejection check
    let sensitiveMetaThrew = false;
    try {
      const sensitiveLog = new ActivityLog({
        userId: user._id,
        action: 'USER_LOGIN',
        targetType: 'User',
        meta: { userPassword: 'SensitiveSecretValue' },
      });
      await sensitiveLog.save();
    } catch (e) {
      sensitiveMetaThrew = true;
    }
    assert(sensitiveMetaThrew, 'ActivityLog correctly rejected metadata containing "password" per SEC-12');

    // Cleanup test fixtures
    await User.deleteMany({ _id: { $in: [user._id, instructorUser._id] } });
    await Course.deleteOne({ _id: course._id });
    await Enrollment.deleteOne({ _id: enrollment._id });
    await Assignment.deleteOne({ _id: assignment._id });
    await Submission.deleteOne({ _id: submission._id });
    await Grade.deleteOne({ _id: grade._id });
    await PartnerOrganization.deleteOne({ _id: partner._id });
    await Internship.deleteOne({ _id: internship._id });
    await Application.deleteOne({ _id: application._id });
    await Progress.deleteOne({ _id: progress._id });
    await Achievement.deleteOne({ _id: achievement._id });
    await Notification.deleteOne({ _id: notification._id });
    await Announcement.deleteOne({ _id: announcement._id });
    await Project.deleteOne({ _id: project._id });
    await Task.deleteOne({ _id: task._id });
    await Message.deleteOne({ _id: message._id });
    await ActivityLog.deleteOne({ _id: activityLog._id });

    console.log('\n--- Model Test Summary ---');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);

    await mongoose.connection.close();
    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Test Suite Fatal Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runModelTests();
