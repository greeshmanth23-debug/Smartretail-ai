import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useNavigate,Link } from 'react-router-dom';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [shopname, setShopname] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const handlesignup = (e) => {
    e.preventDefault();
    axios.post('http://localhost:5001/signup', {username, shopname, email, password})
        .then((response) =>{
            if(response.data.message === "success"){
                alert("User created successfully"); 
                navigate('/');               
            }
            else{
                alert("User already exists");
            }
        })
    
  };
  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-header">
          <div className="signup-logo">SR</div>
          <h2>Sign Up</h2>
          <p className="signup-subtitle">Create your SmartRetail account</p>
        </div>

        <form className="signup-form" onSubmit={(e) => handlesignup(e)}>
          <label htmlFor="username">Username</label>
          <input type="text" id="username" name="username" required onChange={(e) => setUsername(e.target.value)} />

          <label htmlFor="shopname">Shop Name</label>
          <input type="text" id="shopname" name="shopname" required onChange={(e) => setShopname(e.target.value)} />

          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" required onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" required onChange={(e) => setPassword(e.target.value)} />

          <button type="submit">Sign Up</button>
        </form>

        <p className="login-text">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup;