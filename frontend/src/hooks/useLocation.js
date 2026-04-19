import { useState, useEffect } from "react";
import * as Location from "expo-location";

export function useLocation() {
  const [location, setLocation]   = useState(null);
  const [address, setAddress]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  async function getLocation() {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied. You can type your location manually.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // Reverse geocode — get human-readable address
      const [place] = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const parts = [
          place.name,
          place.street,
          place.district || place.subregion,
          place.city,
          place.region,
          place.country,
        ].filter(Boolean);

        setAddress({
          name:    [place.name, place.street].filter(Boolean).join(", ") || "Current location",
          full:    parts.join(", "),
          city:    place.city || place.region || "",
          country: place.country || "",
          lat:     loc.coords.latitude,
          lng:     loc.coords.longitude,
        });
      }
    } catch (e) {
      setError("Could not get location. Type manually.");
    } finally {
      setLoading(false);
    }
  }

  return { location, address, loading, error, getLocation };
}
