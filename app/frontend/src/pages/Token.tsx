import { useState } from "react";
import Header from "@/components/Header";
import { ArrowDownUp, Settings, ChevronDown, Copy, Check, ExternalLink, Shield, Zap, Globe, Code2 } from "lucide-react";

const tokens = [
  { symbol: "TRX", name: "Tron", icon: "🔴" },
  { symbol: "USDT", name: "Tether (TRC-20)", icon: "🟢" },
  { symbol: "USDD", name: "USDD Stablecoin", icon: "🔵" },
  { symbol: "TTB", name: "TTB Token", icon: "🪙" },
];

const tokenomicsData = [
  { label: "البيع العام", percentage: 40, color: "#f59e0b" },
  { label: "مجمع السيولة", percentage: 25, color: "#6366f1" },
  { label: "الفريق والمستشارون", percentage: 15, color: "#10b981" },
  { label: "التسويق", percentage: 10, color: "#ec4899" },
  { label: "التطوير", percentage: 7, color: "#8b5cf6" },
  { label: "الاحتياطي", percentage: 3, color: "#06b6d4" },
];

const solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TTBToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    address public marketingWallet;
    address public developmentWallet;
    
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public automatedMarketMakerPairs;

    // Deployed on Tron Network (TRC-20)
    // Compatible with TronLink wallet

    constructor(
        address _marketingWallet,
        address _developmentWallet
    ) ERC20("TTB Token", "TTB") Ownable(msg.sender) {
        marketingWallet = _marketingWallet;
        developmentWallet = _developmentWallet;
        
        _mint(msg.sender, MAX_SUPPLY);
    }

    function setAutomatedMarketMakerPair(
        address pair, bool value
    ) external onlyOwner {
        automatedMarketMakerPairs[pair] = value;
    }

    function _update(
        address from, address to, uint256 amount
    ) internal override {
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted");
        super._update(from, to, amount);
    }

    receive() external payable {}
}`;

export default function Token() {
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[3]); // TTB
  const [fromAmount, setFromAmount] = useState("");

  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const toAmount = fromAmount ? (parseFloat(fromAmount) * 1250).toFixed(2) : "";
  const contractAddress = "TXYZabcdef1234567890ABCDEF12345678";

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(solidityCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(contractAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  // Pie chart calculations
  const total = tokenomicsData.reduce((sum, item) => sum + item.percentage, 0);
  let cumulativePercentage = 0;
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };
  const slices = tokenomicsData.map((item) => {
    const startPercent = cumulativePercentage / total;
    cumulativePercentage += item.percentage;
    const endPercent = cumulativePercentage / total;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = item.percentage / total > 0.5 ? 1 : 0;
    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(" ");
    return { ...item, pathData };
  });

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-8 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://mgx-backend-cdn.metadl.com/generate/images/944362/2026-05-12/omfwjtaaagqq/hero-banner-crypto-swap.png"
            alt="Crypto Background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1C]/60 via-[#0A0F1C]/80 to-[#0A0F1C]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full mb-6">
            <span className="text-sm text-red-400 font-medium">🚀 متوفر على شبكة Tron</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-red-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
              تبديل العملات الرقمية
            </span>
            <br />
            <span className="text-white text-2xl md:text-3xl lg:text-4xl mt-2 block">
              على شبكة Tron مع TronLink
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            تداول عملات TRC-20 فوراً على شبكة Tron برسوم منخفضة وسرعة عالية مع محفظة TronLink
          </p>
        </div>
      </section>

      {/* Swap Interface */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-[#1F2937]/80 backdrop-blur-xl rounded-2xl border border-[#374151] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">تبديل</h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
            </div>



            {/* From Token */}
            <div className="bg-[#0A0F1C] rounded-xl p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">من</span>
                <span className="text-sm text-gray-500">الرصيد: 2.45</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-gray-600 text-left"
                  dir="ltr"
                />
                <div className="relative">
                  <button
                    onClick={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1F2937] rounded-xl hover:bg-[#374151] transition-colors"
                  >
                    <span className="text-lg">{fromToken.icon}</span>
                    <span className="font-semibold text-white">{fromToken.symbol}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showFromDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden z-10">
                      {tokens.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setFromToken(token); setShowFromDropdown(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#374151] transition-colors"
                        >
                          <span>{token.icon}</span>
                          <span className="text-white font-medium">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="p-3 bg-[#1F2937] border border-[#374151] rounded-xl hover:bg-[#374151] hover:border-amber-500/50 transition-all duration-300 hover:rotate-180"
              >
                <ArrowDownUp className="w-5 h-5 text-amber-400" />
              </button>
            </div>

            {/* To Token */}
            <div className="bg-[#0A0F1C] rounded-xl p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">إلى</span>
                <span className="text-sm text-gray-500">الرصيد: 15,000</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                  className="flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-gray-600 text-left"
                  dir="ltr"
                />
                <div className="relative">
                  <button
                    onClick={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); }}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1F2937] rounded-xl hover:bg-[#374151] transition-colors"
                  >
                    <span className="text-lg">{toToken.icon}</span>
                    <span className="font-semibold text-white">{toToken.symbol}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showToDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden z-10">
                      {tokens.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setToToken(token); setShowToDropdown(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#374151] transition-colors"
                        >
                          <span>{token.icon}</span>
                          <span className="text-white font-medium">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Info */}
            {fromAmount && (
              <div className="mt-4 p-3 bg-[#0A0F1C]/50 rounded-xl border border-[#374151]">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">السعر</span>
                  <span className="text-white" dir="ltr">1 {fromToken.symbol} = 1,250 {toToken.symbol}</span>
                </div>

              </div>
            )}

            {/* Swap Action Button */}
            <button className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl font-bold text-black text-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 active:scale-[0.98]">
              تبديل العملات
            </button>
          </div>
        </div>
      </section>

      {/* Token Info Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              معلومات <span className="text-amber-400">العملة</span>
            </h2>
            <p className="text-gray-400">
              عملة TRC-20 على شبكة Tron مع عقد ذكي موثق - متوافقة مع TronLink
            </p>
          </div>

          {/* Contract Address */}
          <div className="bg-[#1F2937]/60 backdrop-blur-xl rounded-2xl border border-[#374151] p-6 mb-8">
            <p className="text-sm text-gray-400 mb-2">عنوان العقد الذكي</p>
            <div className="flex items-center gap-3 flex-wrap">
              <code className="text-amber-400 font-mono text-sm break-all" dir="ltr">
                {contractAddress}
              </code>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                {addressCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span className="text-sm text-amber-400">{addressCopied ? "تم النسخ!" : "نسخ"}</span>
              </button>
              <a
                href={`https://tronscan.org/#/contract/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">TronScan</span>
              </a>
            </div>
          </div>

          {/* Token Details Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { label: "اسم العملة", value: "TTB Token" },
              { label: "الرمز", value: "TTB" },
              { label: "الشبكة", value: "Tron Network (TRC-20)" },
              { label: "الكسور العشرية", value: "18" },
              { label: "إجمالي العرض", value: "1,000,000,000 TTB" },
              { label: "الحد الأقصى", value: "1,000,000,000 TTB" },
            ].map((detail) => (
              <div
                key={detail.label}
                className="bg-[#1F2937]/40 rounded-xl border border-[#374151] p-4 hover:border-amber-500/30 transition-colors"
              >
                <p className="text-sm text-gray-400 mb-1">{detail.label}</p>
                <p className="text-white font-semibold">{detail.value}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "عقد موثق", desc: "مفتوح المصدر ومدقق" },
              { icon: Zap, title: "رسوم منخفضة", desc: "كفاءة شبكة Tron" },
              { icon: Globe, title: "لامركزي", desc: "حوكمة مجتمعية" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-[#1F2937]/40 rounded-xl border border-[#374151] p-6 text-center hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-amber-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Contract Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              العقد <span className="text-amber-400">الذكي</span>
            </h2>
            <p className="text-gray-400">
              كود العقد الذكي TRC-20 بلغة Solidity - مفتوح المصدر وموثق على شبكة Tron
            </p>
          </div>

          <div className="bg-[#1F2937]/60 backdrop-blur-xl rounded-2xl border border-[#374151] overflow-hidden">
            {/* Code Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151] bg-[#0A0F1C]/50">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-semibold" dir="ltr">TTBToken.sol</span>
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  Solidity ^0.8.19
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all duration-300"
              >
                {codeCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-400">نسخ الكود</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Block */}
            <div className="p-6 overflow-x-auto max-h-[400px] overflow-y-auto" dir="ltr">
              <pre className="text-sm font-mono leading-relaxed">
                <code className="text-gray-300">
                  {solidityCode.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                      <span className="inline-block w-8 text-right mr-4 text-gray-600 select-none text-xs">
                        {i + 1}
                      </span>
                      <span
                        className={
                          line.trim().startsWith("//")
                            ? "text-emerald-400/70"
                            : line.includes("function") || line.includes("contract")
                            ? "text-indigo-300"
                            : line.includes("require") || line.includes("emit")
                            ? "text-amber-300"
                            : "text-gray-300"
                        }
                      >
                        {line || " "}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              <span className="text-amber-400">توزيع العملة</span>
            </h2>
            <p className="text-gray-400">
              إجمالي العرض: 1,000,000,000 TTB — توزيع عادل للنمو المستدام
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Pie Chart */}
            <div className="flex justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full transform -rotate-90">
                  {slices.map((slice, index) => (
                    <path
                      key={index}
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="#0A0F1C"
                      strokeWidth="0.02"
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                  <circle cx="0" cy="0" r="0.55" fill="#0A0F1C" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">1B</p>
                    <p className="text-sm text-gray-400">إجمالي العرض</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend & Bars */}
            <div className="space-y-4">
              {tokenomicsData.map((item) => (
                <div key={item.label} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-white font-medium">{item.label}</span>
                    </div>
                    <span className="text-gray-400 font-semibold">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-[#0A0F1C] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 group-hover:opacity-80"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1" dir="ltr">
                    {((item.percentage / 100) * 1000000000).toLocaleString()} TTB
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#374151]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            © 2026 TTB Token. جميع الحقوق محفوظة. مبني على شبكة Tron مع TronLink.
          </p>
        </div>
      </footer>
    </div>
  );
}