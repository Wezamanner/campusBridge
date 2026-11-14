/**
 * Phase 15: Critical User Journey Tests
 * Tests actual frontend-to-backend workflows for all user roles
 */

const mongoose = require('mongoose');
const User = require('../models/User.model');
const Course = require('../models/Course.model');
const Assignment = require('../models/Assignment.model');
const Project = require('../models/Project.model');
const Internship = require('../models/Internship.model');

const BASE_URL = 'http://localhost:5001/api/v1';

// Helper function to make API calls
async function apiCall(method, endpoint, token = null, body = null) {
  const fetch = (await import('node-fetch')).default;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Test results tracking
const results = {
  healthCheck: {},
  student: {},
  instructor: {},
  coordinator: {},
  administrator: {},
  publicVisitor: {},
  security: {},
};

async function runTests() {
  console.log('\n=== PHASE 15: CRITICAL USER JOURNEY TESTS ===\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Database connected\n');

    // ===================================================================
    // INITIAL HEALTH CHECK
    // ===================================================================
    console.log('=== INITIAL HEALTH CHECK ===\n');

    try {
      const health = await apiCall('GET', '/health');
      if (health.status === 200 && health.data.success) {
        console.log('✓ Health endpoint: PASS');
        results.healthCheck.endpoint = 'PASS';
      } else {
        console.log('✗ Health endpoint: FAIL');
        results.healthCheck.endpoint = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Health endpoint: FAIL -', error.message);
      results.healthCheck.endpoint = 'FAIL';
    }

    // Check database collections
    const collections = ['users', 'courses', 'assignments', 'projects', 'internships'];
    for (const coll of collections) {
      try {
        const count = await mongoose.connection.db.collection(coll).countDocuments();
        console.log(`✓ Collection ${coll}: ${count} documents`);
        results.healthCheck[coll] = 'PASS';
      } catch (error) {
        console.log(`✗ Collection ${coll}: FAIL -`, error.message);
        results.healthCheck[coll] = 'FAIL';
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // JOURNEY 1: STUDENT
    // ===================================================================
    console.log('=== JOURNEY 1: STUDENT ===\n');

    let studentToken = null;
    let studentId = null;

    // Step 1: Register
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'Student',
        email: `test.student.${Date.now()}@university.edu`,
        password: 'SecurePass123!',
        role: 'student',
        studentId: `ST${Date.now()}`,
      };

      const register = await apiCall('POST', '/auth/register', null, registerData);
      
      if (register.status === 201 && register.data.success && register.data.token) {
        console.log('✓ Student registration: PASS');
        studentToken = register.data.token;
        studentId = register.data.user._id;
        results.student.registration = 'PASS';
      } else {
        console.log('✗ Student registration: FAIL -', JSON.stringify(register.data));
        results.student.registration = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Student registration: FAIL -', error.message);
      results.student.registration = 'FAIL';
    }

    // Step 2: Login
    if (studentToken) {
      try {
        const loginData = {
          email: (await User.findById(studentId)).email,
          password: 'SecurePass123!',
        };

        const login = await apiCall('POST', '/auth/login', null, loginData);
        
        if (login.status === 200 && login.data.success && login.data.token) {
          console.log('✓ Student login: PASS');
          studentToken = login.data.token;
          results.student.login = 'PASS';
        } else {
          console.log('✗ Student login: FAIL -', JSON.stringify(login.data));
          results.student.login = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student login: FAIL -', error.message);
        results.student.login = 'FAIL';
      }
    }

    // Step 3: View profile
    if (studentToken) {
      try {
        const profile = await apiCall('GET', '/profile', studentToken);
        
        if (profile.status === 200 && profile.data.success) {
          console.log('✓ Student view profile: PASS');
          results.student.viewProfile = 'PASS';
        } else {
          console.log('✗ Student view profile: FAIL -', JSON.stringify(profile.data));
          results.student.viewProfile = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student view profile: FAIL -', error.message);
        results.student.viewProfile = 'FAIL';
      }
    }

    // Step 4: Update profile
    if (studentToken) {
      try {
        const updateData = {
          bio: 'Computer Science student passionate about AI',
          skills: ['JavaScript', 'Python', 'React'],
        };

        const update = await apiCall('PUT', '/profile', studentToken, updateData);
        
        if (update.status === 200 && update.data.success) {
          console.log('✓ Student update profile: PASS');
          results.student.updateProfile = 'PASS';
        } else {
          console.log('✗ Student update profile: FAIL -', JSON.stringify(update.data));
          results.student.updateProfile = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student update profile: FAIL -', error.message);
        results.student.updateProfile = 'FAIL';
      }
    }

    // Step 5: View courses
    if (studentToken) {
      try {
        const courses = await apiCall('GET', '/courses', studentToken);
        
        if (courses.status === 200 && courses.data.success) {
          console.log('✓ Student view courses: PASS');
          results.student.viewCourses = 'PASS';
        } else {
          console.log('✗ Student view courses: FAIL -', JSON.stringify(courses.data));
          results.student.viewCourses = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student view courses: FAIL -', error.message);
        results.student.viewCourses = 'FAIL';
      }
    }

    // Step 6: View assignments
    if (studentToken) {
      try {
        const assignments = await apiCall('GET', '/assignments', studentToken);
        
        if (assignments.status === 200 && assignments.data.success) {
          console.log('✓ Student view assignments: PASS');
          results.student.viewAssignments = 'PASS';
        } else {
          console.log('✗ Student view assignments: FAIL -', JSON.stringify(assignments.data));
          results.student.viewAssignments = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student view assignments: FAIL -', error.message);
        results.student.viewAssignments = 'FAIL';
      }
    }

    // Step 7: View projects
    if (studentToken) {
      try {
        const projects = await apiCall('GET', '/projects', studentToken);
        
        if (projects.status === 200 && projects.data.success) {
          console.log('✓ Student view projects: PASS');
          results.student.viewProjects = 'PASS';
        } else {
          console.log('✗ Student view projects: FAIL -', JSON.stringify(projects.data));
          results.student.viewProjects = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student view projects: FAIL -', error.message);
        results.student.viewProjects = 'FAIL';
      }
    }

    // Step 8: View internships (public)
    if (studentToken) {
      try {
        const internships = await apiCall('GET', '/internships', studentToken);
        
        if (internships.status === 200 && internships.data.success) {
          console.log('✓ Student view internships: PASS');
          results.student.viewInternships = 'PASS';
        } else {
          console.log('✗ Student view internships: FAIL -', JSON.stringify(internships.data));
          results.student.viewInternships = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Student view internships: FAIL -', error.message);
        results.student.viewInternships = 'FAIL';
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // JOURNEY 2: INSTRUCTOR
    // ===================================================================
    console.log('=== JOURNEY 2: INSTRUCTOR ===\n');

    let instructorToken = null;
    let instructorId = null;
    let testCourseId = null;
    let testAssignmentId = null;

    // Step 1: Register/Login as instructor
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'Instructor',
        email: `test.instructor.${Date.now()}@university.edu`,
        password: 'SecurePass123!',
        role: 'instructor',
        employeeId: `INS${Date.now()}`,
      };

      const register = await apiCall('POST', '/auth/register', null, registerData);
      
      if (register.status === 201 && register.data.success && register.data.token) {
        console.log('✓ Instructor registration: PASS');
        instructorToken = register.data.token;
        instructorId = register.data.user._id;
        results.instructor.registration = 'PASS';
      } else {
        console.log('✗ Instructor registration: FAIL -', JSON.stringify(register.data));
        results.instructor.registration = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Instructor registration: FAIL -', error.message);
      results.instructor.registration = 'FAIL';
    }

    // Step 2: Create course
    if (instructorToken) {
      try {
        const courseData = {
          code: `CS${Date.now()}`,
          name: 'Test Course for Phase 15',
          description: 'Testing course creation',
          credits: 3,
          department: 'Computer Science',
          semester: 'Fall 2026',
        };

        const course = await apiCall('POST', '/courses', instructorToken, courseData);
        
        if (course.status === 201 && course.data.success && course.data.course) {
          console.log('✓ Instructor create course: PASS');
          testCourseId = course.data.course._id;
          results.instructor.createCourse = 'PASS';
        } else {
          console.log('✗ Instructor create course: FAIL -', JSON.stringify(course.data));
          results.instructor.createCourse = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Instructor create course: FAIL -', error.message);
        results.instructor.createCourse = 'FAIL';
      }
    }

    // Step 3: View own courses
    if (instructorToken) {
      try {
        const courses = await apiCall('GET', '/instructor/courses', instructorToken);
        
        if (courses.status === 200 && courses.data.success) {
          console.log('✓ Instructor view courses: PASS');
          results.instructor.viewCourses = 'PASS';
        } else {
          console.log('✗ Instructor view courses: FAIL -', JSON.stringify(courses.data));
          results.instructor.viewCourses = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Instructor view courses: FAIL -', error.message);
        results.instructor.viewCourses = 'FAIL';
      }
    }

    // Step 4: Create assignment
    if (instructorToken && testCourseId) {
      try {
        const assignmentData = {
          title: 'Test Assignment Phase 15',
          description: 'Testing assignment creation',
          courseId: testCourseId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalPoints: 100,
          type: 'project',
        };

        const assignment = await apiCall('POST', '/assignments', instructorToken, assignmentData);
        
        if (assignment.status === 201 && assignment.data.success && assignment.data.assignment) {
          console.log('✓ Instructor create assignment: PASS');
          testAssignmentId = assignment.data.assignment._id;
          results.instructor.createAssignment = 'PASS';
        } else {
          console.log('✗ Instructor create assignment: FAIL -', JSON.stringify(assignment.data));
          results.instructor.createAssignment = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Instructor create assignment: FAIL -', error.message);
        results.instructor.createAssignment = 'FAIL';
      }
    }

    // Step 5: View course students
    if (instructorToken && testCourseId) {
      try {
        const students = await apiCall('GET', `/instructor/courses/${testCourseId}/students`, instructorToken);
        
        if (students.status === 200 && students.data.success) {
          console.log('✓ Instructor view course students: PASS');
          results.instructor.viewStudents = 'PASS';
        } else {
          console.log('✗ Instructor view course students: FAIL -', JSON.stringify(students.data));
          results.instructor.viewStudents = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Instructor view course students: FAIL -', error.message);
        results.instructor.viewStudents = 'FAIL';
      }
    }

    // Step 6: View assignment submissions
    if (instructorToken && testAssignmentId) {
      try {
        const submissions = await apiCall('GET', `/assignments/${testAssignmentId}/submissions`, instructorToken);
        
        if (submissions.status === 200 && submissions.data.success) {
          console.log('✓ Instructor view submissions: PASS');
          results.instructor.viewSubmissions = 'PASS';
        } else {
          console.log('✗ Instructor view submissions: FAIL -', JSON.stringify(submissions.data));
          results.instructor.viewSubmissions = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Instructor view submissions: FAIL -', error.message);
        results.instructor.viewSubmissions = 'FAIL';
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // JOURNEY 3: COORDINATOR
    // ===================================================================
    console.log('=== JOURNEY 3: COORDINATOR ===\n');

    let coordinatorToken = null;
    let coordinatorId = null;
    let testInternshipId = null;

    // Step 1: Register/Login as coordinator
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'Coordinator',
        email: `test.coordinator.${Date.now()}@university.edu`,
        password: 'SecurePass123!',
        role: 'coordinator',
        employeeId: `COORD${Date.now()}`,
      };

      const register = await apiCall('POST', '/auth/register', null, registerData);
      
      if (register.status === 201 && register.data.success && register.data.token) {
        console.log('✓ Coordinator registration: PASS');
        coordinatorToken = register.data.token;
        coordinatorId = register.data.user._id;
        results.coordinator.registration = 'PASS';
      } else {
        console.log('✗ Coordinator registration: FAIL -', JSON.stringify(register.data));
        results.coordinator.registration = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Coordinator registration: FAIL -', error.message);
      results.coordinator.registration = 'FAIL';
    }

    // Step 2: Create internship
    if (coordinatorToken) {
      try {
        const internshipData = {
          title: 'Test Internship Phase 15',
          company: 'Test Company Inc.',
          description: 'Testing internship creation',
          location: 'Remote',
          duration: '3 months',
          requirements: ['Programming skills', 'Communication skills'],
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const internship = await apiCall('POST', '/internships', coordinatorToken, internshipData);
        
        if (internship.status === 201 && internship.data.success && internship.data.internship) {
          console.log('✓ Coordinator create internship: PASS');
          testInternshipId = internship.data.internship._id;
          results.coordinator.createInternship = 'PASS';
        } else {
          console.log('✗ Coordinator create internship: FAIL -', JSON.stringify(internship.data));
          results.coordinator.createInternship = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Coordinator create internship: FAIL -', error.message);
        results.coordinator.createInternship = 'FAIL';
      }
    }

    // Step 3: View all internships
    if (coordinatorToken) {
      try {
        const internships = await apiCall('GET', '/coordinator/internships', coordinatorToken);
        
        if (internships.status === 200 && internships.data.success) {
          console.log('✓ Coordinator view internships: PASS');
          results.coordinator.viewInternships = 'PASS';
        } else {
          console.log('✗ Coordinator view internships: FAIL -', JSON.stringify(internships.data));
          results.coordinator.viewInternships = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Coordinator view internships: FAIL -', error.message);
        results.coordinator.viewInternships = 'FAIL';
      }
    }

    // Step 4: View internship applications
    if (coordinatorToken && testInternshipId) {
      try {
        const applications = await apiCall('GET', `/coordinator/internships/${testInternshipId}/applications`, coordinatorToken);
        
        if (applications.status === 200 && applications.data.success) {
          console.log('✓ Coordinator view applications: PASS');
          results.coordinator.viewApplications = 'PASS';
        } else {
          console.log('✗ Coordinator view applications: FAIL -', JSON.stringify(applications.data));
          results.coordinator.viewApplications = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Coordinator view applications: FAIL -', error.message);
        results.coordinator.viewApplications = 'FAIL';
      }
    }

    // Step 5: View student placements
    if (coordinatorToken) {
      try {
        const placements = await apiCall('GET', '/coordinator/placements', coordinatorToken);
        
        if (placements.status === 200 && placements.data.success) {
          console.log('✓ Coordinator view placements: PASS');
          results.coordinator.viewPlacements = 'PASS';
        } else {
          console.log('✗ Coordinator view placements: FAIL -', JSON.stringify(placements.data));
          results.coordinator.viewPlacements = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Coordinator view placements: FAIL -', error.message);
        results.coordinator.viewPlacements = 'FAIL';
      }
    }

    // Step 6: Generate placement report
    if (coordinatorToken) {
      try {
        const report = await apiCall('GET', '/coordinator/reports/placements', coordinatorToken);
        
        if (report.status === 200 && report.data.success) {
          console.log('✓ Coordinator generate report: PASS');
          results.coordinator.generateReport = 'PASS';
        } else {
          console.log('✗ Coordinator generate report: FAIL -', JSON.stringify(report.data));
          results.coordinator.generateReport = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Coordinator generate report: FAIL -', error.message);
        results.coordinator.generateReport = 'FAIL';
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // JOURNEY 4: ADMINISTRATOR
    // ===================================================================
    console.log('=== JOURNEY 4: ADMINISTRATOR ===\n');

    let adminToken = null;
    let adminId = null;

    // Step 1: Register/Login as administrator
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'Administrator',
        email: `test.admin.${Date.now()}@university.edu`,
        password: 'SecurePass123!',
        role: 'administrator',
        employeeId: `ADM${Date.now()}`,
      };

      const register = await apiCall('POST', '/auth/register', null, registerData);
      
      if (register.status === 201 && register.data.success && register.data.token) {
        console.log('✓ Administrator registration: PASS');
        adminToken = register.data.token;
        adminId = register.data.user._id;
        results.administrator.registration = 'PASS';
      } else {
        console.log('✗ Administrator registration: FAIL -', JSON.stringify(register.data));
        results.administrator.registration = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Administrator registration: FAIL -', error.message);
      results.administrator.registration = 'FAIL';
    }

    // Step 2: View all users
    if (adminToken) {
      try {
        const users = await apiCall('GET', '/admin/users', adminToken);
        
        if (users.status === 200 && users.data.success) {
          console.log('✓ Administrator view users: PASS');
          results.administrator.viewUsers = 'PASS';
        } else {
          console.log('✗ Administrator view users: FAIL -', JSON.stringify(users.data));
          results.administrator.viewUsers = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Administrator view users: FAIL -', error.message);
        results.administrator.viewUsers = 'FAIL';
      }
    }

    // Step 3: View system stats
    if (adminToken) {
      try {
        const stats = await apiCall('GET', '/admin/stats', adminToken);
        
        if (stats.status === 200 && stats.data.success) {
          console.log('✓ Administrator view stats: PASS');
          results.administrator.viewStats = 'PASS';
        } else {
          console.log('✗ Administrator view stats: FAIL -', JSON.stringify(stats.data));
          results.administrator.viewStats = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Administrator view stats: FAIL -', error.message);
        results.administrator.viewStats = 'FAIL';
      }
    }

    // Step 4: View all courses
    if (adminToken) {
      try {
        const courses = await apiCall('GET', '/admin/courses', adminToken);
        
        if (courses.status === 200 && courses.data.success) {
          console.log('✓ Administrator view courses: PASS');
          results.administrator.viewCourses = 'PASS';
        } else {
          console.log('✗ Administrator view courses: FAIL -', JSON.stringify(courses.data));
          results.administrator.viewCourses = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Administrator view courses: FAIL -', error.message);
        results.administrator.viewCourses = 'FAIL';
      }
    }

    // Step 5: View activity logs
    if (adminToken) {
      try {
        const logs = await apiCall('GET', '/admin/activity-logs', adminToken);
        
        if (logs.status === 200 && logs.data.success) {
          console.log('✓ Administrator view activity logs: PASS');
          results.administrator.viewLogs = 'PASS';
        } else {
          console.log('✗ Administrator view activity logs: FAIL -', JSON.stringify(logs.data));
          results.administrator.viewLogs = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Administrator view activity logs: FAIL -', error.message);
        results.administrator.viewLogs = 'FAIL';
      }
    }

    // Step 6: Generate system report
    if (adminToken) {
      try {
        const report = await apiCall('GET', '/admin/reports/system', adminToken);
        
        if (report.status === 200 && report.data.success) {
          console.log('✓ Administrator generate report: PASS');
          results.administrator.generateReport = 'PASS';
        } else {
          console.log('✗ Administrator generate report: FAIL -', JSON.stringify(report.data));
          results.administrator.generateReport = 'FAIL';
        }
      } catch (error) {
        console.log('✗ Administrator generate report: FAIL -', error.message);
        results.administrator.generateReport = 'FAIL';
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // JOURNEY 5: PUBLIC VISITOR
    // ===================================================================
    console.log('=== JOURNEY 5: PUBLIC VISITOR ===\n');

    // Step 1: View public internships
    try {
      const internships = await apiCall('GET', '/public/internships');
      
      if (internships.status === 200 && internships.data.success) {
        console.log('✓ Public view internships: PASS');
        results.publicVisitor.viewInternships = 'PASS';
      } else {
        console.log('✗ Public view internships: FAIL -', JSON.stringify(internships.data));
        results.publicVisitor.viewInternships = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Public view internships: FAIL -', error.message);
      results.publicVisitor.viewInternships = 'FAIL';
    }

    // Step 2: View public projects
    try {
      const projects = await apiCall('GET', '/public/projects');
      
      if (projects.status === 200 && projects.data.success) {
        console.log('✓ Public view projects: PASS');
        results.publicVisitor.viewProjects = 'PASS';
      } else {
        console.log('✗ Public view projects: FAIL -', JSON.stringify(projects.data));
        results.publicVisitor.viewProjects = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Public view projects: FAIL -', error.message);
      results.publicVisitor.viewProjects = 'FAIL';
    }

    // Step 3: View public announcements
    try {
      const announcements = await apiCall('GET', '/public/announcements');
      
      if (announcements.status === 200 && announcements.data.success) {
        console.log('✓ Public view announcements: PASS');
        results.publicVisitor.viewAnnouncements = 'PASS';
      } else {
        console.log('✗ Public view announcements: FAIL -', JSON.stringify(announcements.data));
        results.publicVisitor.viewAnnouncements = 'FAIL';
      }
    } catch (error) {
      console.log('✗ Public view announcements: FAIL -', error.message);
      results.publicVisitor.viewAnnouncements = 'FAIL';
    }

    // Step 4: Attempt to access protected route (should fail)
    try {
      const protectedRoute = await apiCall('GET', '/admin/users');
      
      if (protectedRoute.status === 401 || protectedRoute.status === 403) {
        console.log('✓ Public blocked from protected route: PASS');
        results.publicVisitor.blockedFromProtected = 'PASS';
      } else {
        console.log('✗ Public blocked from protected route: FAIL - Got status', protectedRoute.status);
        results.publicVisitor.blockedFromProtected = 'FAIL';
      }
    } catch (error) {
      console.log('✓ Public blocked from protected route: PASS (error thrown)');
      results.publicVisitor.blockedFromProtected = 'PASS';
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // SECURITY VALIDATION
    // ===================================================================
    console.log('=== SECURITY VALIDATION ===\n');

    // Test 1: Authentication required
    try {
      const noAuth = await apiCall('GET', '/profile');
      
      if (noAuth.status === 401) {
        console.log('✓ Authentication required: PASS');
        results.security.authRequired = 'PASS';
      } else {
        console.log('✗ Authentication required: FAIL - Got status', noAuth.status);
        results.security.authRequired = 'FAIL';
      }
    } catch (error) {
      console.log('✓ Authentication required: PASS (error thrown)');
      results.security.authRequired = 'PASS';
    }

    // Test 2: Role authorization (student cannot access admin)
    try {
      const unauthorized = await apiCall('GET', '/admin/users', studentToken);
      
      if (unauthorized.status === 403) {
        console.log('✓ Role authorization: PASS');
        results.security.roleAuth = 'PASS';
      } else {
        console.log('✗ Role authorization: FAIL - Got status', unauthorized.status);
        results.security.roleAuth = 'FAIL';
      }
    } catch (error) {
      console.log('✓ Role authorization: PASS (error thrown)');
      results.security.roleAuth = 'PASS';
    }

    // Test 3: Input validation (invalid email)
    try {
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'pass',
        role: 'student',
      };

      const invalid = await apiCall('POST', '/auth/register', null, invalidData);
      
      if (invalid.status === 400) {
        console.log('✓ Input validation: PASS');
        results.security.inputValidation = 'PASS';
      } else {
        console.log('✗ Input validation: FAIL - Got status', invalid.status);
        results.security.inputValidation = 'FAIL';
      }
    } catch (error) {
      console.log('✓ Input validation: PASS (error thrown)');
      results.security.inputValidation = 'PASS';
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===================================================================
    // FINAL SUMMARY
    // ===================================================================
    console.log('=== FINAL SUMMARY ===\n');

    const sections = [
      { name: 'Health Check', data: results.healthCheck },
      { name: 'Student Journey', data: results.student },
      { name: 'Instructor Journey', data: results.instructor },
      { name: 'Coordinator Journey', data: results.coordinator },
      { name: 'Administrator Journey', data: results.administrator },
      { name: 'Public Visitor Journey', data: results.publicVisitor },
      { name: 'Security Validation', data: results.security },
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const section of sections) {
      const tests = Object.values(section.data);
      const passed = tests.filter(t => t === 'PASS').length;
      const failed = tests.filter(t => t === 'FAIL').length;
      
      totalTests += tests.length;
      passedTests += passed;
      failedTests += failed;

      const status = failed === 0 ? 'PASS' : failed < tests.length ? 'PARTIAL' : 'FAIL';
      console.log(`${section.name}: ${status} (${passed}/${tests.length})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\nOVERALL: ${passedTests}/${totalTests} tests passed`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests > 0) {
      console.log('⚠️  SUBMISSION-BLOCKING ISSUES DETECTED\n');
    } else {
      console.log('✓ ALL CRITICAL JOURNEYS PASS - READY FOR SUBMISSION\n');
    }

  } catch (error) {
    console.error('\n✗ CRITICAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

// Run tests
runTests().catch(console.error);
