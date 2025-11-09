import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [propertyError, setPropertyError] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', message: '' });
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState(null);

  useEffect(() => {
    fetchProperty();
  }, [id, fetchProperty]);

  const fetchProperty = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/properties/${id}`);
      setProperty(response.data);
      setPropertyError(null);
    } catch (err) {
      console.error('Error fetching property:', err);
      setPropertyError('Failed to load property details. Please try again later.');
    }
  }, [id]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquiryLoading(true);
    setInquiryError(null);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/inquiries`, {
        propertyId: id,
        ...inquiryForm
      });
      alert('Inquiry sent successfully!');
      setShowInquiryForm(false);
      setInquiryForm({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Error sending inquiry:', err);
      setInquiryError('Failed to send inquiry. Please try again.');
    } finally {
      setInquiryLoading(false);
    }
  };

  if (propertyError) return <div className="text-center py-8 text-red-600">{propertyError}</div>;
  if (!property) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{property.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <img
                  src={property.photoUrl}
                  alt={property.Photos}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Price</h3>
                  <p className="text-2xl font-bold text-blue-600">₹{property.price.toLocaleString()}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Location</h3>
                  <p>{property.locationName}, Mumbai</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Specifications</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Carpet Area: {property.carpetArea} sqft</li>
                    <li>Covered Area: {property.coveredArea} sqft</li>
                    <li>Bedrooms: {property.bedrooms}</li>
                    <li>Bathrooms: {property.bathrooms}</li>
                    <li>Furnishing: {property.furnishingType}</li>
                    <li>Floor: {property.floor}</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, index) => (
                      <span key={index} className="bg-gray-200 px-3 py-1 rounded-full text-sm">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Developer</h3>
                  <p>{property.developer}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Society</h3>
                  <p>{property.society}</p>
                </div>
                
                <div className="flex space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${property.powerBackup ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    Power Backup: {property.powerBackup ? 'Yes' : 'No'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${property.parking ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    Parking: {property.parking ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Contact for Inquiry</h3>
                {!showInquiryForm ? (
                  <button
                    onClick={() => setShowInquiryForm(true)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Send Inquiry
                  </button>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={inquiryForm.name}
                        onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Your Email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({...inquiryForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Your Message"
                        value={inquiryForm.message}
                        onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="4"
                        required
                      />
                    </div>
                    {inquiryError && <p className="text-red-600 text-sm">{inquiryError}</p>}
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={inquiryLoading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {inquiryLoading ? 'Sending...' : 'Send'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInquiryForm(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
