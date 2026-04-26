import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icons
const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export default function MapView({ lat, lng, label, height = 240 }: { lat: number; lng: number; label?: string; height?: number }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.functions.invoke("mapbox-token").then(({ data }) => setToken((data as any)?.token ?? ""));
  }, []);
  const tileUrl = token
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attr = token ? '© Mapbox © OpenStreetMap' : '© OpenStreetMap';
  return (
    <div className="rounded-xl overflow-hidden border" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer url={tileUrl} attribution={attr} tileSize={token ? 512 : 256} zoomOffset={token ? -1 : 0} />
        <Marker position={[lat, lng]} icon={icon}><Popup>{label ?? "Location"}</Popup></Marker>
      </MapContainer>
    </div>
  );
}