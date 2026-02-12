
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const AnalyticsMap = ({ events }) => {
    const defaultCenter = [17.3850, 78.4867];
    let center = defaultCenter;
    if (events.length > 0 && events[0].latitude && events[0].longitude) {
        center = [events[0].latitude, events[0].longitude];
    }

    const getColor = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'HIGH': return '#ff4d4d'; // Red
            case 'MEDIUM': return '#ffa500'; // Orange
            case 'LOW': return '#4dff4d'; // Green
            default: return '#cccccc';
        }
    };

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {events.map((event, idx) => (
                    event.latitude && event.longitude && (
                        <CircleMarker
                            key={idx}
                            center={[event.latitude, event.longitude]}
                            radius={8}
                            fillColor={getColor(event.severity)}
                            color="#fff"
                            weight={2}
                            opacity={1}
                            fillOpacity={0.8}
                        >
                            <Popup>
                                <strong>Date:</strong> {new Date(event.timestamp).toLocaleString()}<br />
                                <strong>Severity:</strong> {event.severity}<br />
                                <strong>Confidence:</strong> {(event.confidence * 100).toFixed(1)}%<br />
                                <a href={event.location_url} target="_blank" rel="noreferrer">View on Google Maps</a>
                            </Popup>
                        </CircleMarker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

export default AnalyticsMap;
