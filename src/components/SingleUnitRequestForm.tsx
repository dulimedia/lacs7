import React, { useState, useMemo } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
import { detectDevice } from '../utils/deviceDetection';
import { useCsvUnitData } from '../hooks/useCsvUnitData';
import { assetUrl } from '../lib/assets';

interface SingleUnitRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  unitKey: string;
  unitName: string;
}

export const SingleUnitRequestForm: React.FC<SingleUnitRequestFormProps> = ({
  isOpen,
  onClose,
  unitKey,
  unitName
}) => {
  // Get unit data from Google Sheets
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/1sDmF1HJk0qYTjLxTCg0dunv9rXmat_KWLitG8tUlMwI/export?format=csv';
  const { data: csvUnitData } = useCsvUnitData(CSV_URL);
  const unitData = csvUnitData[unitKey.toLowerCase()];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Get contact emails from CSV or fallback to defaults
    const primaryEmail = unitData?.contact_email_id || 'lacenterstudios3d@gmail.com';
    const secondaryEmail = unitData?.secondary_email || 'dwyatt@lacenterstudios.com';

    try {
      console.log('🔄 Starting EmailJS send process for single unit...');

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

        // Initialize EmailJS with centralized config
        const { EMAILJS_CONFIG } = await import('../utils/emailjs.js');
        console.log('🔧 Initializing EmailJS with public key...');
        window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        console.log('✅ EmailJS initialized with key:', EMAILJS_CONFIG.PUBLIC_KEY);
      } else {
        console.log('✅ EmailJS already loaded and available');
      }

      // Prepare template parameters for primary email
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || 'Not provided',
        message: formData.message || 'No additional message',
        selected_units: `• ${unitName} (Single Unit Request)`,
        to_email: primaryEmail,
        reply_to: formData.email
      };

      console.log('📧 Attempting to send email to primary:', templateParams);

      // Send to primary email using centralized config
      const { EMAILJS_CONFIG } = await import('../utils/emailjs.js');
      await window.emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID, // Service ID
        EMAILJS_CONFIG.TEMPLATE_ID, // Template ID
        templateParams
      );

      console.log('✅ Primary email sent successfully!');

      // Send to secondary email (dwyatt@lacenterstudios.com)
      if (secondaryEmail && secondaryEmail !== primaryEmail) {
        const secondaryParams = {
          ...templateParams,
          to_email: secondaryEmail
        };

        console.log('📧 Attempting to send email to secondary:', secondaryParams);

        await window.emailjs.send(
          EMAILJS_CONFIG.SERVICE_ID, // Service ID
          EMAILJS_CONFIG.TEMPLATE_ID, // Template ID
          secondaryParams
        );

        console.log('✅ Secondary email sent successfully!');
      }

      console.log('✅ Email sent successfully via EmailJS!');

      setIsSubmitted(true);

      // Reset form after delay
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', phone: '', message: '' });
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('❌ Email sending failed:', error);

      if (error.text === 'The user ID is invalid') {
        alert('Configuration error: Invalid user ID. Please contact support.');
      } else {
        alert('Failed to submit request. Please try again or contact us directly.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Detect mobile for positioning
  const deviceCapabilities = useMemo(() => detectDevice(), []);
  const isMobile = deviceCapabilities.isMobile;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex z-50" style={{
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'center',
      paddingTop: isMobile ? '80px' : '0px'
    }}>
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-y-auto transition-all duration-500 ease-in-out transform ${isMobile ? 'max-h-[calc(100vh-100px)]' : 'max-h-[90vh]'
        } ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Request Suite</h2>
            <p className="text-sm text-gray-600 mt-1">Inquiring about: {unitName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-150"
            disabled={isSubmitting}
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-600">We'll get back to you soon about {unitName}.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="john@example.com"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="(555) 123-4567"
                  disabled={isSubmitting}
                />
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none ${errors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="Let us know when you need it, for how long, and any questions."
                  disabled={isSubmitting}
                />
                {errors.message && <p className="text-red-600 text-xs mt-1">{errors.message}</p>}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};