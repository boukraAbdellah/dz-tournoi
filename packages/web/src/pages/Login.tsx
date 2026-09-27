import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Mail, ArrowRight, Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../settings';

export default function LoginPage() {
  const { t } = useTranslation();
  const { rtl } = useAppSettings();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(rtl ? 'يرجى ملء جميع الحقول' : 'Veuillez renseigner tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || (rtl ? 'خطأ في البريد الإلكتروني أو كلمة المرور' : 'Identifiants invalides'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@sport-competition.dz');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 text-white">
            <Trophy size={28} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-ink">
          {rtl ? 'منصة إدارة البطولات والرياضات القتالية' : 'Sport Compétition Algérie'}
        </h2>
        <p className="mt-1 text-center text-sm text-ink-muted">
          {rtl ? 'تسجيل الدخول للمسؤولين ومسيري الرابطات الولائية' : 'Connexion Organisateurs & Ligues de Wilaya'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-md rounded-2xl border border-border sm:px-10">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg bg-danger-subtle p-3 text-sm text-danger border border-danger/20">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {user && (
            <div className="mb-5 flex items-center justify-between rounded-lg bg-success-subtle p-3 text-sm text-success border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>
                  {rtl ? 'أنت متصل حالياً باسم:' : 'Connecté en tant que :'}{' '}
                  <strong>{user.name}</strong> ({user.role})
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-medium underline hover:text-success/80 text-xs"
              >
                {rtl ? 'لوحة التحكم' : 'Accéder'}
              </button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                {rtl ? 'البريد الإلكتروني' : 'Adresse Email'}
              </label>
              <div className="relative">
                <div className={`pointer-events-none absolute inset-y-0 ${rtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center text-ink-faint`}>
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sport-competition.dz"
                  required
                  className={`block w-full rounded-xl border border-border bg-bg-subtle py-2.5 ${rtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                {rtl ? 'كلمة المرور' : 'Mot de passe'}
              </label>
              <div className="relative">
                <div className={`pointer-events-none absolute inset-y-0 ${rtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center text-ink-faint`}>
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`block w-full rounded-xl border border-border bg-bg-subtle py-2.5 ${rtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{rtl ? 'تسجيل الدخول' : 'Se connecter'}</span>
                  <ArrowRight size={16} className={rtl ? 'rotate-180' : ''} />
                </>
              )}
            </button>
          </form>



          <div className="mt-6 text-center">
            <Link
              to="/competitions"
              className="text-xs font-medium text-ink-muted hover:text-primary transition-colors"
            >
              {rtl ? '← العودة إلى قائمة البطولات' : '← Consulter les compétitions en mode public'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
