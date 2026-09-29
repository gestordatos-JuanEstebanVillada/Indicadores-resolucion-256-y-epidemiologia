import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setMessage('')
    try{
      const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({detail:'Usuario o contraseña incorrectos'}))
        setMessage(err.detail || 'Usuario o contraseña incorrectos')
        return
      }
      const data = await res.json()
      setMessage('Login successful')
      if(data.token){
        localStorage.setItem('token', data.token)
        navigate('/app')
      }
    }catch(err){
      setMessage('Usuario o contraseña incorrectos')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-gray-600">Usuario</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} className="mt-2 block w-full border border-pink-200 rounded p-3 bg-white" placeholder="Usuario" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600">Contraseña</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full border border-pink-200 rounded p-3 bg-white" placeholder="********" />
      </div>

      <div className="flex items-center justify-between text-sm">
        
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="w-full bg-pink-600 text-white p-3 rounded-md font-medium" type="submit">Login</button>
      </div>


      

      {message && <div className="text-sm mt-2 text-red-600">{message}</div>}
    </form>
  )
}
