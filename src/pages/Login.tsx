import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuthStore } from '../stores';
import { auth } from '../lib/firebase';
import { toast } from '../components/ui';

// Schéma de validation
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast('Veuillez entrer votre adresse email', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast('Email de réinitialisation envoyé', 'success');
      setShowResetForm(false);
      setResetEmail('');
    } catch (err: any) {
      toast(err.message || 'Erreur lors de l\'envoi de l\'email', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await signIn(data.email, data.password);
      navigate('/');
    } catch (error) {
      // L'erreur est déjà gérée dans le store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo_100plus.jpg" alt="100PLUS SHOP" className="h-20 object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Accédez à votre espace de gestion
          </p>
        </div>

        {/* Formulaire */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="votreemail@exemple.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Votre mot de passe"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
              <button
                type="button"
                className="mt-1 text-sm text-primary hover:underline"
                onClick={() => setShowResetForm(!showResetForm)}
              >
                Mot de passe oublié ?
              </button>

              {showResetForm && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <p className="text-sm text-gray-600">
                    Entrez votre adresse email pour recevoir un lien de réinitialisation.
                  </p>
                  <input
                    type="email"
                    className="input"
                    placeholder="votreemail@exemple.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={resetLoading}
                    className="btn-primary w-full flex items-center justify-center py-2 text-sm"
                    onClick={handlePasswordReset}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer le lien'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Erreur globale */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center py-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          100PLUS SHOP - Gestion commerciale
        </p>
      </div>
    </div>
  );
}
