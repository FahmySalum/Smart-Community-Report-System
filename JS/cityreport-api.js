(function () {
  const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
  const storageKey = 'cityreport.currentUser';

  const categoryLabels = {
    pothole: 'Pothole',
    streetlight: 'Streetlight',
    water_leak: 'Water Leak',
    garbage: 'Garbage/Litter',
    graffiti: 'Graffiti',
    drainage: 'Drainage',
    road_damage: 'Road Damage',
    noise: 'Noise Complaint',
    other: 'Other'
  };

  const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  };

  const priorityClasses = {
    low: 'badge-soft',
    medium: 'badge-primary',
    high: 'badge-warning',
    critical: 'badge-danger'
  };

  const statusClasses = {
    open: 'badge-primary',
    in_progress: 'badge-warning',
    resolved: 'badge-success',
    closed: 'badge-soft'
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  async function request(path, options = {}) {
    const user = getCurrentUser();
    const headers = new Headers(options.headers || {});
    const hasFormData = options.body instanceof FormData;

    if (options.body && !hasFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (user?.id) headers.set('X-User-Id', user.id);

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
    const contentType = response.headers.get('Content-Type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof payload === 'object' ? payload.error : payload;
      throw new Error(message || `Request failed with ${response.status}`);
    }

    return payload;
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem(storageKey, JSON.stringify(user));
  }

  function formatDate(value) {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function relativeTime(value) {
    if (!value) return 'Unknown';
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.round(diff / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  function issueMapUrl(issue) {
    if (issue.latitude && issue.longitude) {
      return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(issue.latitude)}&mlon=${encodeURIComponent(issue.longitude)}#map=18/${encodeURIComponent(issue.latitude)}/${encodeURIComponent(issue.longitude)}`;
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(issue.location || '')}`;
  }

  window.CityReport = {
    API_BASE,
    request,
    getCurrentUser,
    setCurrentUser,
    labels: { categoryLabels, statusLabels, priorityLabels },
    classes: { priorityClasses, statusClasses },
    escapeHTML,
    formatDate,
    relativeTime,
    issueMapUrl
  };
}());
