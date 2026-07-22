/**
 * utils/geolocation.js
 * ---------------------
 * Shared helper to detect the user's current location using the
 * browser Geolocation API + Nominatim reverse geocoding (free, no key).
 *
 * Returns: { lat, lng, line1, line2, city, state, pincode }
 */
export async function detectLocation() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser");
  }

  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });

  const { latitude, longitude } = pos.coords;

  const resp = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
    { headers: { "Accept-Language": "en" } }
  );

  if (!resp.ok) throw new Error("Reverse geocoding failed");

  const data = await resp.json();
  const addr = data.address || {};

  const line1 = [addr.house_number, addr.road, addr.neighbourhood]
    .filter(Boolean)
    .join(", ") || data.display_name?.split(",")[0] || "";

  const line2 = [addr.suburb, addr.quarter].filter(Boolean).join(", ") || "";
  const city = addr.city || addr.town || addr.village || addr.county || "";
  const state = addr.state || "";
  const pincode = addr.postcode || "";

  return { lat: latitude, lng: longitude, line1, line2, city, state, pincode };
}
