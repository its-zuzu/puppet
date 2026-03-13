const axios = require('axios');

const credentials = {
  email: 'admin@cyberctf.com',
  password: 'admin123'
};

async function testLogin() {
  try {
    console.log('Attempting to login with:', credentials);
    const response = await axios.post('http://localhost:5000/api/auth/login', credentials);
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Login failed!');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data);
  }
}

testLogin();
