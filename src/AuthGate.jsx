import React, { useEffect, useState } from 'react';
import { supabase, hasSupabase } from './lib/supabase';

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    else {
      const { data: profile, error: profileError } = await supabase.from('user_profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (profileError || !profile) { await supabase.auth.signOut(); setError(profileError?.message || 'This account has no workspace profile. Ask the administrator to provision it.'); }
      else if (profile.role !== loginRole) { await supabase.auth.signOut(); setError(`This account is registered as ${profile.role}. Please choose ${profile.role === 'admin' ? 'Admin' : 'Employee'} Login.`); }
    }
    setBusy(false);
  }
  return <main className="authShell"><form className="authCard" onSubmit={signIn}>
    <div className="authMark">✦</div><p className="authEyebrow">AKSHAYAKALPA · RETAIL INTELLIGENCE</p>
    <h1>Welcome back</h1><p className="authIntro">Choose your workspace access, then sign in with your account.</p>
    <div className="authRoleChoices" role="group" aria-label="Choose login type">
      <button type="button" className={loginRole==='admin'?'active':''} onClick={()=>{setLoginRole('admin');setError('');}}>Admin Login</button>
      <button type="button" className={loginRole==='employee'?'active':''} onClick={()=>{setLoginRole('employee');setError('');}}>Employee Login</button>
    </div>
    {error && <div className="authError" role="alert">{error}</div>}
    <label htmlFor="auth-email">Email address</label>
    <input id="auth-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
    <label htmlFor="auth-password">Password</label>
    <input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/>
    <button className="authSubmit" type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    <p className="authFoot">{loginRole==='admin'?'Administrator access to the full retail workspace.':'Employee access to the attendance portal.'} Accounts are created by the administrator; public sign-up is disabled.</p>
  </form></main>;
}

export default function AuthGate({children}) {
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[profileError,setProfileError]=useState('');
  useEffect(()=>{
    if(!hasSupabase){setLoading(false);return;}
    let alive=true;
    const loadProfile=async currentSession=>{
      if(!currentSession?.user){if(alive){setSession(null);setProfile(null);setProfileError('');setLoading(false);}return;}
      if(alive){setSession(currentSession);setLoading(true);}
      const {data,error}=await supabase.from('user_profiles').select('id,full_name,role,employee_id').eq('id',currentSession.user.id).maybeSingle();
      if(!alive)return;
      setProfile(data||null);setProfileError(error?.message||'');setLoading(false);
    };
    supabase.auth.getSession().then(({data,error})=>{if(error)setProfileError(error.message);loadProfile(data?.session||null);});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,nextSession)=>{Promise.resolve().then(()=>loadProfile(nextSession));});
    return ()=>{alive=false;listener.subscription.unsubscribe();};
  },[]);
  if(!hasSupabase)return <main className="authShell"><section className="authCard"><h1>Supabase is not configured</h1><p className="authIntro">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.</p></section></main>;
  if(loading)return <main className="authShell"><div className="authLoading">Checking secure session…</div></main>;
  if(!session)return <LoginScreen/>;
  if(profileError||!profile)return <main className="authShell"><section className="authCard"><h1>Account not provisioned</h1><p className="authIntro">Your login is valid, but an administrator must create your user profile and assign a role before you can enter.</p>{profileError&&<div className="authError">{profileError}</div>}<button className="authSubmit" onClick={()=>supabase.auth.signOut()}>Sign out</button></section></main>;
  if(!['admin','employee'].includes(profile.role))return <main className="authShell"><section className="authCard"><h1>Role not supported</h1><p className="authIntro">Your account role is {profile.role}. Ask an administrator to assign admin or employee access.</p><button className="authSubmit" onClick={()=>supabase.auth.signOut()}>Sign out</button></section></main>;
  return React.cloneElement(children,{user:session.user,profile,onSignOut:()=>supabase.auth.signOut()});
}
