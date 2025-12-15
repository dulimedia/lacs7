import { useState, useRef, useEffect } from 'react';
import { useExploreState } from '../../store/exploreState';
import { useFloorplan } from '../../contexts/FloorplanContext';
// @ts-ignore
import {
  MapPin,
  Square,
  FileText,
  Share,
  CheckCircle,
  Maximize2,
  ArrowUp,
  Download
} from 'lucide-react';
import {
  isTowerUnit, getTowerUnitIndividualFloorplan, getTowerUnitFloorFloorplan,
  isMarylandUnit, getMarylandUnitIndividualFloorplan, getMarylandUnitFloorFloorplan,
  isFifthStreetUnit, getFifthStreetUnitIndividualFloorplan, getFifthStreetUnitFloorFloorplan,
  getFloorplanUrl as getIntelligentFloorplanUrl
} from '../../services/floorplanMappingService';
import { getFloorplanUrl as encodeFloorplanUrl } from '../../services/floorplanService';
import { CameraControls } from './CameraFooter';
import { PerfFlags } from '../../perf/PerfFlags';

// EmailJS type declaration
declare global {
  interface Window {
    emailjs?: {
      init: (publicKey: string) => void;
      send: (serviceId: string, templateId: string, templateParams: any) => Promise<any>;
    };
  }
}

// Helper component to render PDF or Image floorplan
function FloorplanPreview({ url, title, label, onShare }: { url: string, title: string, label: string, onShare: () => void }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const isPdf = url.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    let active = true;
    setIsValid(null);

    // Head request to verify content type and existence (prevents loading index.html/app recursively on 404)
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (!active) return;
        const type = res.headers.get('content-type');
        if (res.ok && type && (type.includes('pdf') || type.includes('image'))) {
          setIsValid(true);
        } else {
          console.warn(`Floorplan load failed or invalid type for ${url}: ${type}`);
          setIsValid(false);
        }
      })
      .catch(() => {
        if (active) setIsValid(false);
      });

    return () => { active = false; };
  }, [url]);

  const handleOpen = () => {
    window.open(url, '_blank');
  };

  if (isValid === false) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50 aspect-[4/3] flex flex-col items-center justify-center text-gray-400 p-4 text-center">
          <FileText size={32} className="mb-2 opacity-50" />
          <span className="text-xs">Preview unavailable</span>
        </div>
      </div>
    );
  }

  if (isValid === null) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50 aspect-[4/3] flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50 aspect-[4/3] group-hover:shadow-md transition-all">
          <object data={`${url}#view=Fit&toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf" className="w-full h-full cursor-pointer pointer-events-none">
            {/* Fallback */}
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
              <FileText size={48} />
              <p className="text-xs font-medium mt-2">Preview Unavailable</p>
            </div>
          </object>

          <a
            href={`${url}#view=Fit`}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10"
          >
            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm flex items-center gap-2">
              <Maximize2 size={12} />
              Open Full PDF
            </div>
          </a>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url}
            download
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors text-gray-700 decoration-0"
          >
            <Download size={14} />
            Download PDF
          </a>
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors text-gray-700"
          >
            <Share size={14} />
            Share
          </button>
        </div>
      </div>
    );
  }

  // Standard Image Rendering
  return (
    <div className="space-y-2">
      <div
        className="relative group cursor-pointer"
        onClick={handleOpen}
      >
        <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50 aspect-video group-hover:shadow-md transition-all">
          <img
            src={url}
            alt={title}
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 size={12} />
              Open in New Tab
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={url}
          download={`${title.replace(/\s+/g, '_')}_Plan.png`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors text-gray-700 decoration-0"
        >
          <Download size={14} />
          Download
        </a>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors text-gray-700"
        >
          <Share size={14} />
          Share
        </button>
      </div>
    </div>
  );
}


