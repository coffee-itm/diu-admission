import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { ROUTES, PROGRAMS } from '../../lib/constants.js';
import { useAuth } from '../../features/auth/useAuth.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';

const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(11, 'Phone number must be at least 11 digits'),
  program: z.string().min(1, 'Select your intended program'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function RegisterPage() {
  const { register: registerAction, loading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      await registerAction(data);
      navigate(ROUTES.CANDIDATE_DASHBOARD, { replace: true });
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-slate-50 page-enter">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-600">Register for the DIU Admission Test — open to all DIU programs.</p>
        </div>

        <Card className="p-8 shadow-lg shadow-slate-200/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="name"
              label="Full Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="John Doe"
              leftIcon={<User size={16} />}
            />
            <Input
              id="email"
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
            />
            <Input
              id="phone"
              label="Phone Number"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="017XX-XXXXXX"
              leftIcon={<Phone size={16} />}
            />
            <div>
              <label htmlFor="program" className="block text-sm font-medium text-slate-700 mb-1">
                Intended Program
              </label>
              <select
                id="program"
                {...register('program')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-shadow"
              >
                <option value="">Select a program…</option>
                {PROGRAMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.program && <p className="mt-1 text-xs text-red-600">{errors.program.message}</p>}
            </div>
            <Input
              id="password"
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
            />
            
            <Button type="submit" className="w-full mt-4" size="lg" loading={loading}>
              Register
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-600 mt-8">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Login here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
