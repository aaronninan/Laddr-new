import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to update map view when property is selected
const MapController = ({ selectedProperty }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedProperty && selectedProperty.coordinates) {
      const { lat, lng } = selectedProperty.coordinates;
      map.setView([lat, lng], 15, { animate: true });
    }
  }, [selectedProperty, map]);
  
  return null;
};

// Component to capture initial map bounds and notify parent
const MapBoundsUpdater = ({ onBoundsChange }) => {
  const map = useMap();
  
  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    };
    
    // Get initial bounds
    updateBounds();
    
    // Update on move
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    
    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map, onBoundsChange]);
  
  return null;
};

const ExplorePage = () => {
  const [allProperties, setAllProperties] = useState([]);
  const [visibleProperties, setVisibleProperties] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState(null);
  const locationHook = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(locationHook.search);
  const search = params.get('search') || '';
  const debounceTimerRef = useRef(null);

  // Define filterVisibleProperties before using it in useEffect
  const filterVisibleProperties = useCallback(() => {
    if (!mapBounds) return;
    
    const bounds = mapBounds;
    const filtered = allProperties.filter(property => {
      if (!property.coordinates || !property.coordinates.lat || !property.coordinates.lng) {
        return false;
      }
      const lat = property.coordinates.lat;
      const lng = property.coordinates.lng;
      return bounds.contains([lat, lng]);
    });
    
    setVisibleProperties(filtered);
  }, [mapBounds, allProperties]);

  // Load all properties on mount
  const fetchAllProperties = async () => {
    try {
      const params = {};
      if (search) {
        params.search = search;
      }
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/properties`, { params });
      setAllProperties(response.data);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  useEffect(() => {
    fetchAllProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Filter properties based on visible bounds
  useEffect(() => {
    if (mapBounds && allProperties.length > 0) {
      filterVisibleProperties();
    } else if (!mapBounds && allProperties.length > 0) {
      // Show all properties initially until map is ready
      setVisibleProperties(allProperties);
    }
  }, [mapBounds, allProperties, filterVisibleProperties]);

  const handleBoundsChange = useCallback((bounds) => {
    // Debounce bounds updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setMapBounds(bounds);
    }, 200);
  }, []);

  const handleMarkerClick = (property) => {
    setSelectedProperty(property);
    setHighlightedPropertyId(property._id || property.id);
    // Scroll to property in list
    const element = document.getElementById(`property-${property._id || property.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePropertyCardClick = (property) => {
    setSelectedProperty(property);
    setHighlightedPropertyId(property._id || property.id);
    // The MapController will handle panning/zooming
    // After a short delay, scroll the list to show the selected property
    setTimeout(() => {
      const element = document.getElementById(`property-${property._id || property.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  const handleViewDetails = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Map */}
      <div className="w-2/3 relative">
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-4 w-80">
            <div className="relative">
              <form onSubmit={(e) => {
                e.preventDefault();
                const value = e.currentTarget.searchBox.value.trim();
                if (value.length === 0) {
                  navigate('/explore');
                } else {
                  navigate(`/explore?search=${encodeURIComponent(value)}`);
                }
              }}>
                <input
                  name="searchBox"
                  defaultValue={search}
                  type="text"
                  placeholder="Search for a city, area, location..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </form>
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <MapContainer
          center={[19.0760, 72.8777]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController selectedProperty={selectedProperty} />
          <MapBoundsUpdater onBoundsChange={handleBoundsChange} />
          {allProperties.map(property => {
            if (!property.coordinates || !property.coordinates.lat || !property.coordinates.lng) {
              return null;
            }
            return (
              <Marker
                key={property._id || property.id}
                position={[property.coordinates.lat, property.coordinates.lng]}
                eventHandlers={{
                  click: () => handleMarkerClick(property),
                }}
              >
                <Popup>
                  <div className="p-3 min-w-[200px]">
                    <h3 className="font-semibold text-base mb-1">
                      {property.projectName || property.title || 'Property'}
                    </h3>
                    <p className="text-xs text-gray-600 mb-1">
                      {property.areaName || property.locationName || 'Area'}
                      {property.locality && `, ${property.locality}`}
                    </p>
                    {property.landmark && (
                      <p className="text-xs text-gray-500 mb-2">Near {property.landmark}</p>
                    )}
                    {property.price && (
                      <p className="text-sm font-bold text-blue-600 mb-2">
                        ₹{property.price.toLocaleString()}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      {property.bedrooms && <span>{property.bedrooms} Beds</span>}
                      {property.bathrooms && <span>{property.bathrooms} Baths</span>}
                      {property.carpetArea && (
                        <span>{property.carpetArea} {property.carpetAreaUnit || 'sqft'}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewDetails(property._id || property.id)}
                      className="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
            <button className="block w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
              <span className="text-lg">+</span>
            </button>
            <button className="block w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
              <span className="text-lg">-</span>
            </button>
            <button className="block w-8 h-8 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Property List */}
      <div className="w-1/3 overflow-y-auto bg-white border-l border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Properties ({visibleProperties.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mapBounds ? 'Showing properties in current view' : 'Loading...'}
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {visibleProperties.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No properties found in this area.</p>
              <p className="text-sm mt-2">Try zooming out or panning to see more properties.</p>
            </div>
          ) : (
            visibleProperties.map((property) => {
              const propertyId = property._id || property.id;
              const isHighlighted = highlightedPropertyId === propertyId;
              
              return (
                <div
                  key={propertyId}
                  id={`property-${propertyId}`}
                  onClick={() => handlePropertyCardClick(property)}
                  className={`p-4 cursor-pointer transition-all ${
                    isHighlighted
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 flex-1">
                      {property.projectName || property.title || 'Property'}
                    </h3>
                    {property.price && (
                      <span className="text-lg font-bold text-blue-600 ml-2">
                        ₹{property.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-gray-600">
                      {property.areaName || property.locationName || 'Area'}
                      {property.locality && (
                        <span className="text-gray-500"> · {property.locality}</span>
                      )}
                    </p>
                    {property.landmark && (
                      <p className="text-xs text-gray-500">Near {property.landmark}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                    {property.bedrooms && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        {property.bedrooms} Beds
                      </span>
                    )}
                    {property.bathrooms && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h.01a1 1 0 100-2H5zm3 0a1 1 0 000 2h3a1 1 0 100-2H8z" clipRule="evenodd" />
                        </svg>
                        {property.bathrooms} Baths
                      </span>
                    )}
                    {property.carpetArea && (
                      <span>{property.carpetArea} {property.carpetAreaUnit || 'sqft'}</span>
                    )}
                  </div>
                  
                  {property.typeOfProperty && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {property.typeOfProperty}
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(propertyId);
                    }}
                    className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;