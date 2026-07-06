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
      ${user.role === 'admin' ? '<a class="btn btn-secondary" href="admin.html">Admin</a>' : ''}
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
  else {
    // Provide sign in / sign up links that preserve `next` param so users return to current page
    const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    navActions.innerHTML = `
      <a href="login.html?next=${next}" class="sign-in">Sign In</a>
      <a href="signup.html?next=${next}" class="sign-up">Sign Up</a>
    `;
  }
})();
