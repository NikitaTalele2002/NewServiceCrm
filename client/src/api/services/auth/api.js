export const Login = async () => {
  try {
    let response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: "your-token-here",
      },
      body: JSON.stringify({ username: "user", password: "pass" }),
    });
    return response;
  } catch (error) {
    return error.message;
  }
};
