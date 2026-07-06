(function () {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authStatus = document.getElementById('auth-status');

  function showStatus(message, isSuccess = false) {
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.className = `form-status ${isSuccess ? 'is-success' : 'is-error'}`;
  }

  function clearStatus() {
    if (!authStatus) return;
    authStatus.textContent = '';
    authStatus.className = 'form-status';
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearStatus();

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      showStatus('Please enter both email and password.');
      return;
    }

    submitButton.disabled = true;
    showStatus('Signing in...');

    try {
      const { user } = await CityReport.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      CityReport.setCurrentUser(user);

      showStatus('Signed in successfully. Redirecting...', true);

      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next) {
        window.location.href = next;
      } else if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    } catch (error) {
      showStatus(error.message || 'Unable to sign in.');
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    clearStatus();

    const fullName = document.getElementById('fullname')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirm = document.getElementById('confirm')?.value;
    const submitButton = signupForm.querySelector('button[type="submit"]');

    if (!fullName || !email || !password || !confirm) {
      showStatus('Please complete all fields.');
      return;
    }

    if (password !== confirm) {
      showStatus('Passwords do not match.');
      return;
    }

    submitButton.disabled = true;
    showStatus('Creating account...');

    try {
      const { user } = await CityReport.request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: fullName, email, password })
      });
      CityReport.setCurrentUser(user);
      showStatus('Account created successfully. Redirecting...', true);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next) {
        window.location.href = next;
      } else {
        window.location.href = 'index.html';
      }
    } catch (error) {
      showStatus(error.message || 'Unable to create account.');
    } finally {
      submitButton.disabled = false;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}());
