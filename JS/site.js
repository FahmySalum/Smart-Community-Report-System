(function () {
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

  const user = CityReport.getCurrentUser();
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  if (user) {
    navActions.innerHTML = `
      <span class="nav-user">Hello, ${escapeHTML(user.name)}</span>
      <button class="btn btn-secondary" id="sign-out-button" type="button">Sign Out</button>
    `;

    const signOutButton = document.getElementById('sign-out-button');
    if (signOutButton) {
      signOutButton.addEventListener('click', () => {
        localStorage.removeItem('cityreport.currentUser');
        window.location.reload();
      });
    }
  }
})();
