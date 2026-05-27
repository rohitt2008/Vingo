import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiDollarSign, FiAward, FiShare2, FiPlus, FiGrid, FiArrowUpRight, FiArrowDownLeft, FiRefreshCw } from "react-icons/fi";
import { useToast } from "../context/ToastContext";

function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  // Top Up Modal State
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${serverUrl}/api/wallet`, { withCredentials: true });
      setWallet(res.data?.data);
    } catch (err) {
      setError("Failed to fetch wallet and loyalty details.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    if (!topUpAmount || Number(topUpAmount) <= 0) return;
    setSubmittingTopUp(true);
    try {
      // 1. Initialize top up order in backend
      const res = await axios.post(
        `${serverUrl}/api/wallet/topup`,
        { amount: Number(topUpAmount) },
        { withCredentials: true }
      );
      
      const orderData = res.data?.data;
      
      // 2. Launch Razorpay Top-up flow
      launchRazorpayTopUp(orderData);
    } catch (err) {
      showToast("Failed to initialize wallet top-up.", "error");
    } finally {
      setSubmittingTopUp(false);
    }
  };

  const launchRazorpayTopUp = (order) => {
    const options = {
      key: "rzp_test_mockkey",
      amount: order.amount,
      currency: "INR",
      name: "Vingo Wallet Topup",
      description: "Add funds to your Vingo Pay Wallet",
      order_id: order.razorpayOrderId,
      handler: async (response) => {
        try {
          await axios.post(
            `${serverUrl}/api/wallet/confirm-topup`,
            {
              razorpayOrderId: response.razorpay_order_id || order.razorpayOrderId,
              razorpayPaymentId: response.razorpay_payment_id || `pay_wallet_${Math.random().toString(36).substring(2, 9)}`,
              razorpaySignature: response.razorpay_signature || "mock_signature",
              amount: order.amount,
            },
            { withCredentials: true }
          );
          showToast("Wallet credited successfully!", "success");
          setShowTopUp(false);
          setTopUpAmount("");
          fetchWalletDetails();
        } catch {
          showToast("Top up confirmation failed.", "error");
        }
      },
      theme: { color: "#ff4d2d" },
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      console.warn("Razorpay SDK not loaded. Simulating successful wallet topup...");
      setTimeout(() => {
        options.handler({
          razorpay_order_id: order.razorpayOrderId,
          razorpay_payment_id: `pay_wallet_${Math.random().toString(36).substring(2, 9)}`,
          razorpay_signature: "mock_signature",
        });
      }, 1500);
    }
  };

  // Helper colors
  const getPurposeLabel = (purpose) => {
    switch (purpose) {
      case "deposit": return "Top Up";
      case "order_payment": return "Order Paid";
      case "refund": return "Refund Cash";
      case "referral_bonus": return "Referral Reward";
      case "cashback": return "Cashback Offer";
      default: return "Transaction";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
        <Nav />
        <div className="w-full max-w-4xl px-4 pt-28 pb-12 flex flex-col gap-6 animate-pulse">
          <div className="h-44 bg-white rounded-3xl border border-[#ffe4dc]"></div>
          <div className="h-64 bg-white rounded-3xl border border-[#ffe4dc]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />

      <div className="w-full max-w-5xl px-4 md:px-6 pt-24 pb-12 flex flex-col gap-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-[#222]">Vingo Pay Cockpit</h1>
            <p className="text-gray-500 mt-1">Manage your wallet balance, check loyalty tiers and share referral links</p>
          </div>
          <button
            onClick={() => setShowTopUp(true)}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-[#ff4d2d] text-white text-sm font-extrabold hover:bg-[#e64323] transition-colors cursor-pointer shadow-lg shadow-[#ff4d2d]/20"
          >
            <FiPlus /> Add Funds
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wallet Balance Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Wallet Balance</p>
              <h2 className="text-3xl font-black text-gray-800 mt-1.5">₹{(wallet?.balance || 0) / 100}</h2>
              <p className="text-[10px] text-green-500 font-semibold mt-1">✓ Instant checkout ready</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#fff2ee] text-[#ff4d2d] flex items-center justify-center">
              <FiDollarSign size={24} />
            </div>
          </div>

          {/* Loyalty Info Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Loyalty Points & Tier</p>
              <h2 className="text-3xl font-black text-gray-800 mt-1.5 capitalize">{wallet?.loyaltyTier || "Bronze"}</h2>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{wallet?.loyaltyPoints || 0} active reward points</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#fff2ee] text-[#ff4d2d] flex items-center justify-center">
              <FiAward size={24} />
            </div>
          </div>

          {/* Referral Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Referral Program</p>
              <h2 className="text-xl font-extrabold text-gray-800 mt-2 uppercase tracking-widest">{wallet?.referralCode || "GETINGO"}</h2>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{wallet?.referralCount || 0} friends successfully referred</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(wallet?.referralCode || "GETINGO");
                showToast("Referral code copied to clipboard!", "success");
              }}
              className="w-12 h-12 rounded-2xl bg-[#fff2ee] text-[#ff4d2d] flex items-center justify-center hover:bg-[#ffe4dc] transition-colors cursor-pointer"
              title="Copy Referral Code"
            >
              <FiShare2 size={20} />
            </button>
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc]">
          <h3 className="font-extrabold text-lg text-gray-800 pb-4 border-b border-[#fff2ee] mb-4 flex items-center gap-2">
            <FiGrid className="text-[#ff4d2d]" /> Wallet Transaction History
          </h3>

          {wallet?.transactions?.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No transaction records found in your ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#fff2ee] text-gray-400 uppercase tracking-wide font-bold">
                    <th className="pb-3 font-semibold">Details</th>
                    <th className="pb-3 font-semibold">Purpose</th>
                    <th className="pb-3 font-semibold">Reference ID</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#fff2ee]">
                  {wallet?.transactions?.map((tx) => (
                    <tr key={tx._id} className="hover:bg-[#fff9f6]/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === "credit" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}>
                            {tx.type === "credit" ? <FiArrowUpRight size={16} /> : <FiArrowDownLeft size={16} />}
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">{getPurposeLabel(tx.purpose)}</p>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {new Date(tx.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-gray-500 font-medium capitalize">{tx.purpose.replace(/_/g, " ")}</td>
                      <td className="py-4 text-gray-400 font-mono text-[10px]">{tx.referenceId || "N/A"}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                          tx.status === "completed" 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-4 text-right font-extrabold text-sm ${
                        tx.type === "credit" ? "text-green-600" : "text-red-500"
                      }`}>
                        {tx.type === "credit" ? "+" : "-"}₹{Math.abs(tx.amount) / 100}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#ffe4dc]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-extrabold text-gray-800">Top Up Wallet</h3>
              <button onClick={() => setShowTopUp(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-gray-500">Enter the amount in INR to add to your Vingo Pay balance.</p>
              
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Top Up Amount (INR)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="10000"
                  placeholder="e.g. 500"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none bg-[#fff9f6] text-sm font-bold text-gray-800 focus:border-[#ff4d2d]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTopUp}
                className="mt-2 py-3.5 bg-[#ff4d2d] text-white rounded-xl text-xs font-bold hover:bg-[#e64323] cursor-pointer"
              >
                {submittingTopUp ? "Processing payment..." : "Continue to Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallet;
