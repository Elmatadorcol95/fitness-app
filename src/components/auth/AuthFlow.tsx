import { useState } from 'react';
import { LoginForm }        from './LoginForm';
import { RegisterForm }     from './RegisterForm';
import { VerifyEmailScreen } from './VerifyEmailScreen';

type View = 'login' | 'register' | 'verify';

export function AuthFlow() {
  const [view, setView]   = useState<View>('login');
  const [email, setEmail] = useState('');

  if (view === 'register') {
    return (
      <RegisterForm
        onBack={() => setView('login')}
        onSuccess={(e) => { setEmail(e); setView('verify'); }}
      />
    );
  }

  if (view === 'verify') {
    return (
      <VerifyEmailScreen
        email={email}
        onBack={() => setView('login')}
      />
    );
  }

  return <LoginForm onRegister={() => setView('register')} />;
}
