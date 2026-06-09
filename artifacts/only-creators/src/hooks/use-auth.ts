import { useGetMe } from "@workspace/api-client-react";

export function useAuth() {
  const { data: user, isLoading, error } = useGetMe({ query: { retry: false } });
  const isLoggedIn = !!user;
  const isCreator = user?.accountType === "creator";
  const isAdmin = user?.role === "admin";
  return { user, isLoggedIn, isCreator, isAdmin, isLoading, error };
}
