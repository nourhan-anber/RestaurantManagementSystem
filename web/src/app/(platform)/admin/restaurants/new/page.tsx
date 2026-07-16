import Link from 'next/link';
import { CreateRestaurantForm } from './create-restaurant-form';

export default function NewRestaurantPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Back to restaurants
      </Link>
      <h1 className="mt-4 font-display text-2xl tracking-tight text-foreground">New restaurant</h1>
      <p className="mt-1 text-sm text-muted">
        Create the tenant and its first owner. The owner can then invite chefs and servers.
      </p>

      <div className="mt-8">
        <CreateRestaurantForm />
      </div>
    </div>
  );
}
