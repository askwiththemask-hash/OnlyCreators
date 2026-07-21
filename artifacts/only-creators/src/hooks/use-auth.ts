import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  const { data: user, isLoading, error } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const isLoggedIn = !!user;
  const isCreator = user?.accountType === "creator";
  const isAdmin = user?.role === "admin";
  return { user, isLoggedIn, isCreator, isAdmin, isLoading, error };
}
