(async function () {
  const totalIssues = document.getElementById('admin-total-issues');
  const openIssues = document.getElementById('admin-open-issues');
  const inProgressIssues = document.getElementById('admin-in-progress');
  const resolvedIssues = document.getElementById('admin-resolved');
  const issuesBody = document.getElementById('admin-issues-body');
  const usersBody = document.getElementById('admin-users-body');

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"`]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '`': '&#096;'
    }[char]));
  }

  async function loadSummary() {
    try {
      const summary = await CityReport.request('/api/admin/summary');
      if (totalIssues) totalIssues.textContent = summary.totalIssues || 0;
      if (openIssues) openIssues.textContent = summary.openIssues || 0;
      if (inProgressIssues) inProgressIssues.textContent = summary.inProgressIssues || 0;
      if (resolvedIssues) resolvedIssues.textContent = summary.resolvedIssues || 0;
    } catch (error) {
      console.warn('Unable to load admin summary', error);
    }
  }

  async function loadIssues() {
    if (!issuesBody) return;
    try {
      const response = await CityReport.request('/api/issues');
      const issues = response.issues || [];
      if (!issues.length) {
        issuesBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:rgba(18,18,18,0.65); padding:2rem;">No issues available.</td></tr>';
        return;
      }
      issuesBody.innerHTML = issues.map(issue => `
        <tr>
          <td>${escapeHTML(issue.id)}</td>
          <td>${escapeHTML(issue.title)}</td>
          <td>${escapeHTML(issue.categoryLabel)}</td>
          <td>${escapeHTML(issue.statusLabel)}</td>
          <td>${escapeHTML(issue.priorityLabel)}</td>
          <td>${issue.upvotes || 0}</td>
          <td style="text-align:right;"><a class="btn btn-secondary" href="issue-detail.html?id=${encodeURIComponent(issue.id)}" style="padding:0.5rem 0.85rem;">View</a></td>
        </tr>
      `).join('');
    } catch (error) {
      issuesBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:rgba(18,18,18,0.65); padding:2rem;">Unable to load issues.</td></tr>';
      console.error(error);
    }
  }

  async function loadUsers() {
    if (!usersBody) return;
    try {
      const response = await CityReport.request('/api/admin/users');
      const users = response.users || [];
      if (!users.length) {
        usersBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:rgba(18,18,18,0.65); padding:2rem;">No users available.</td></tr>';
        return;
      }
      usersBody.innerHTML = users.map(user => `
        <tr>
          <td>${escapeHTML(user.id)}</td>
          <td>${escapeHTML(user.name)}</td>
          <td>${escapeHTML(user.email)}</td>
          <td>${escapeHTML(user.role)}</td>
          <td>${escapeHTML(user.status)}</td>
          <td>${user.issuesReported || 0}</td>
          <td>${escapeHTML(new Date(user.joinedAt).toLocaleDateString())}</td>
          <td style="text-align:right;"><button class="btn btn-secondary" type="button" style="padding:0.5rem 0.85rem;">Edit</button></td>
        </tr>
      `).join('');
    } catch (error) {
      usersBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:rgba(18,18,18,0.65); padding:2rem;">Unable to load users.</td></tr>';
      console.error(error);
    }
  }

  await Promise.all([loadSummary(), loadIssues(), loadUsers()]);
})();
