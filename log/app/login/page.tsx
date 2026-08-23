import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="panel">
        <h1>JVV Log</h1>
        <LoginForm />
      </div>
    </div>
  );
}
