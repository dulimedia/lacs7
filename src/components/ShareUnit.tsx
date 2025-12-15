import React, { useState } from 'react';
import { X, Send, Share2, CheckCircle } from 'lucide-react';
import { detectDevice } from '../utils/deviceDetection';
import { useCsvUnitData } from '../hooks/useCsvUnitData';
import { assetUrl } from '../lib/assets';

interface ShareUnitProps {
  isOpen: boolean;
  onClose: () => void;
  unitKey: string;
  unitName: string;
}

export const ShareUnit: React.FC<ShareUnitProps> = ({
  isOpen,
  onClose,
  unitKey,
  unitName
}) => {
  // Get unit data from Google Sheets
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/1sDmF1HJk0qYTjLxTCg0dunv9rXmat_KWLitG8tUlMwI/export?format=csv';
  const { data: csvUnitData } = useCsvUnitData(CSV_URL);
  const unitData = csvUnitData[unitKey.toLowerCase()];

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isMobile = detectDevice().isMobile;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Generate deep link
  const generateDeepLink = () => {
    return `https://lacenterstudios.com/office-space/?sel=${unitName}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Load EmailJS if not already loaded
      if (!window.emailjs) {
        console.log('📦 Loading EmailJS library...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            console.log('✅ EmailJS script loaded successfully');
            resolve();
          };
          script.onerror = (error) => {
            console.error('❌ Failed to load EmailJS script:', error);
            reject(error);
          };
          setTimeout(() => {
            console.error('⏰ EmailJS script load timeout');
            reject(new Error('Script load timeout'));
          }, 10000);
        });

        // Initialize EmailJS
        console.log('🔧 Initializing EmailJS...');
        window.emailjs.init('7v5wJOSuv1p_PkcU5');
        console.log('✅ EmailJS initialized');
      }

      const deepLink = generateDeepLink();
      const primaryEmail = unitData?.contact_email_id || 'lacenterstudios3d@gmail.com';
      
      // Prepare email content with unit details
      const unitInfo = `
Unit: ${unitName}
Size: ${unitData?.size || 'N/A'}
Building: ${unitData?.building || 'N/A'}
Floor: ${unitData?.floor || 'N/A'}
Type: ${unitData?.unit_type || 'N/A'}
${unitData?.private_offices ? `Private Offices: ${unitData.private_offices}` : ''}
${unitData?.amenities ? `Amenities: ${unitData.amenities}` : ''}
${unitData?.has_kitchen ? 'Kitchen: Yes' : 'Kitchen: No'}

View this unit in 3D: ${deepLink}
      `.trim();

      // Prepare template parameters
      const templateParams = {
        from_name: 'LA Center Studios',
        from_email: primaryEmail,
        to_email: email,
        subject: `Unit Information: ${unitName}`,
        message: `Here's the information for ${unitName} at LA Center Studios:\n\n${unitInfo}`,
        unit_name: unitName,
        deep_link: deepLink,
        floorplan_url: unitData?.floorplan_url ? `https://lacscampus26.vercel.app${unitData.floorplan_url}` : '',
        unit_details: unitInfo,
        reply_to: primaryEmail
      };

      console.log('📧 Sending share email with:', templateParams);

      // Send email using EmailJS
      await window.emailjs.send(
        'service_q47lbr7', // Service ID
        'template_0zeil8m', // Template ID  
        templateParams
      );

      console.log('✅ Share email sent successfully!');
      setIsSubmitted(true);

      // Reset form after delay
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('❌ Share email failed:', error);
      setError('Failed to send email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    const deepLink = generateDeepLink();
    navigator.clipboard.writeText(deepLink).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Share Unit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h4>
            <p className="text-gray-600">
              Unit information and deep link have been sent to {email}
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium text-gray-900">{unitName}</h4>
              {unitData && (
                <div className="text-sm text-gray-600 mt-1">
                  <p>{unitData.size} • {unitData.building}</p>
                  {unitData.private_offices && unitData.private_offices > 0 && (
                    <p>{unitData.private_offices} Private Offices</p>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-base' : 'text-sm'}`}
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs mt-1">{error}</p>
                )}
              </div>

              <div className="text-xs text-gray-500">
                <p>This will send:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Unit details and specifications</li>
                  <li>• Direct link to view in 3D</li>
                  <li>• Floorplan information</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Sending...' : 'Send Email'}</span>
                </button>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`flex items-center justify-center space-x-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  <Share2 size={16} />
                  <span>Copy Link</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};