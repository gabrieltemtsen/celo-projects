import { createConfig, http, WagmiProvider } from "wagmi";
import { base, celo, } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export const config = createConfig({
  chains: [base, celo],
  transports: {
    [base.id]: http(),
    [celo.id]: http(),
  },
  connectors: [farcasterFrame() ],
});

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
