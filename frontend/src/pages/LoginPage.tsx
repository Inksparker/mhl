import React, { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, Key, ArrowRight, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, fullName, orgName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-vault-900 to-vault-700 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <Shield className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight">OrgVault</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Secure Hybrid Storage<br />for Your Organization
          </h1>
          <p className="text-vault-200 text-lg max-w-md">
            Local-first encrypted storage with seamless cloud sync.
            Built for companies that take data security seriously.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-vault-200">
            <Lock className="w-5 h-5 text-vault-300" />
            <span>AES-256-GCM encryption at rest</span>
          </div>
          <div className="flex items-center gap-3 text-vault-200">
            <Building2 className="w-5 h-5 text-vault-300" />
            <span>Multi-company organization support</span>
          </div>
          <div className="flex items-center gap-3 text-vault-200">
            <Key className="w-5 h-5 text-vault-300" />
            <span>Role-based access control</span>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-vault-600" />
            <span className="text-xl font-bold text-vault-900">OrgVault</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 mb-8">
            {isRegister
              ? 'Set up your organization and start securing your data.'
              : 'Sign in to access your organization\'s vault.'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none transition"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none transition"
                    placeholder="Acme Corp"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none transition"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vault-500 focus:border-transparent outline-none transition"
                placeholder={isRegister ? 'Min. 12 characters' : 'Enter your password'}
                minLength={isRegister ? 12 : undefined}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-vault-600 hover:bg-vault-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-vault-600 hover:text-vault-800 font-medium"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
