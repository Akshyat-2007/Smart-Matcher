import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { api, setToken } from '../services/api.js';

export default function AuthPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await api.register(name, email, password);
      } else {
        data = await api.login(email, password);
      }
      setToken(data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-brand-400 text-xs font-medium mb-4 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Study Matcher
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white tracking-tight">
          {isRegister ? 'Create an Account' : 'Welcome Back'}
        </h1>
        <p className="mt-2 text-neutral-400 text-xs sm:text-sm font-light leading-relaxed">
          {isRegister
            ? 'Sign up to discover your complementary teach-swap study partner.'
            : 'Sign in to access your study hub, milestones, and upcoming sessions.'}
        </p>
      </motion.div>

      {/* Centered Sign In / Sign Up Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/[0.12]"
      >
        <div className="flex border-b border-white/[0.08] mb-6">
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 pb-3 text-sm font-medium transition border-b-2 ${
              !isRegister ? 'border-brand-500 text-white font-semibold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 pb-3 text-sm font-medium transition border-b-2 ${
              isRegister ? 'border-brand-500 text-white font-semibold' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Lee"
                  className="w-full pl-10 pr-3 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition font-light"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition font-light"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition font-light"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition shadow-lg shadow-white/10 flex items-center justify-center gap-2 mt-4 group"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Register & Continue' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
