import React, { useCallback, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { AvailBadge, ScoreRing } from '../ui/UIKit';
import { RiMapPinLine, RiTimeLine, RiMoneyDollarCircleLine } from 'react-icons/ri';

// ── Dark map style — matches Park Naija's industrial aesthetic ──
const DARK_STYLE = [
  { elementType: 'geometry',                       stylers: [{ color: '#111111' }] },
  { elementType: 'labels.text.stroke',             stylers: [{ color: '#111111' }] },
  { elementType: 'labels.text.fill',               stylers: [{ color: '#555555' }] },
  { featureType: 'administrative',                 elementType: 'geometry', stylers: [{ color: '#222222' }] },
  { featureType: 'administrative.country',         elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.locality',        elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi',                            elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park',                       elementType: 'geometry',         stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park',                       elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road',                           elementType: 'geometry',         stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road',                           elementType: 'geometry.stroke',  stylers: [{ color: '#212121' }] },
  { featureType: 'road',                           elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.highway',                   elementType: 'geometry',         stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.highway',                   elementType: 'geometry.stroke',  stylers: [{ color: '#1c1c1c' }] },
  { featureType: 'road.highway',                   elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit',                        elementType: 'geometry',         stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station',                elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water',                          elementType: 'geometry',         stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'water',                          elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
  { featureType: 'water',                          elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

// City default centers
export const CITY_CENTERS = {
  lagos:         { lat: 6.5244,  lng: 3.3792,  zoom: 13 },
  port_harcourt: { lat: 4.8156,  lng: 7.0498,  zoom: 13 },
  abuja:         { lat: 9.0765,  lng: 7.3986,  zoom: 13 },
};

const MAP_OPTIONS = {
  styles: DARK_STYLE,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

const LIBRARIES = ['places'];

// ── Score-colored SVG marker ──────────────────────────────────
function makeMarkerIcon(score, isSelected = false) {
  const color = score >= 70 ? '#4ade80' : score >= 45 ? '#fbbf24' : '#f87171';
  const size = isSelected ? 48 : 38;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="#0a0a0a" stroke="${color}" stroke-width="${isSelected ? 3 : 2}"/>
        <text x="24" y="29" text-anchor="middle" font-family="sans-serif"
              font-weight="800" font-size="${isSelected ? 13 : 11}" fill="${color}">${score}</text>
      </svg>
    `)}`,
    scaledSize: { width: size, height: size },
    anchor: { x: size / 2, y: size / 2 },
  };
}

// ── Main Map Component ────────────────────────────────────────
export default function ParkingMap({ spaces = [], city = 'port_harcourt', userLocation, onSpaceSelect, selectedId }) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const mapRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const center = CITY_CENTERS[city] || CITY_CENTERS.port_harcourt;

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    // Fit bounds to all markers if we have spaces
    if (spaces.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      spaces.forEach(s => {
        if (s.latitude && s.longitude) bounds.extend({ lat: s.latitude, lng: s.longitude });
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 80);
    }
  }, [spaces]);

  if (loadError) return <MapError message="Map failed to load. Check your Google Maps API key." />;
  if (!isLoaded)  return <MapSkeleton />;
  if (!apiKey)    return <MapError message="Add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file to enable the map." />;

  const activeSpace = spaces.find(s => s.id === activeId);

  return (
    <div style={styles.wrap}>
      <GoogleMap
        mapContainerStyle={styles.map}
        center={center}
        zoom={center.zoom}
        options={MAP_OPTIONS}
        onLoad={onLoad}
        onClick={() => setActiveId(null)}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="#b8f225" opacity="0.3"/>
                  <circle cx="10" cy="10" r="4" fill="#b8f225"/>
                </svg>
              `)}`,
              scaledSize: { width: 20, height: 20 },
              anchor: { x: 10, y: 10 },
            }}
            title="Your location"
          />
        )}

        {/* Parking space markers */}
        {spaces.filter(s => s.latitude && s.longitude).map(space => (
          <Marker
            key={space.id}
            position={{ lat: Number(space.latitude), lng: Number(space.longitude) }}
            icon={makeMarkerIcon(space.parking_score || 50, selectedId === space.id || activeId === space.id)}
            onClick={() => {
              setActiveId(space.id);
              if (onSpaceSelect) onSpaceSelect(space);
            }}
            zIndex={selectedId === space.id ? 100 : 1}
          />
        ))}

        {/* InfoWindow on click */}
        {activeId && activeSpace && activeSpace.latitude && (
          <InfoWindow
            position={{ lat: Number(activeSpace.latitude), lng: Number(activeSpace.longitude) }}
            onCloseClick={() => setActiveId(null)}
            options={{ pixelOffset: { width: 0, height: -20 } }}
          >
            <SpacePopup space={activeSpace} />
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Floating legend */}
      <div style={styles.legend}>
        <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#4ade80' }} />High (70+)</span>
        <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#fbbf24' }} />Medium</span>
        <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#f87171' }} />Low</span>
      </div>
    </div>
  );
}

// ── InfoWindow popup content ──────────────────────────────────
function SpacePopup({ space }) {
  // InfoWindow renders in Google's iframe — inline styles only, no CSS vars
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#161616', borderRadius: 10,
      padding: '12px 14px', minWidth: 220, maxWidth: 280,
      border: '1px solid #2a2a2a',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#f0f0f0', marginBottom: 3 }}>
            {space.name}
          </p>
          <p style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>{space.address}</p>
        </div>
        <ScoreRing score={space.parking_score || 50} size={44} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        <InfoStat label="Price/hr" value={`₦${Number(space.price_per_hour).toLocaleString()}`} />
        <InfoStat label="Capacity" value={`${space.capacity} car${space.capacity !== 1 ? 's' : ''}`} />
        {space.distance_km && <InfoStat label="Distance" value={`${space.distance_km} km`} />}
        {space.availability && (
          <div>
            <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Availability</p>
            <AvailBadge level={space.availability} />
          </div>
        )}
      </div>

      {(space.features?.has_security || space.features?.is_verified) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {space.features?.is_verified  && <Chip label="✓ Verified" />}
          {space.features?.has_security && <Chip label="🛡️ Security" />}
          {space.features?.has_cctv     && <Chip label="📷 CCTV" />}
        </div>
      )}
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Chip({ label }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999,
      background: 'rgba(184,242,37,0.08)', border: '1px solid rgba(184,242,37,0.15)',
      fontSize: 10, color: '#b8f225',
    }}>
      {label}
    </span>
  );
}

// ── Loading states ─────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div style={{ ...styles.map, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto 12px' }} />
        <p style={{ color: '#555', fontSize: '0.8rem' }}>Loading map...</p>
      </div>
    </div>
  );
}

function MapError({ message }) {
  return (
    <div style={{
      ...styles.map, background: '#111',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid #2a2a2a', borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗺️</div>
        <p style={{ color: '#888', fontSize: '0.85rem', maxWidth: 300, lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}

const styles = {
  wrap: { position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  map: { width: '100%', height: '100%', minHeight: 400 },
  legend: {
    position: 'absolute', bottom: 16, left: 16,
    display: 'flex', gap: 12, alignItems: 'center',
    background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
    border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '6px 12px',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#888' },
  legendDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
};
