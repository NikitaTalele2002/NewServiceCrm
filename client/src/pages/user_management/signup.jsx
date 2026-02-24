import React from "react";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useNavigate } from "react-router-dom";

export default function Signup() {
    const [Username, setUsername] = React.useState('');
    const [Email, setEmail] = React.useState('');
    const [Password, setPassword] = React.useState('');
    const [ConfirmPassword, setConfirmPassword] = React.useState('');
    const [Phone, setPhone] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        if (Password !== ConfirmPassword) {
            setErrorMessage('Passwords do not match');
            return;
        }
        if (!Username || !Email || !Password || !Phone) {
            setErrorMessage('All fields are required');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username, Email, Password, Phone })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Signup failed');
            }
            // Success
            console.log('Signup successful:', data);
            navigate('/login');
        } catch (err) {
            setErrorMessage(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    }
    
    
  return (
    <div className="min-w-screen flex flex-col justify-center items-center bg-gray-100">
            <div className="w-96 p-6 bg-white rounded shadow-md">
                <h1 className="text-blue-500 text-xl font-bold mb-4">Sign Up</h1>
                {errorMessage && <ErrorMessage message={errorMessage} />}
                <form onSubmit={handleLogin} className='text-xl'>
                    <FormInput 
                        label='Username' 
                        name='username' 
                        type='text' 
                        value={Username} 
                        onChange={(e) => setUsername(e.target.value)}
                        required 
                    />
                    <FormInput 
                        label='Email' 
                        name='email' 
                        type='email' 
                        value={Email} 
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                    />
                    <FormInput 
                        label='Password' 
                        name='password' 
                        type='password' 
                        value={Password} 
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                    />
                    <FormInput 
                        label='Confirm Password' 
                        name='confirmPassword' 
                        type='password' 
                        value={ConfirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required 
                    />
                    <FormInput 
                        label='Phone Number' 
                        name='phone' 
                        type='tel' 
                        value={Phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        required 
                    />
                    <div>
                       <a onClick={() => navigate('/login')} className="text-blue-500 hover:underline italic cursor-pointer">Already have account? Login</a>
                    </div>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        loading={loading}
                    >
                        Sign Up
                    </Button>
                </form>
            </div>
        </div>
  );
}


    