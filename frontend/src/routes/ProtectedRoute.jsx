import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, roles }) {
  const { authUser } = useAuth();
  if (roles && !roles.includes(authUser?.role)) {
    return <Navigate to="/app/access-denied" replace />;
  }
  return children;
}
