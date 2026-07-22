/**
 * pages/CustomerProfile.jsx
 * ----------------------------
 * MODULE 3 - customer self-service profile + saved addresses.
 */
import { useEffect, useState } from "react";
import { User, MapPin, Plus, Trash2, Award, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getMyProfile, updateMyProfile, getMyAddresses, addMyAddress, deleteMyAddress } from "../api/endpoints";
import { detectLocation } from "../utils/geolocation";

export default function CustomerProfile() {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "" });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = async () => {
    const [pRes, aRes] = await Promise.allSettled([getMyProfile(), getMyAddresses()]);
    if (pRes.status === "fulfilled") {
      setProfile(pRes.value.data);
      setForm({ name: pRes.value.data.name, phone: pRes.value.data.phone || "", address: pRes.value.data.address || "" });
    }
    if (aRes.status === "fulfilled") setAddresses(aRes.value.data ?? []);
  };

  useEffect(() => {
    load().catch(() => toast.error("Failed to load profile"));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateMyProfile(form);
      toast.success("Profile updated");
      load();
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.line1) {
      toast.error("Address line 1 is required");
      return;
    }
    try {
      await addMyAddress(newAddress);
      toast.success("Address added");
      setNewAddress({ label: "Home", line1: "", city: "", state: "", pincode: "" });
      setShowAddressForm(false);
      load();
    } catch {
      toast.error("Failed to add address");
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteMyAddress(id);
    } catch { toast.error("Failed to delete address"); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    detectLocation()
      .then((loc) => {
        setNewAddress((prev) => ({
          ...prev,
          line1: loc.line1,
          city: loc.city,
          state: loc.state,
          pincode: loc.pincode,
        }));
        setShowAddressForm(true);
        toast.success("Location detected! Review and save your address.");
      })
      .catch(() => {
        toast("Could not detect location. Enter it manually.");
      })
      .finally(() => setLocating(false));
  };

  if (!profile) return <p className="text-center text-gray-400 py-10">Loading profile...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2"><User size={20} /> My Profile</h1>

      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl font-bold">
          {profile.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{profile.name}</p>
          <p className="text-sm text-gray-400">{profile.email}</p>
          <p className="text-xs text-primary-600 flex items-center gap-1 mt-1">
            <Award size={12} /> {profile.loyalty_points} loyalty points
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="card space-y-4">
        <h2 className="font-semibold text-sm">Edit details</h2>
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Address (quick note)</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">Save changes</button>
      </form>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-1.5"><MapPin size={14} /> Saved Addresses</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleDetectLocation} disabled={locating} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              {locating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              {locating ? "Detecting..." : "Detect Location"}
            </button>
            <button onClick={() => setShowAddressForm((v) => !v)} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-sm">
            <div>
              <p className="font-medium">{a.label}{a.is_default && <span className="text-xs text-primary-600 ml-2">(default)</span>}</p>
              <p className="text-gray-500 dark:text-gray-400">{a.line1}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""} {a.pincode}</p>
            </div>
            <button onClick={() => handleDeleteAddress(a.id)} className="text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}

        {showAddressForm && (
          <form onSubmit={handleAddAddress} className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Label (Home/Work)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
              <input className="input" placeholder="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} />
            </div>
            <input className="input" placeholder="Address line 1" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
              <input className="input" placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
            </div>
            <button type="submit" className="btn-secondary text-xs">Save address</button>
          </form>
        )}
      </div>
    </div>
  );
}
