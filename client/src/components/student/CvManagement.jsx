import React, { useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  Trash2, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../../services/api.js';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB strict limit
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ACCEPT_STRING = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatFileSize(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function CvManagement({ cv, onCvUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';

    // Validate extension
    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file format (${ext}). Only PDF, DOC, and DOCX files are allowed.`;
    }

    // Validate size limit (2 MB)
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds maximum limit of 2 MB (${formatFileSize(file.size)}). Please choose a smaller file.`;
    }

    return null;
  };

  const handleFileChange = (e) => {
    setError(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setSuccessMessage(null);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (isUploading || !selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('cv', selectedFile);

      const response = await api.post('/profile/cv', formData);

      if (response.success && response.data) {
        setSuccessMessage(cv ? 'CV replaced successfully!' : 'CV uploaded successfully!');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (typeof onCvUpdated === 'function') {
          onCvUpdated(response.data);
        }
      } else {
        throw new Error(response.message || 'Failed to upload CV.');
      }
    } catch (err) {
      console.error('CV upload error:', err);
      setError(err.data?.message || err.message || 'An error occurred while uploading CV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading || !cv) return;
    setIsDownloading(true);
    setError(null);

    try {
      await api.download('/profile/cv', cv.name || 'Student_CV.pdf');
    } catch (err) {
      console.error('CV download error:', err);
      setError(err.data?.message || err.message || 'Failed to download CV.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getMimeBadge = (mimeType) => {
    if (!mimeType) return 'Document';
    if (mimeType.includes('pdf')) return 'PDF Document';
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'Word Document';
    return 'Document';
  };

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {error && (
        <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Current Attached CV Metadata Card */}
      {cv ? (
        <div className="p-4 rounded-xl border border-[#00C8FF]/30 bg-[#101735]/60 dark:bg-[#101735]/60 light:bg-gray-50 light:border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white dark:text-white light:text-gray-900 truncate">
                    {cv.name}
                  </h4>
                  <Badge variant="cyan" size="sm">
                    {getMimeBadge(cv.mimeType)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <span>Size: {formatFileSize(cv.size)}</span>
                  <span>&bull;</span>
                  <span>Uploaded: {formatDate(cv.uploadedAt)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              isLoading={isDownloading}
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              Download CV
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-[#1C2948] dark:border-[#1C2948] light:border-gray-300 bg-[#101735]/30 text-center space-y-1.5">
          <FileText className="w-8 h-8 mx-auto text-gray-400 opacity-60" />
          <p className="text-xs font-semibold text-gray-300 dark:text-gray-300 light:text-gray-700">
            No CV uploaded yet
          </p>
          <p className="text-[11px] text-gray-400">
            Upload your resume or curriculum vitae so internship coordinators can match you with partner organizations.
          </p>
        </div>
      )}

      {/* Upload & Replacement Dropzone */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 dark:text-gray-300 light:text-gray-700">
          {cv ? 'Replace Existing CV' : 'Upload CV Document'}
        </label>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center
            ${
              dragActive
                ? 'border-[#00C8FF] bg-[#00C8FF]/10 scale-[1.01]'
                : 'border-[#1C2948] hover:border-[#00C8FF]/50 bg-[#101735]/40 dark:bg-[#101735]/40 light:bg-gray-50 light:border-gray-200'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#00C8FF]/20 to-[#8CEBFF]/10 text-[#00C8FF] flex items-center justify-center shadow-glow-cyan-sm">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs md:text-sm font-bold text-white dark:text-white light:text-gray-900">
                Click to browse or drag and drop your file here
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Supported formats: PDF, DOC, DOCX &bull; Maximum file size: 2 MB
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Card & Actions */}
        {selectedFile && (
          <div className="p-3.5 rounded-xl border border-[#00C8FF]/40 bg-[#1C2948]/70 dark:bg-[#1C2948]/70 light:bg-white light:border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-3 min-w-0">
              <FileText className="w-5 h-5 text-[#00C8FF] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white dark:text-white light:text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {formatFileSize(selectedFile.size)} &bull; Ready to upload
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={clearSelectedFile}
                disabled={isUploading}
                title="Remove selection"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={cv ? RefreshCw : UploadCloud}
                isLoading={isUploading}
                onClick={handleUpload}
              >
                {cv ? 'Replace CV' : 'Upload CV'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
