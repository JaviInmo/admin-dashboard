import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";
import { ThemeProvider } from "@/contexts/theme-context";

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
	return (
		<ThemeProvider defaultTheme="system" storageKey="dashboard-ui-theme">
			<QueryClientProvider client={queryClient}>
				<ReactQueryDevtools initialIsOpen={false} />
				{children}
			</QueryClientProvider>
		</ThemeProvider>
	);
}
