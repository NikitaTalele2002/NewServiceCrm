export const loginApi = async (loginData) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
  });
  if (!response.ok) throw new Error('Login failed');
  return await response.json();
};

export const signupApi = async (signupData) => {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signupData)
  });
  if (!response.ok) throw new Error('Signup failed');
  return await response.json();
};

export const forgotPasswordApi = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error('Failed to send reset email');
  return await response.json();
};

export const resetPasswordApi = async (resetData) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resetData)
  });
  if (!response.ok) throw new Error('Failed to reset password');
  return await response.json();
};


