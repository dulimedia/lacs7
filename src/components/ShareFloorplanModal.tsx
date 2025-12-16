import React, { useState } from 'react';
import { useExploreState } from '../store/exploreState';
import { X, Mail, Send } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

export function ShareFloorplanModal() {
    const { shareModalOpen, shareModalData, setShareModalOpen } = useExploreState();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    if (!shareModalOpen || !shareModalData) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        setSending(true);

        try {
            // Load EmailJS if needed (reusing logic from RequestTab)
            if (!window.emailjs) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                document.head.appendChild(script);
                await new Promise<void>((resolve, reject) => {
                    script.onload = () => {
                        window.emailjs?.init('7v5wJOSuv1p_PkcU5');
                        resolve();
                    };
                    script.onerror = reject;
                });
            }

            // Construct URLs
            const currentOrigin = window.location.origin;

            // 1. App Link: Use the configured share URL (Vercel app) or fallback to current origin
            // We strip any existing query params from the base to be safe
            const baseAppUrl = APP_CONFIG.shareBaseUrl || (currentOrigin + window.location.pathname);
            const shareUrl = `${baseAppUrl}${baseAppUrl.includes('?') ? '&' : '?'}unit=${shareModalData.unitKey}`;

            // 2. PDF Links: ALWAYS use Vercel deployment URL for PDFs (not local development server)
            const vercelOrigin = 'https://lacs7.vercel.app';
            const floorplanLink = shareModalData.floorplanUrl && !shareModalData.floorplanUrl.startsWith('http')
                ? `${vercelOrigin}${shareModalData.floorplanUrl.startsWith('/') ? '' : '/'}${shareModalData.floorplanUrl}`
                : shareModalData.floorplanUrl;

            const fullFloorLink = shareModalData.fullFloorUrl && !shareModalData.fullFloorUrl.startsWith('http')
                ? `${vercelOrigin}${shareModalData.fullFloorUrl.startsWith('/') ? '' : '/'}${shareModalData.fullFloorUrl}`
                : shareModalData.fullFloorUrl;

            // Note: This relies on the template accepting 'to_email' and 'message_html' or similar
            // We reuse the existing template but frame it for sharing
            const templateParams = {
                to_email: email,
                from_name: "LA Center Studios", // System sender
                from_email: "noreply@lacenterstudios.com",
                message: `Hello,

Thank you for your interest in ${shareModalData.unitName} at LA Center Studios.

Below are the requested materials to help you explore the space in detail:

🏢 3D Interactive Tour

Explore ${shareModalData.unitName} within our interactive campus experience:

👉 View ${shareModalData.unitName} in 3D
${shareUrl}

📋 Floor Plan

Download the full floor plan for ${shareModalData.unitName}:

👉 Download Floor Plan PDF
${floorplanLink || 'Floor plan coming soon'}

${fullFloorLink ? `📐 Full Building Layout\n\n👉 Download Full Floor PDF\n${fullFloorLink}\n\n` : ''}${message ? `Message:\n${message}\n\n` : ''}If you have any questions, would like to compare suites, or need assistance exploring additional spaces, our team is happy to help.

Best regards,
LA Center Studios
📧 lacenterstudios3d@gmail.com`,
                // These might be used by the template:
                selected_units: shareModalData.unitName,
                phone: '',
                reply_to: 'lacenterstudios3d@gmail.com'
            };

            await window.emailjs!.send(
                'service_q47lbr7',
                'template_0zeil8m',
                templateParams
            );

            alert(`Floorplan sent to ${email}!`);
            setShareModalOpen(false);
            setEmail('');
            setMessage('');

        } catch (error: any) {
            console.error('Share failed:', error);
            alert('Failed to send email. Please try again or copy the link manually.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Mail size={18} />
                        Share Floorplan
                    </h3>
                    <button
                        onClick={() => setShareModalOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                        Sharing <strong>{shareModalData.unitName}</strong> floorplans.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colleague@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Optional Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Check out this unit..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-black text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <span>Sending...</span>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Send Floorplan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
