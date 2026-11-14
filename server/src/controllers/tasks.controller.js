/**
 * Tasks Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-31 (Create task) · FR-32 (Manage tasks — update, complete, delete)
 *   ASM-02 (Student-only feature)
 *
 * Authorization:
 *   - Students only (ASM-02).
 *   - Each student may only access their own tasks.
 *   - If a projectId is provided, the project must belong to the same student.
 */

import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { sanitizeMetadata } from '../utils/validation.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/tasks
// List tasks for the authenticated student, with optional filters
// ─────────────────────────────────────────────────────────────────────────────
export const listTasks = async (req, res, next) => {
  try {
    const filter = { ownerId: req.user._id };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }

    const tasks = await Task.find(filter).sort({ dueDate: 1, createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully.',
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/tasks
// Create a new task (FR-31)
// ─────────────────────────────────────────────────────────────────────────────
export const createTask = async (req, res, next) => {
  try {
    const { title, projectId, dueDate, priority } = req.body;

    if (!title || title.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Task title is required (minimum 2 characters).' });
    }

    // If projectId supplied, verify it belongs to this student
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, ownerId: req.user._id, archived: false }).lean();
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or does not belong to you.',
        });
      }
    }

    const task = await Task.create({
      ownerId: req.user._id,
      title: title.trim(),
      projectId: projectId || null,
      dueDate: dueDate || null,
      priority: priority || 'medium',
    });

    // Log activity — FR-35
    await ActivityLog.create({
      userId: req.user._id,
      action: 'CREATE_TASK',
      targetType: 'Task',
      targetId: task._id,
      meta: sanitizeMetadata({ taskTitle: task.title }),
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/tasks/:id
// Update a task (owner only) — FR-32
// ─────────────────────────────────────────────────────────────────────────────
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const { title, dueDate, priority, status } = req.body;
    const wasNotDone = task.status !== 'done';

    if (title !== undefined) task.title = title.trim();
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;

    await task.save(); // pre-save hook handles completedAt

    // Log COMPLETE_TASK activity when status transitions to done
    if (wasNotDone && task.status === 'done') {
      await ActivityLog.create({
        userId: req.user._id,
        action: 'COMPLETE_TASK',
        targetType: 'Task',
        targetId: task._id,
        meta: sanitizeMetadata({ taskTitle: task.title }),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/tasks/:id
// Delete a task (owner only) — FR-32
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
      data: { taskId: task._id },
    });
  } catch (err) {
    next(err);
  }
};
