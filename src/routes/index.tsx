import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomeRoute,
  beforeLoad: () => {
    throw redirect({
      to: '/library',
    });
  },
});

function HomeRoute() {
  return <div>Redirecting to library...</div>;
}
