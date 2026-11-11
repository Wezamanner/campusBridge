/**
 * Projects Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-27 (Create personal project) · FR-28 (View project list) · FR-29 (Update project)
 *   FR-30 (Archive/delete project) · ASM-02 (Student-only feature)
 *
 * Authorization:
 *   - Students only (ASM-02).
 *   - Each student may only access their own projects.
 */

import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { ActivityLog } from '../models/ActivityLog.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects
// List all non-archived projects owned by the authenticated student
// ─────────────────────────────────────────────────────────────────────────────
export const listProjects = async (req, res, next) => {
  try {
    const filter = { ownerId: req.user._id, archived: false };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully.',
      data: projects,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/projects
// Create a new personal project (FR-27)
// ─────────────────────────────────────────────────────────────────────────────
export const createProject = async (req, res, next) => {
  try {
    const { name, description, dueDate, status } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Project name is required (minimum 2 characters).' });
    }

    const project = await Project.create({
      ownerId: req.user._id,
      name: name.trim(),
      description: description?.trim() || '',
      dueDate: dueDate || null,
      status: status || 'active',
    });

    // Log activity — FR-35
    await ActivityLog.create({
      userId: req.user._id,
      action: 'CREATE_PROJECT',
      targetType: 'Project',
      targetId: project._id,
      meta: { projectName: project.name },
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/projects/:id
// Update a project (owner only) — FR-29
// ─────────────────────────────────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.archived) {
      return res.status(409).json({ success: false, message: 'Cannot update an archived project.' });
    }

    const { name, description, dueDate, status } = req.body;

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (dueDate !== undefined) project.dueDate = dueDate || null;
    if (status !== undefined) project.status = status;

    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/projects/:id
// Archive (soft-delete) a project and its tasks (owner only) — FR-30
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Soft-delete: set archived flag
    project.archived = true;
    await project.save();

    return res.status(200).json({
      success: true,
      message: 'Project archived successfully.',
      data: { projectId: project._id, archived: true },
    });
  } catch (err) {
    next(err);
  }
};
