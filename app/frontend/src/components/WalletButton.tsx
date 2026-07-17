import { useState } from "react";
import { useWallet, type NetworkType } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Wallet, Copy, Check, ExternalLink, LogOut, Loader2 } from "lucide-react";

const NETWORK_INFO: Record<NetworkType, { name: string; symbol: string; explorer: string; color: string; icon: string }> = {
  bsc: {
    name: "BNB Smart Chain",
    symbol: "BNB",
    explorer: "https://bscscan.com/address/",
    color: "bg-yellow-400",
    icon: "🟡",
  },
  tron: {
    name: "Tron Network",
    symbol: "TRX",
    explorer: "https://tronscan.org/#/address/",
    color: "bg-red-500",
    icon: "🔴",
  },
};

export default function WalletButton() {
  const { address, balance, isConnected, isConnecting, error, network, connect, disconnect, switchNetwork } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showNetworkSelect, setShowNetworkSelect] = useState(false);

  const networkInfo = NETWORK_INFO[network];

  const shortenAddress = (addr: string) => {
    if (network === "tron") {
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (address) {
      window.open(`${networkInfo.explorer}${address}`, "_blank");
    }
  };

  if (!isConnected) {
    return (
      <div className="relative">
        {showNetworkSelect ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { connect("tron"); setShowNetworkSelect(false); }}
              disabled={isConnecting}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-xs px-3 py-2 rounded-lg shadow-lg shadow-red-500/20 transition-all duration-200"
            >
              {isConnecting && network === "tron" ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <span className="ml-1">🔴</span>
              )}
              TronLink
            </Button>
            <Button
              onClick={() => { connect("bsc"); setShowNetworkSelect(false); }}
              disabled={isConnecting}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold text-xs px-3 py-2 rounded-lg shadow-lg shadow-yellow-500/20 transition-all duration-200"
            >
              {isConnecting && network === "bsc" ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <span className="ml-1">🟡</span>
              )}
              MetaMask
            </Button>
            <Button
              onClick={() => setShowNetworkSelect(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowNetworkSelect(true)}
            disabled={isConnecting}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-sm px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition-all duration-200"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الاتصال...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 ml-2" />
                ربط المحفظة
              </>
            )}
          </Button>
        )}
        {error && (
          <div className="absolute top-full mt-2 left-0 right-0 min-w-[250px] bg-red-900/90 border border-red-700 text-red-200 text-xs p-2 rounded-lg z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-medium text-sm px-3 py-2 rounded-lg transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${networkInfo.color} animate-pulse`} />
            <span className="hidden sm:inline">{shortenAddress(address!)}</span>
            <span className="sm:hidden">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#1F2937] border-[#374151] text-white min-w-[220px]"
      >
        {/* Network */}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 mb-1">الشبكة</p>
          <div className="flex items-center gap-2">
            <span>{networkInfo.icon}</span>
            <p className="text-sm text-white">{networkInfo.name}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-[#374151]" />

        {/* Address */}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 mb-1">العنوان</p>
          <p className="text-sm font-mono text-white">{shortenAddress(address!)}</p>
        </div>
        <DropdownMenuSeparator className="bg-[#374151]" />

        {/* Balance */}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 mb-1">الرصيد</p>
          <p className="text-sm font-semibold text-amber-400">
            {balance || "0.0000"} {networkInfo.symbol}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-[#374151]" />

        {/* Switch Network */}
        <DropdownMenuItem
          onClick={() => {
            const newNetwork: NetworkType = network === "tron" ? "bsc" : "tron";
            switchNetwork(newNetwork);
            disconnect();
          }}
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
        >
          <span>{network === "tron" ? "🟡" : "🔴"}</span>
          التبديل إلى {network === "tron" ? "BSC (MetaMask)" : "Tron (TronLink)"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#374151]" />

        {/* Actions */}
        <DropdownMenuItem
          onClick={copyAddress}
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          {copied ? "تم النسخ!" : "نسخ العنوان"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openExplorer}
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          عرض في {network === "tron" ? "TronScan" : "BSCScan"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#374151]" />
        <DropdownMenuItem
          onClick={disconnect}
          className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          قطع الاتصال
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}