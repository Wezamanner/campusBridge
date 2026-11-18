// In production, VITE_API_BASE_URL is set to the full Render URL including /api/v1
// Confirmed live backend: https://campusbridge-fqns.onrender.com/api/v1
// In local development it is unset, so the Vite dev-server proxy handles /api/v1 → localhost:5001.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

/**
 * Enhanced fetch wrapper for CampusBridge API with automatic Bearer token injection
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('campusbridge_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // When sending FormData (e.g. multipart/form-data file uploads),
  // omit Content-Type header so the browser automatically sets the correct multipart boundary.
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Auto-clear invalid/expired token on 401
      if (response.status === 401 && token) {
        localStorage.removeItem('campusbridge_token');
        localStorage.removeItem('campusbridge_user');
      }

      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Downloads a file as a binary blob with automatic Bearer token injection.
 * Resolves the downloaded filename from Content-Disposition if provided.
 */
export async function downloadFile(endpoint, fallbackFilename = 'document.pdf') {
  const token = localStorage.getItem('campusbridge_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `Download failed with status ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // Parse filename from Content-Disposition if present
  let filename = fallbackFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch {
        filename = utf8Match[1];
      }
    } else {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }
  }

  // Sanitize downloaded filename to prevent path traversal or special character issues
  filename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim() || fallbackFilename;

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return { success: true, filename };
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
  download: (endpoint, fallbackFilename) => downloadFile(endpoint, fallbackFilename),
};

export default api;
