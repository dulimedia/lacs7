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
  ArrowUp
} from 'lucide-react';
import {
  isTowerUnit, getTowerUnitIndividualFloorplan, getTowerUnitFloorFloorplan,
  isMarylandUnit, getMarylandUnitIndividualFloorplan, getMarylandUnitFloorFloorplan,
  isFifthStreetUnit, getFifthStreetUnitIndividualFloorplan, getFifthStreetUnitFloorFloorplan,
  getFloorplanUrl as getIntelligentFloorplanUrl
} from '../../services/floorplanMappingService';
import { getFloorplanUrl as encodeFloorplanUrl } from '../../services/floorplanService';

// EmailJS type declaration
declare global {
  interface Window {
    emailjs?: {
      init: (publicKey: string) => void;
      send: (serviceId: string, templateId: string, templateParams: any) => Promise<any>;
    };
  }
}

export function SuiteDetailsTab() {
  const { selectedUnitKey, unitsData } = useExploreState();
  const { openFloorplan } = useFloorplan();
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayUnit = selectedUnitKey ? unitsData.get(selectedUnitKey) : null;

  const isTower = displayUnit ? isTowerUnit(displayUnit.unit_name || '') : false;
  const isMaryland = displayUnit ? isMarylandUnit(displayUnit.unit_name || '') : false;
  const isFifthStreet = displayUnit ? isFifthStreetUnit(displayUnit.unit_name || '') : false;

  const individualFloorplan = displayUnit ? (
    isTower ? getTowerUnitIndividualFloorplan(displayUnit.unit_name || '') :
      isMaryland ? getMarylandUnitIndividualFloorplan(displayUnit.unit_name || '') :
        isFifthStreet ? getFifthStreetUnitIndividualFloorplan(displayUnit.unit_name || '') :
          null
  ) : null;

  const hasIndividualFloorplan = (isTower || isMaryland || isFifthStreet) && individualFloorplan;

  const getFloorplanUrl = () => {
    if (!displayUnit || !displayUnit.unit_name) {
      return null;
    }

    // For units with multiple floorplans (Tower, Maryland, Fifth Street)
    if (isTower || isMaryland || isFifthStreet) {
      // DEFAULT: Show individual unit floorplan (Top Slot)
      let individualFloorplan = null;
      if (isTower) {
        individualFloorplan = getTowerUnitIndividualFloorplan(displayUnit.unit_name);
      } else if (isMaryland) {
        individualFloorplan = getMarylandUnitIndividualFloorplan(displayUnit.unit_name);
      } else if (isFifthStreet) {
        individualFloorplan = getFifthStreetUnitIndividualFloorplan(displayUnit.unit_name);
      }

      // If individual exists, use it. Otherwise fallback to floor level.
      if (individualFloorplan) {
        const rawUrl = `floorplans/converted/${individualFloorplan}`;
        return encodeFloorplanUrl(rawUrl);
      } else {
        // Fallback if no individual plan exists
        let floorFloorplan = null;
        if (isTower) {
          floorFloorplan = getTowerUnitFloorFloorplan(displayUnit.unit_name);
        } else if (isMaryland) {
          floorFloorplan = getMarylandUnitFloorFloorplan(displayUnit.unit_name);
        } else if (isFifthStreet) {
          floorFloorplan = getFifthStreetUnitFloorFloorplan(displayUnit.unit_name);
        }
        const rawUrl = floorFloorplan ? `floorplans/converted/${floorFloorplan}` : null;
        return rawUrl ? encodeFloorplanUrl(rawUrl) : null;
      }
    } else {
      // Fallback to intelligent matching for other units
      const rawUrl = getIntelligentFloorplanUrl(displayUnit.unit_name, displayUnit);
      return rawUrl ? encodeFloorplanUrl(rawUrl) : null;
    }
  };

  const getSecondaryFloorplanUrl = () => {
    try {
      if (!displayUnit || !displayUnit.unit_name) {
        return null;
      }

      // For units with multiple floorplans, show the floor-level view as secondary (Bottom Slot)
      if (isTower || isMaryland || isFifthStreet) {
        // Only show secondary if we have an individual plan on top
        if (hasIndividualFloorplan) {
          let floorFloorplan = null;
          if (isTower) {
            floorFloorplan = getTowerUnitFloorFloorplan(displayUnit.unit_name);
          } else if (isMaryland) {
            floorFloorplan = getMarylandUnitFloorFloorplan(displayUnit.unit_name);
          } else if (isFifthStreet) {
            floorFloorplan = getFifthStreetUnitFloorFloorplan(displayUnit.unit_name);
          }

          const rawUrl = floorFloorplan ? `floorplans/converted/${floorFloorplan}` : null;
          return rawUrl ? encodeFloorplanUrl(rawUrl) : null;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting secondary floorplan URL:', error);
      return null;
    }
  };

  const currentFloorplanUrl = getFloorplanUrl();
  const secondaryFloorplanUrl = getSecondaryFloorplanUrl();

  const handleFloorPlanClick = () => {
    if (currentFloorplanUrl && displayUnit) {
      openFloorplan(currentFloorplanUrl, displayUnit.unit_name, displayUnit);
    }
  };

  const handleSecondaryFloorPlanClick = () => {
    if (secondaryFloorplanUrl && displayUnit) {
      const secondaryTitle = hasIndividualFloorplan
        ? `${displayUnit.unit_name} - Floor Layout`
        : `${displayUnit.unit_name} - Unit Layout`;
      openFloorplan(secondaryFloorplanUrl, secondaryTitle, displayUnit);
    }
  };

  const handleShareClick = async () => {
    if (!displayUnit) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?sel=${displayUnit.unit_key}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareUrlCopied(true);
      setTimeout(() => setShareUrlCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  };

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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{displayUnit.unit_name}</h2>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${isAvailable
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
              }`}>
              {isAvailable ? 'Available' : 'Occupied'}
            </div>
          </div>
        </div>

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
            <div className="flex items-center text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
              {displayUnit.private_offices === undefined || displayUnit.private_offices === null
                ? 'Private Offices: N/A'
                : displayUnit.private_offices === 0
                  ? 'Open Floor Plan'
                  : `${displayUnit.private_offices} ${displayUnit.private_offices === 1 ? 'Office' : 'Offices'}`}
            </div>
          </div>
        </div>

        {displayUnit.kitchen_size && displayUnit.kitchen_size.toLowerCase() !== 'none' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium mb-1">Kitchen</div>
            <div className="text-sm text-gray-700">{displayUnit.kitchen_size}</div>
          </div>
        )}

        {displayUnit.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 font-medium mb-1">Notes</div>
            <div className="text-sm text-gray-700">{displayUnit.notes}</div>
          </div>
        )}

        {currentFloorplanUrl && (
          <div className="space-y-4">
            <div className="relative group cursor-pointer" onClick={handleFloorPlanClick}>
              <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50">
                <img
                  src={currentFloorplanUrl}
                  alt={`${displayUnit.unit_name} Floor Plan Preview`}
                  className="w-full h-48 object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                    <Maximize2 size={24} className="text-gray-700" />
                  </div>
                </div>
              </div>
              <div className="text-xs text-center text-gray-500 mt-2">
                {hasIndividualFloorplan ? 'Individual Unit Layout' : 'Floor Plan'} - Click to expand
              </div>
            </div>

            {secondaryFloorplanUrl && (
              <div className="relative group cursor-pointer" onClick={handleSecondaryFloorPlanClick}>
                <div className="relative rounded-lg overflow-hidden border border-black/10 bg-gray-50">
                  <img
                    src={secondaryFloorplanUrl}
                    alt={`${displayUnit.unit_name} Secondary Floor Plan Preview`}
                    className="w-full h-40 object-contain"
                    onError={(e) => {
                      console.warn('❌ Secondary floorplan image failed to load:', secondaryFloorplanUrl);
                      const container = e.currentTarget.parentElement?.parentElement;
                      if (container) {
                        container.style.display = 'none';
                        console.log('🚫 Hidden secondary floorplan container due to load error');
                      }
                    }}
                    onLoad={() => {
                      console.log('✅ Secondary floorplan loaded successfully:', secondaryFloorplanUrl);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg">
                      <Maximize2 size={20} className="text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-gray-500 mt-2">
                  Full Floor Layout - Click to expand
                </div>
              </div>
            )}
          </div>
        )}



        {displayUnit.recipients && displayUnit.recipients.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => {
                // Open the global request form
                const { setSingleUnitRequestOpen } = useExploreState.getState();
                setSingleUnitRequestOpen(true, {
                  unitKey: displayUnit.unit_key,
                  unitName: displayUnit.unit_name
                });
              }}
              className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
            >
              Lease this space
            </button>
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition z-50"
          title="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
