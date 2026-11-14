/**
 * Help & Support Controller
 * UC-G07, FR-52 — SRS Section 7.5, Option A: Static FAQ per role
 */

const FAQ_BY_ROLE = {
  student: [
    { question: 'How do I enroll in a course?', answer: 'Go to Courses, find an active course, and click "Enroll".' },
    { question: 'How do I submit an assignment?', answer: 'Open the assignment from your course page and use the submission form.' },
    { question: 'How do I apply for an internship?', answer: 'Browse Internships, open a posting, and click "Apply". You must have a CV uploaded on your profile.' },
    { question: 'How do I withdraw an application?', answer: 'Go to My Applications and use the Withdraw option (only available before a decision is recorded).' },
    { question: 'How do I upload my CV?', answer: 'Go to Profile and click the CV section. PDF and Word files up to 2 MB are accepted.' },
    { question: 'How does the AI assistant work?', answer: 'The AI assistant helps with study plans, course questions and internship matching. It cannot change grades or records.' },
  ],
  instructor: [
    { question: 'How do I add resources to my course?', answer: 'Open the course from your dashboard, then use the Resources section to upload files or add links.' },
    { question: 'How do I create an assignment?', answer: 'Open the course and click "Create Assignment". Set a future deadline and a maximum score.' },
    { question: 'How do I grade submissions?', answer: 'Go to Submissions, find the student\'s work, and use the Grade form to enter a score and feedback.' },
    { question: 'How do I monitor at-risk students?', answer: 'Open the At-Risk Monitoring page to see students with low progress or missed deadlines.' },
  ],
  coordinator: [
    { question: 'How do I create a course?', answer: 'Go to Courses and click "Create Course". You must assign an instructor during creation.' },
    { question: 'How do I register a partner company?', answer: 'Go to Companies, click "Register Company", fill in the details and save. You can approve it after reviewing.' },
    { question: 'How do I post an internship?', answer: 'Go to Internships and click "Post Internship". The company must be approved first.' },
    { question: 'How do I forward an application?', answer: 'Open an application in the Applications list and click "Forward to Company".' },
    { question: 'How do I record a company decision?', answer: 'Open a Forwarded application and select Accepted or Rejected.' },
    { question: 'How do I schedule an interview?', answer: 'Open an application and click "Schedule Interview" to set a date, time and meeting link.' },
    { question: 'How do I export application data?', answer: 'Go to Reports and download the Applications CSV or the Forwarded Applicants list for a specific internship.' },
  ],
  admin: [
    { question: 'How do I create a staff account?', answer: 'Go to Users, click "Create Account" and fill in the details. Only Instructor and Coordinator roles can be created this way.' },
    { question: 'How do I deactivate a user?', answer: 'Go to Users, find the user, and use the "Deactivate" or "Delete" action. The user can no longer log in.' },
    { question: 'How do I close student registration?', answer: 'Go to Settings and toggle the "Student Registration" switch. New students will see a closed message on the Register page.' },
    { question: 'How do I publish an announcement?', answer: 'Go to Announcements, click "New Announcement", and set the message, audience and dates.' },
    { question: 'How do I update the public website text?', answer: 'Go to Public Content and edit the hero title, subtitle and about text.' },
    { question: 'How do I export user data?', answer: 'Go to Reports and download the Users CSV.' },
  ],
};

const SUPPORT_CONTACT = 'platform-support@campusbridge.edu';

/**
 * @route   GET /api/v1/help
 * @desc    Returns role-scoped FAQ and support contact (FR-52 / UC-G07)
 * @access  All authenticated roles
 */
export const getHelp = async (req, res, next) => {
  try {
    const role = req.user.role;
    const faqs = FAQ_BY_ROLE[role] || [];

    return res.status(200).json({
      success: true,
      message: 'Help content retrieved successfully.',
      data: {
        role,
        faqs,
        supportContact: SUPPORT_CONTACT,
        note: 'For urgent issues, contact your administrator or platform support.',
      },
    });
  } catch (err) {
    next(err);
  }
};
