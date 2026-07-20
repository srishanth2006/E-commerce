/**
 * pages/ReferralPage.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Gift, Copy, CheckCircle, Users, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";

import Loader from "../components/Loader";
import { generateReferral, getMyReferral, applyReferral } from "../api/endpoints";

export default function ReferralPage() {
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyReferral();
      setReferral(res.data ?? null);
    } catch {
      setReferral(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateReferral();
      setReferral(res.data);
      toast.success("Referral code generated!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate referral code");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (referral?.code) {
      navigator.clipboard.writeText(referral.code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      await applyReferral(applyCode.trim());
      toast.success("Referral code applied! You've earned bonus points.");
      setApplyCode("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid referral code");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <Loader label="Loading referral info..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gift size={22} /> Referral Program</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Share your code with friends and earn rewards!</p>
      </div>

      <div className="card p-6 space-y-4">
        {referral ? (
          <>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Your Referral Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-wider text-primary-600 dark:text-primary-400">
                  {referral.code}
                </span>
                <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                  {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <Users size={24} className="mx-auto mb-2 text-primary-500" />
                <p className="text-2xl font-bold">{referral.times_used ?? referral.used_count ?? 0}</p>
                <p className="text-xs text-gray-500">Times Used</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <IndianRupee size={24} className="mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{referral.points_earned ?? referral.rewards ?? 0}</p>
                <p className="text-xs text-gray-500">Points Earned</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Gift size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">You don't have a referral code yet.</p>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary">
              {generating ? "Generating..." : "Generate My Code"}
            </button>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold">Have a referral code?</h2>
        <form onSubmit={handleApply} className="flex gap-2">
          <input
            className="input flex-1 uppercase font-mono"
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value)}
            placeholder="Enter referral code"
          />
          <button type="submit" disabled={applying || !applyCode.trim()} className="btn-primary whitespace-nowrap">
            {applying ? "Applying..." : "Apply"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-bold mb-3">How it works</h2>
        <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">1</span>
            <span>Share your unique referral code with friends and family.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">2</span>
            <span>When they apply your code during checkout, they get a special discount.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">3</span>
            <span>You earn reward points for every successful referral that can be used on future orders.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
