import { useState, useEffect, useCallback } from "react";

// BSC Configuration
const BSC_CHAIN_ID = "0x38"; // 56 in hex
const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com/"],
};

// Tron Configuration
const TRON_NETWORK = "mainnet";

export type NetworkType = "bsc" | "tron";

interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  network: NetworkType;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    network: (localStorage.getItem("walletNetwork") as NetworkType) || "tron",
  });

  // --- BSC/MetaMask Provider ---
  const getEthProvider = () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  };

  // --- Tron/TronLink Provider ---
  const getTronProvider = () => {
    if (typeof window !== "undefined" && (window as any).tronWeb && (window as any).tronWeb.ready) {
      return (window as any).tronWeb;
    }
    if (typeof window !== "undefined" && (window as any).tronLink) {
      return (window as any).tronLink;
    }
    return null;
  };

  const fetchBscBalance = useCallback(async (address: string) => {
    const provider = getEthProvider();
    if (!provider) return null;
    try {
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      const balanceInBNB = parseInt(balance, 16) / 1e18;
      return balanceInBNB.toFixed(4);
    } catch {
      return null;
    }
  }, []);

  const fetchTronBalance = useCallback(async (address: string) => {
    try {
      const tronWeb = (window as any).tronWeb;
      if (!tronWeb || !tronWeb.ready) return null;
      const balance = await tronWeb.trx.getBalance(address);
      const balanceInTRX = balance / 1e6; // TRX has 6 decimals
      return balanceInTRX.toFixed(4);
    } catch {
      return null;
    }
  }, []);

  const switchToBSC = useCallback(async () => {
    const provider = getEthProvider();
    if (!provider) return false;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [BSC_CHAIN_CONFIG],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, []);

  // Connect to BSC via MetaMask
  const connectBSC = useCallback(async () => {
    const provider = getEthProvider();
    if (!provider) {
      setState((prev) => ({
        ...prev,
        error: "لم يتم العثور على محفظة. يرجى تثبيت MetaMask أو Trust Wallet.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "لم يتم اختيار حساب.",
        }));
        return;
      }

      const chainId = await provider.request({ method: "eth_chainId" });

      if (chainId !== BSC_CHAIN_ID) {
        const switched = await switchToBSC();
        if (!switched) {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: "فشل التبديل إلى شبكة BSC.",
          }));
          return;
        }
      }

      const address = accounts[0];
      const balance = await fetchBscBalance(address);

      setState({
        address,
        balance,
        chainId: BSC_CHAIN_ID,
        isConnected: true,
        isConnecting: false,
        error: null,
        network: "bsc",
      });

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletNetwork", "bsc");
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || "فشل الاتصال بالمحفظة.",
      }));
    }
  }, [switchToBSC, fetchBscBalance]);

  // Connect to Tron via TronLink
  const connectTron = useCallback(async () => {
    const tronLink = (window as any).tronLink;
    const tronWeb = (window as any).tronWeb;

    if (!tronLink && !tronWeb) {
      setState((prev) => ({
        ...prev,
        error: "لم يتم العثور على محفظة TronLink. يرجى تثبيت TronLink.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request connection via TronLink
      if (tronLink && tronLink.request) {
        const res = await tronLink.request({ method: "tron_requestAccounts" });
        if (res.code === 4001) {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: "تم رفض الاتصال من قبل المستخدم.",
          }));
          return;
        }
      }

      // Wait a moment for tronWeb to be injected
      await new Promise((resolve) => setTimeout(resolve, 500));

      const tw = (window as any).tronWeb;
      if (!tw || !tw.ready || !tw.defaultAddress?.base58) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "فشل الاتصال بـ TronLink. تأكد من فتح المحفظة وتسجيل الدخول.",
        }));
        return;
      }

      const address = tw.defaultAddress.base58;
      const balance = await fetchTronBalance(address);

      setState({
        address,
        balance,
        chainId: TRON_NETWORK,
        isConnected: true,
        isConnecting: false,
        error: null,
        network: "tron",
      });

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletNetwork", "tron");
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || "فشل الاتصال بمحفظة TronLink.",
      }));
    }
  }, [fetchTronBalance]);

  // Main connect function - uses selected network
  const connect = useCallback(async (network?: NetworkType) => {
    const targetNetwork = network || state.network;
    if (targetNetwork === "tron") {
      await connectTron();
    } else {
      await connectBSC();
    }
  }, [state.network, connectTron, connectBSC]);

  // Switch network
  const switchNetwork = useCallback((network: NetworkType) => {
    setState((prev) => ({ ...prev, network, error: null }));
    localStorage.setItem("walletNetwork", network);
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      network: state.network,
    });
    localStorage.removeItem("walletConnected");
  }, [state.network]);

  // Auto-reconnect on page load
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem("walletConnected");
      const savedNetwork = localStorage.getItem("walletNetwork") as NetworkType;

      if (!wasConnected) return;

      if (savedNetwork === "tron") {
        // Auto-reconnect Tron
        const tw = (window as any).tronWeb;
        if (tw && tw.ready && tw.defaultAddress?.base58) {
          const address = tw.defaultAddress.base58;
          const balance = await fetchTronBalance(address);
          setState({
            address,
            balance,
            chainId: TRON_NETWORK,
            isConnected: true,
            isConnecting: false,
            error: null,
            network: "tron",
          });
        }
      } else {
        // Auto-reconnect BSC
        const provider = getEthProvider();
        if (provider) {
          try {
            const accounts = await provider.request({
              method: "eth_accounts",
            });
            if (accounts.length > 0) {
              const address = accounts[0];
              const chainId = await provider.request({ method: "eth_chainId" });
              const balance = await fetchBscBalance(address);
              setState({
                address,
                balance,
                chainId,
                isConnected: true,
                isConnecting: false,
                error: null,
                network: "bsc",
              });
            }
          } catch {
            // Silent fail on auto-reconnect
          }
        }
      }
    };
    autoConnect();
  }, [fetchBscBalance, fetchTronBalance]);

  // Listen for account/chain changes (BSC)
  useEffect(() => {
    const provider = getEthProvider();
    if (!provider || state.network !== "bsc") return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const balance = await fetchBscBalance(accounts[0]);
        setState((prev) => ({
          ...prev,
          address: accounts[0],
          balance,
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState((prev) => ({ ...prev, chainId }));
      if (chainId !== BSC_CHAIN_ID && state.isConnected) {
        setState((prev) => ({
          ...prev,
          error: "يرجى التبديل إلى شبكة BSC.",
        }));
      } else {
        setState((prev) => ({ ...prev, error: null }));
      }
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect, fetchBscBalance, state.isConnected, state.network]);

  return {
    ...state,
    connect,
    disconnect,
    switchToBSC,
    switchNetwork,
  };
}