export function SuiteDetailsTab() {
  const { selectedUnitKey, unitsData, setShareModalOpen } = useExploreState();
  const { openFloorplan } = useFloorplan();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayUnit = selectedUnitKey ? unitsData.get(selectedUnitKey) : null;

  // --- Floorplan Resolution Logic ---
  // --- Floorplan Resolution Logic ---
  // Prioritize Intelligent PDF Mapping Service over outdated CVS/CSV data
  const getPrimaryFloorplan = () => {
    if (!displayUnit) return null;

    // 1. Try to get a high-quality PDF from our mapping service
    const intelligentUrl = getIntelligentFloorplanUrl(displayUnit.unit_name, displayUnit);
    if (intelligentUrl && intelligentUrl.endsWith('.pdf')) {
      return encodeFloorplanUrl(intelligentUrl);
    }

    // 2. Fallback to CSV data if provided (likely PNGs)
    if (displayUnit.floorplan_url) return encodeFloorplanUrl(displayUnit.floorplan_url);

    // 3. Last resort fallback (returns what we found in step 1 even if not PDF, or null)
    return intelligentUrl ? encodeFloorplanUrl(intelligentUrl) : null;
  };

  const getSecondaryFloorplan = () => {
    if (!displayUnit) return null;

    // Try to get explicit floor-level plan from mapping service
    let floorPlan: string | null = null;

    if (isTowerUnit(displayUnit.unit_name)) floorPlan = getTowerUnitFloorFloorplan(displayUnit.unit_name);
    else if (isMarylandUnit(displayUnit.unit_name)) floorPlan = getMarylandUnitFloorFloorplan(displayUnit.unit_name);
    else if (isFifthStreetUnit(displayUnit.unit_name)) floorPlan = getFifthStreetUnitFloorFloorplan(displayUnit.unit_name);

    if (floorPlan) return encodeFloorplanUrl(floorPlan);

    // Fallback to CSV
    if (displayUnit.full_floor_floorplan_url) return encodeFloorplanUrl(displayUnit.full_floor_floorplan_url);

    return null;
  };

  const primaryFloorplanUrl = getPrimaryFloorplan();
  let secondaryFloorplanUrl = getSecondaryFloorplan();

  // Deduplicate: If secondary matches primary, don't show it twice.
  // This happens for Ground Floor units where we force the generic map as primary.
  if (primaryFloorplanUrl && secondaryFloorplanUrl && primaryFloorplanUrl === secondaryFloorplanUrl) {
    secondaryFloorplanUrl = null;
  }

  // Matterport URL mapping for specific units
  const getMatterportUrl = (unitName: string): string | null => {
    const mappings: { [key: string]: string } = {
      'T-1200': 'https://my.matterport.com/show/?m=ZsNhx82axda',
      'T-300': 'https://my.matterport.com/show/?m=k8A8Lhb3dAY',
      'T-200': 'https://my.matterport.com/show/?m=71W3fTvAmFU',
      'T-310': 'https://my.matterport.com/show/?m=5vkydpxwnE5',
      'T-550': 'https://my.matterport.com/show/?m=VdQhoZ2MqBL',
      'M-150': 'https://my.matterport.com/show/?m=KQHM8B5bqAc',
      'M-340': 'https://my.matterport.com/show/?m=Cv6hmDmgNHV',
      'M-345': 'https://my.matterport.com/show/?m=r86nwbqsKJ6',
      'M-240': 'https://my.matterport.com/show/?m=QLuCzvmoJ2V',
      'F-280': 'https://my.matterport.com/show/?m=3vDW6DRofBF',
      'F-240': 'https://my.matterport.com/show/?m=vQziShGJYmn',
      'F-250': 'https://my.matterport.com/show/?m=EqsrBxBQrLE',
      'F-360': 'https://my.matterport.com/show/?m=HAhMMXMwxry',
      'F-380': 'https://my.matterport.com/show/?m=NWmSEQ1ozGf',
      'F-175': 'https://my.matterport.com/show/?m=YjynxrdQ36k',
      'F-365': 'https://my.matterport.com/show/?m=XThnDcJSZf5'
    };
    
    return mappings[unitName.toUpperCase()] || null;
  };

  const tourUrl = displayUnit?.tour_3d_url || getMatterportUrl(displayUnit?.unit_name || '');

  // Helper to open floorplan in a custom new tab with Download button
  const openFloorplanInNewTab = (url: string, title: string) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title} - Floorplan</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                margin: 0; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                background: #f8fafc; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                color: #1e293b;
              }
              .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2rem;
                padding: 2rem;
                max-width: 100%;
              }
              .image-wrapper {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              h1 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 600;
              }
              .btn { 
                text-decoration: none; 
                background: #0f172a; 
                color: white; 
                padding: 0.75rem 1.5rem; 
                border-radius: 0.5rem; 
                font-weight: 500; 
                transition: all 0.2s; 
                display: inline-flex; 
                align-items: center; 
                gap: 0.75rem; 
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              }
              .btn:hover { 
                background: #334155; 
                transform: translateY(-1px);
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
              }
              svg { width: 20px; height: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${title}</h1>
              <div class="image-wrapper">
                <img src="${url}" alt="${title}" />
              </div>
              <a href="${url}" download="${title.replace(/\s+/g, '_')}_Floorplan.png" class="btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Floorplan
              </a>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleShareClick = () => {
    if (!displayUnit) return;
    setShareModalOpen(true, {
      unitKey: displayUnit.unit_key,
      unitName: displayUnit.unit_name,
      floorplanUrl: primaryFloorplanUrl || undefined,
      fullFloorUrl: secondaryFloorplanUrl || undefined
    });
  };

  const handleTourClick = () => {
    if (tourUrl) {
      window.open(tourUrl, '_blank');
    }
  };

  // --- Scroll Logic ---
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setShowScrollTop(scrollContainerRef.current.scrollTop > 200);
      }
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isAvailable = displayUnit?.status === true;

  if (!displayUnit) return null;

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto relative">
      <div className="p-4 space-y-4 pb-24">

        {/* Camera Controls now in overlay for all devices */}

        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{displayUnit.unit_name}</h2>
            <div className="flex gap-2 mt-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isAvailable
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
                }`}>
                {isAvailable ? 'Available' : 'Occupied'}
              </div>

              {/* Production Office Badge */}
              {displayUnit.is_production_office && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  Production Office
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleShareClick}
            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
            title="Share Floorplan"
          >
            <Share size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {displayUnit.area_sqft && (
            <div className="flex items-start space-x-2">
              <Square size={16} className="text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Area</div>
                <div className="text-sm font-medium">{displayUnit.area_sqft.toLocaleString()} sq ft</div>
              </div>
            </div>
          )}

          {displayUnit.price_per_sqft && (
            <div className="flex items-start space-x-2">
              <FileText size={16} className="text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Price/sq ft</div>
                <div className="text-sm font-medium">${displayUnit.price_per_sqft}</div>
              </div>
            </div>
          )}

          {displayUnit.building && (
            <div className="flex items-start space-x-2">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Building</div>
                <div className="text-sm font-medium">{displayUnit.building}</div>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between space-x-2">
            <div className="flex items-start space-x-2">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Floor</div>
                <div className="text-sm font-medium">{displayUnit.floor || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Office / Kitchen Badges */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center text-[11px] font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
            {displayUnit.private_offices && displayUnit.private_offices > 0
              ? `${displayUnit.private_offices} Private Office${displayUnit.private_offices > 1 ? 's' : ''}`
              : 'Open Floor Plan'}
          </div>

          {(displayUnit.has_kitchen || (displayUnit.kitchen_size && displayUnit.kitchen_size !== 'None')) && (
            <div className="flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full whitespace-nowrap">
              Kitchen Available
            </div>
          )}
        </div>

        {/* Notes */}
        {displayUnit.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 font-medium mb-1">Notes</div>
            <div className="text-sm text-gray-700">{displayUnit.notes}</div>
          </div>
        )}

        {/* --- Media Buttons & Previews --- */}
        <div className="space-y-4 pt-2">

          {/* 3D Tour Button - positioned above floorplans */}
          {tourUrl && (
            <button
              onClick={handleTourClick}
              className="w-full flex items-center justify-center gap-2 p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-sm"
            >
              <Maximize2 size={16} />
              <span>3D Tour</span>
            </button>
          )}

          {/* Floorplans */}
          {/* Floorplans */}
          {/* Floorplans */}
          {(primaryFloorplanUrl || secondaryFloorplanUrl) && (
            <div className="space-y-6">
              {/* Primary Plan */}
              {primaryFloorplanUrl && (
                <div className="space-y-2">
                  <FloorplanPreview
                    url={primaryFloorplanUrl}
                    title={displayUnit.unit_name}
                    label="Suite Plan"
                    onShare={handleShareClick}
                  />
                </div>
              )}

              {/* Secondary Plan */}
              {secondaryFloorplanUrl && (
                <div className="space-y-2">
                  <FloorplanPreview
                    url={secondaryFloorplanUrl}
                    title={`${displayUnit.unit_name} Full Floor`}
                    label="Full Floor Plan"
                    onShare={handleShareClick}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lease Button */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              if (!displayUnit) {
                console.warn('Cannot lease: no unit selected');
                return;
              }
              const { setSingleUnitRequestOpen } = useExploreState.getState();
              setSingleUnitRequestOpen(true, {
                unitKey: displayUnit.unit_key,
                unitName: displayUnit.unit_name
              });
            }}
            className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium shadow-lg shadow-gray-200"
          >
            Lease this space
          </button>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition z-50"
          title="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
