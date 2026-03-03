import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir automáticamente al dashboard
  redirect('/dashboard');
}
