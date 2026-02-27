import React from "react";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import SuccessMessage from "../../components/common/SuccessMessage";
import { getApiUrl } from "../../config/apiConfig";


export default function ForgotPwd(){
    const [email, setEmail] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [successMessage, setSuccessMessage] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        
        if (!email) {
            setErrorMessage('Email is required');
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/auth/forgot-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to send reset link');
            }
            setSuccessMessage('Password reset link sent to your email');
            setEmail('');
        } catch (err) {
            setErrorMessage(err.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-w-screen flex flex-col justify-center items-center bg-gray-100">
            <div className="w-96 p-6 bg-white rounded shadow-md">
                <h1 className="text-blue-500 text-xl font-bold mb-4">Forgot Password</h1>
                {errorMessage && <ErrorMessage message={errorMessage} />}
                {successMessage && <SuccessMessage message={successMessage} />}
                <form onSubmit={handleSubmit} className='text-xl'>
                    <FormInput 
                        label='Email' 
                        name='email' 
                        type='email' 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                    />
                    <Button 
                        type='submit' 
                        variant='primary' 
                        loading={loading}
                    >
                        Reset Password
                    </Button>
                </form>
            </div>
        </div>
    );
}


